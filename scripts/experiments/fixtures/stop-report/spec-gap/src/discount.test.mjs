import assert from "node:assert/strict";
import test from "node:test";
import { discount } from "./discount.mjs";

test("1000 円未満は値引きなし", () => assert.equal(discount(999), 999));
test("1000 円は 10% 引き", () => assert.equal(discount(1000), 900));
test("端数が出ても整数を返す", () => assert.ok(Number.isInteger(discount(1005))));
