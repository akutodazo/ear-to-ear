import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  issueSessionToken,
  verifySessionToken,
  type Hmac,
  type SessionClaims,
} from "./session-token";

// 鍵は文字列にせず固定のバイト列で作る（合言葉らしい文字列をリポジトリに入れない）
const KEY = Buffer.alloc(32, 0x01);
const OTHER_KEY = Buffer.alloc(32, 0x02);

function hmacWith(key: Buffer): Hmac {
  return async (data) => new Uint8Array(createHmac("sha256", key).update(data).digest());
}
const hmac = hmacWith(KEY);

const NOW = 1_793_000_000;
const MEMBER: SessionClaims = { device: "dev-0001", role: "member", exp: NOW + 60 };
const ADMIN: SessionClaims = { device: "dev-0002", role: "admin", exp: NOW + 60 };

describe("作って確かめる", () => {
  it.each([
    ["member", MEMBER],
    ["admin", ADMIN],
  ])("%s の中身がそのまま返る", async (_name, claims) => {
    const token = await issueSessionToken(claims, hmac);
    expect(await verifySessionToken(token, hmac, NOW)).toEqual(claims);
  });
});
