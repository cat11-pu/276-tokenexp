import assert from "node:assert";
import { isExpired, dropToken } from "../tokenbag.js";
import { step, close } from "../expiryrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { live: {}, revoked: [], expired: [], ledger: [], applied: [] },
  events: [],
  unknown_error_code: "E_UNKNOWN_TOKEN", duplicate_error_code: "E_DUPLICATE_TOKEN",
  event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("isExpired returns a flag", () => {
  assert.strictEqual(typeof isExpired([9, 1], 5), "boolean");
});

check("dropToken returns a table", () => {
  assert.strictEqual(typeof dropToken({}, "t"), "object");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
