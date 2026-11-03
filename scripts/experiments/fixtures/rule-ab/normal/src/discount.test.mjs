import assert from "node:assert/strict";
import test from "node:test";
import { discount } from "./discount.mjs";

test("1000 円未満は値引きなし", () => assert.equal(discount(999), 999));
test("1000 円は 10% 引き", () => assert.equal(discount(1000), 900));
test("2000 円は 10% 引き", () => assert.equal(discount(2000), 1800));
test("1 円未満は切り捨て", () => assert.equal(discount(1005), 904));
