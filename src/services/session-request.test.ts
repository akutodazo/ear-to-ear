import { describe, expect, it } from "vitest";
import {
  clientIp,
  isJsonContentType,
  parseSessionBody,
  SESSION_BODY_MAX_CHARS,
  UNKNOWN_IP,
} from "./session-request";

describe("isJsonContentType", () => {
  it.each([
    "application/json",
    "application/json; charset=utf-8",
    "Application/JSON",
    "application/json;charset=UTF-8",
    " application/json ",
  ])("%s は JSON", (header) => {
    expect(isJsonContentType(header)).toBe(true);
  });

  it.each([
    ["無い", null],
    ["空", ""],
    ["text/plain", "text/plain"],
    ["似た名前", "application/jsonx"],
    ["前に余分", "xapplication/json"],
    ["フォーム", "application/x-www-form-urlencoded"],
    ["multipart", "multipart/form-data; boundary=x"],
    ["+json", "application/ld+json"],
  ])("%s は JSON でない", (_name, header) => {
    expect(isJsonContentType(header)).toBe(false);
  });
});

describe("parseSessionBody", () => {
  it("{ passphrase } を取り出す", () => {
    expect(parseSessionBody('{"passphrase":"abc"}')).toStrictEqual({ ok: true, passphrase: "abc" });
  });

  it("空文字も通す（照合で 401 にする）", () => {
    expect(parseSessionBody('{"passphrase":""}')).toStrictEqual({ ok: true, passphrase: "" });
  });

  it("前後の空白を削らない", () => {
    expect(parseSessionBody('{"passphrase":" abc "}')).toStrictEqual({ ok: true, passphrase: " abc " });
  });

  it("上限ちょうどは通り、1 文字超えると too_long（JSON として読む前に）", () => {
    const fit = `{"passphrase":"${"a".repeat(SESSION_BODY_MAX_CHARS - 17)}"}`;
    expect(fit.length).toBe(SESSION_BODY_MAX_CHARS);
    expect(parseSessionBody(fit).ok).toBe(true);
    expect(parseSessionBody(`${fit} `)).toStrictEqual({ ok: false, reason: "too_long" });
    // 壊れた JSON でも長ければ too_long
    expect(parseSessionBody("{".repeat(SESSION_BODY_MAX_CHARS + 1))).toStrictEqual({ ok: false, reason: "too_long" });
  });

  it.each([
    ["空", ""],
    ["壊れた", '{"passphrase":'],
    ["引用符なし", "{passphrase:1}"],
  ])("%s の本文は not_json", (_name, text) => {
    expect(parseSessionBody(text)).toStrictEqual({ ok: false, reason: "not_json" });
  });

  it.each([
    ["配列", '["abc"]'],
    ["null", "null"],
    ["文字列", '"abc"'],
    ["数", "1"],
  ])("%s は not_object", (_name, text) => {
    expect(parseSessionBody(text)).toStrictEqual({ ok: false, reason: "not_object" });
  });

  it("他のキーがあれば unknown_key（passphrase があっても）", () => {
    expect(parseSessionBody('{"passphrase":"abc","role":"admin"}')).toStrictEqual({
      ok: false,
      reason: "unknown_key",
    });
    expect(parseSessionBody('{"x":1}')).toStrictEqual({ ok: false, reason: "unknown_key" });
  });

  it("空のオブジェクトは missing_passphrase", () => {
    expect(parseSessionBody("{}")).toStrictEqual({ ok: false, reason: "missing_passphrase" });
  });

  it.each([
    ["数", '{"passphrase":1}'],
    ["null", '{"passphrase":null}'],
    ["配列", '{"passphrase":["abc"]}'],
    ["オブジェクト", '{"passphrase":{"a":1}}'],
    ["真偽", '{"passphrase":true}'],
  ])("passphrase が %s なら bad_passphrase", (_name, text) => {
    expect(parseSessionBody(text)).toStrictEqual({ ok: false, reason: "bad_passphrase" });
  });

  it("__proto__ のキーも他のキーとして拒む", () => {
    expect(parseSessionBody('{"passphrase":"abc","__proto__":{"x":1}}')).toStrictEqual({
      ok: false,
      reason: "unknown_key",
    });
  });
});

describe("clientIp", () => {
  it.each(["203.0.113.7", "2001:db8::1"])("%s はそのまま", (ip) => {
    expect(clientIp(ip)).toBe(ip);
  });

  it.each([
    ["無い", null],
    ["空", ""],
  ])("%s なら unknown", (_name, header) => {
    expect(clientIp(header)).toBe(UNKNOWN_IP);
    expect(UNKNOWN_IP).toBe("unknown");
  });
});
