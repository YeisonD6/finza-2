import { mock, test } from "node:test";
import assert from "node:assert/strict";
import {
  ApiError,
  AuthClient,
  REQUEST_TIMEOUT_MS,
} from "../src/features/auth/client";

const pair = (suffix = "1") => ({
  access_token: "access" + suffix,
  refresh_token: "refresh" + suffix,
  expires_in: 900,
  token_type: "bearer",
});
const profile = { id: "a", email: "a@example.com", base_currency: "COP" };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
function fixture(
  handler: (path: string, init?: RequestInit) => Promise<Response>,
) {
  let stored: string | null = null;
  const vault = {
    get: async () => stored,
    set: async (value: string) => {
      stored = value;
    },
    remove: async () => {
      stored = null;
    },
  };
  const client = new AuthClient("", vault, handler as typeof fetch);
  return { client, vault, stored: () => stored };
}

test("login stores only refresh; restore rotates and logout clears storage", async () => {
  const f = fixture(async (path) =>
    path.endsWith("/me")
      ? json(profile)
      : path.endsWith("/logout")
        ? new Response(null, { status: 204 })
        : json(pair()),
  );
  assert.deepEqual(await f.client.login(profile.email, "password"), profile);
  assert.equal(f.stored(), "refresh1");
  const restored = new AuthClient("", f.vault, (async (path: string) =>
    path.endsWith("/me") ? json(profile) : json(pair("2"))) as typeof fetch);
  let email = "";
  restored.onChange = (p) => {
    email = p?.email ?? "";
  };
  await restored.restore();
  assert.equal(email, profile.email);
  assert.equal(f.stored(), "refresh2");
  await f.client.logout();
  assert.equal(f.stored(), null);
});

test("two simultaneous 401 responses share one refresh and retry with new access", async () => {
  let refreshes = 0;
  const f = fixture(async (path, init) => {
    if (path.endsWith("/login")) return json(pair());
    if (path.endsWith("/refresh")) {
      refreshes++;
      await new Promise((r) => setTimeout(r, 10));
      return json(pair("2"));
    }
    if (
      path === "/private" &&
      (init?.headers as Record<string, string>).Authorization ===
        "Bearer access1"
    )
      return json({}, 401);
    return json(profile);
  });
  await f.client.login("a@example.com", "password");
  assert.deepEqual(
    await Promise.all([
      f.client.request("/private"),
      f.client.request("/private"),
    ]),
    [profile, profile],
  );
  assert.equal(refreshes, 1);
  assert.equal(f.stored(), "refresh2");
});

test("late response from A is rejected after logout and login B", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const f = fixture(async (path) => {
    if (path === "/slow") {
      await gate;
      return json(profile);
    }
    if (path.endsWith("/login")) return json(pair());
    if (path.endsWith("/logout")) return new Response(null, { status: 204 });
    return json(profile);
  });
  await f.client.login("a@example.com", "password");
  const slow = assert.rejects(f.client.request("/slow"), /sesión cambió/);
  await f.client.logout();
  await f.client.login("b@example.com", "password");
  release();
  await slow;
});

test("logout during refresh prevents restoring credentials and revokes returned token", async () => {
  let release!: () => void, began!: () => void;
  const gate = new Promise<void>((r) => {
      release = r;
    }),
    start = new Promise<void>((r) => {
      began = r;
    });
  const revoked: string[] = [];
  const f = fixture(async (path, init) => {
    if (path.endsWith("/login")) return json(pair());
    if (path.endsWith("/refresh")) {
      began();
      await gate;
      return json(pair("2"));
    }
    if (path === "/private") return json({}, 401);
    if (path.endsWith("/logout")) {
      revoked.push(JSON.parse(init?.body as string).refresh_token);
      return new Response(null, { status: 204 });
    }
    return json(profile);
  });
  await f.client.login("a@example.com", "password");
  const request = assert.rejects(f.client.request("/private"), /sesión cambió/);
  await start;
  await f.client.logout();
  release();
  await request;
  assert.equal(f.stored(), null);
  assert.ok(revoked.includes("refresh2"));
});

test("offline login reports network error without persisting credentials", async () => {
  const f = fixture(async () => {
    throw new Error("network");
  });
  await assert.rejects(f.client.login("a@example.com", "password"), /conectar/);
  assert.equal(f.stored(), null);
});

test("storage failure revokes newly issued credentials", async () => {
  let revoked = false;
  const client = new AuthClient(
    "",
    {
      get: async () => null,
      set: async () => {
        throw new Error("vault");
      },
      remove: async () => {},
    },
    (async (path: string) => {
      if (path.endsWith("/logout")) {
        revoked = true;
        return new Response(null, { status: 204 });
      }
      return json(pair());
    }) as typeof fetch,
  );
  await assert.rejects(client.login("a@example.com", "password"), /vault/);
  assert.equal(revoked, true);
});

test("invalid refresh clears persisted session", async () => {
  const f = fixture(async (path) =>
    path.endsWith("/login")
      ? json(pair())
      : path.endsWith("/me")
        ? json(profile)
        : json({}, 401),
  );
  await f.client.login("a@example.com", "password");
  await assert.rejects(f.client.request("/private"), /expiró/);
  assert.equal(f.stored(), null);
});

test("logout still revokes remotely when secure storage deletion fails", async () => {
  let saved: string | null = null,
    fail = false,
    revoked = false;
  const vault = {
    get: async () => saved,
    set: async (v: string) => {
      saved = v;
    },
    remove: async () => {
      if (fail) throw new Error("vault deletion");
      saved = null;
    },
  };
  const client = new AuthClient("", vault, (async (path: string) => {
    if (path.endsWith("/logout")) {
      revoked = true;
      return new Response(null, { status: 204 });
    }
    return path.endsWith("/me") ? json(profile) : json(pair());
  }) as typeof fetch);
  await client.login("a@example.com", "password");
  fail = true;
  await assert.rejects(client.logout(), /vault deletion/);
  assert.equal(revoked, true);
});

test("a server that never answers fails with a readable timeout", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const client = new AuthClient(
      "",
      {
        get: async () => null,
        set: async () => {},
        remove: async () => {},
      },
      ((_path: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        })) as typeof fetch,
    );
    const pending = client.login("a@example.com", "una contraseña larga");
    // Let login reach fetch (and schedule its timer) before moving the clock.
    for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
    mock.timers.tick(REQUEST_TIMEOUT_MS);
    await assert.rejects(pending, (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 0);
      assert.match(error.message, /no respondió a tiempo/);
      return true;
    });
  } finally {
    mock.timers.reset();
  }
});
