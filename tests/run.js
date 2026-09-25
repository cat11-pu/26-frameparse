import assert from "node:assert";
import { parse } from "../frame.js";
import { reassemble } from "../reasm.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("parse returns frames", () => {
  assert.ok(Array.isArray(parse("aa**bb", "**", 4).frames));
});

check("parse reports resyncs", () => {
  assert.strictEqual(typeof parse("aa**bb", "**", 4).resyncs, "number");
});

check("reassemble returns delivered list", () => {
  assert.ok(Array.isArray(reassemble([], 2).delivered));
});

check("reassemble reports dropped", () => {
  assert.ok(Array.isArray(reassemble([], 2).dropped));
});

check("render exposes leftover", () => {
  assert.strictEqual(typeof render({ bytes: "aa**bb", header: "**", frame_size: 4, fragments: [], timeout_ticks: 2 }).leftover, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
