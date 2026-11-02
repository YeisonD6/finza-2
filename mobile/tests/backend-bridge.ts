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
  await a.logout();
  console.log(
    "BRIDGE_OK registration/login/me/restore/rotation/logout/account-switch",
  );
}
main().catch(() => {
  console.error("BRIDGE_FAILED");
  process.exitCode = 1;
});
