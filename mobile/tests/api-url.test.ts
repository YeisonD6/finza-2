import { test } from "node:test";
import assert from "node:assert/strict";
import { EMULATOR_API_URL, resolveApiUrl } from "../src/features/auth/apiUrl";

test("an explicit API URL always wins", () => {
  assert.equal(
    resolveApiUrl({
      envUrl: "https://api.finza.app/",
      hostUri: "10.0.0.5:8081",
      dev: true,
    }),
    "https://api.finza.app",
  );
});

test("without a URL, Expo Go reaches the API on the Metro computer", () => {
  assert.equal(
    resolveApiUrl({ hostUri: "10.228.97.205:8082", dev: true }),
    "http://10.228.97.205:8000",
  );
  assert.equal(
    resolveApiUrl({
      envUrl: "auto",
      envPort: "8010",
      hostUri: "172.20.10.7:8081",
      dev: true,
    }),
    "http://172.20.10.7:8010",
  );
});

test("release builds and missing hosts keep the emulator fallback", () => {
  assert.equal(
    resolveApiUrl({ hostUri: "10.0.0.5:8081", dev: false }),
    EMULATOR_API_URL,
  );
  assert.equal(resolveApiUrl({ hostUri: null, dev: true }), EMULATOR_API_URL);
});
