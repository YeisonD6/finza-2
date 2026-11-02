/** Run against the disposable API started by pytest, not a production URL. */
import assert from "node:assert/strict";
import { AuthClient, type Profile } from "../src/features/auth/client";

async function main() {
  const url = process.env.FINZA_BRIDGE_URL!;
  let stored: string | null = null;
  const vault = {
    get: async () => stored,
    set: async (v: string) => {
      stored = v;
    },
    remove: async () => {
      stored = null;
    },
  };
  const a = new AuthClient(url, vault);
  const password = "correct horse battery";
  await a.register("bridge-a@example.com", password);
  await a.register("bridge-b@example.com", password);
  await a.login("bridge-a@example.com", password);
  assert.equal(
    (await a.request<Profile>("/api/v1/me")).email,
    "bridge-a@example.com",
  );
  const first = stored;
  const restarted = new AuthClient(url, vault);
  await restarted.restore();
  assert.notEqual(stored, first);
  await restarted.logout();
  assert.equal(stored, null);
  await assert.rejects(a.request("/api/v1/me"));
  await a.login("bridge-b@example.com", password);
  assert.equal(
    (await a.request<Profile>("/api/v1/me")).email,
    "bridge-b@example.com",
  );
  const categories =
    await a.request<{ id: string; movement_type: string }[]>(
      "/api/v1/categories",
    );
  const category = categories.find((c) => c.movement_type === "expense")!.id;
  const input = {
    type: "expense",
    amount: "1234.50",
    currency: "COP",
    occurred_on: "2024-02-29",
    category_id: category,
    note: "bridge",
    client_request_id: crypto.randomUUID(),
  };
  const created = await a.request<{ id: string; amount: string }>(
    "/api/v1/movements",
    { method: "POST", body: JSON.stringify(input) },
  );
  assert.equal(created.amount, "1234.50");
  const repeated = await a.request<{ id: string }>("/api/v1/movements", {
    method: "POST",
    body: JSON.stringify(input),
  });
  assert.equal(repeated.id, created.id);
  await a.request(`/api/v1/movements/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({ occurred_on: "2024-03-01", amount: "250.00" }),
  });
  assert.equal(
    (await a.request<{ items: unknown[] }>("/api/v1/movements?month=2024-02"))
      .items.length,
    0,
  );
  assert.equal(
    (
      await a.request<{ items: { amount: string }[] }>(
        "/api/v1/movements?month=2024-03",
      )
    ).items[0].amount,
    "250.00",
  );
  await a.request(`/api/v1/movements/${created.id}`, { method: "DELETE" });
  assert.equal(
    (await a.request<{ items: unknown[] }>("/api/v1/movements?month=2024-03"))
      .items.length,
    0,
  );
  await a.request("/api/v1/movements", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      occurred_on: "2024-04-01",
      note: "persist-after-restart",
      client_request_id: crypto.randomUUID(),
    }),
  });
  await a.logout();
  console.log(
    "BRIDGE_OK registration/login/me/restore/rotation/logout/account-switch",
  );
}
main().catch(() => {
  console.error("BRIDGE_FAILED");
  process.exitCode = 1;
});
