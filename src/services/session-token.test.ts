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

describe("形", () => {
  it("base64url(JSON).base64url(HMAC) で、= を含まない", async () => {
    const payload = Buffer.from(JSON.stringify(MEMBER)).toString("base64url");
    const signature = createHmac("sha256", KEY).update(payload).digest("base64url");
    expect(await issueSessionToken(MEMBER, hmac)).toBe(`${payload}.${signature}`);
  });

  it("JSON に入るのは device・role・exp だけ", async () => {
    const extra = { ...MEMBER, lat: 41.8 } as SessionClaims;
    const [payload] = (await issueSessionToken(extra, hmac)).split(".");
    expect(Object.keys(JSON.parse(Buffer.from(payload, "base64url").toString()))).toEqual([
      "device",
      "role",
      "exp",
    ]);
  });
});

/** base64url の1文字を別の文字に変える */
function flip(s: string, index: number): string {
  const c = s[index] === "A" ? "B" : "A";
  return s.slice(0, index) + c + s.slice(index + 1);
}

describe("改ざん", () => {
  it("署名の1文字目を変えると null", async () => {
    const [payload, signature] = (await issueSessionToken(MEMBER, hmac)).split(".");
    expect(await verifySessionToken(`${payload}.${flip(signature, 0)}`, hmac, NOW)).toBeNull();
  });

  it("中身の1文字目を変えると null", async () => {
    const [payload, signature] = (await issueSessionToken(MEMBER, hmac)).split(".");
    expect(await verifySessionToken(`${flip(payload, 0)}.${signature}`, hmac, NOW)).toBeNull();
  });

  it("署名の末尾の余りのビットだけ変えても null（文字列として比べる）", async () => {
    const [payload, signature] = (await issueSessionToken(MEMBER, hmac)).split(".");
    const last = signature.length - 1;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    // 32 バイトの base64url は 43 文字で、最後の文字の下位 2 ビットは使われない
    const sibling = alphabet[alphabet.indexOf(signature[last]) ^ 1];
    const forged = `${payload}.${signature.slice(0, last)}${sibling}`;
    expect(await verifySessionToken(forged, hmac, NOW)).toBeNull();
  });

  it("署名を短くすると null", async () => {
    const token = await issueSessionToken(MEMBER, hmac);
    expect(await verifySessionToken(token.slice(0, -1), hmac, NOW)).toBeNull();
  });
});

describe("役割の書き換え", () => {
  it("member を admin に書き換えて元の署名のままなら null", async () => {
    const [, signature] = (await issueSessionToken(MEMBER, hmac)).split(".");
    const forged = Buffer.from(JSON.stringify({ ...MEMBER, role: "admin" })).toString("base64url");
    expect(await verifySessionToken(`${forged}.${signature}`, hmac, NOW)).toBeNull();
  });
});

describe("別の鍵", () => {
  it("別の鍵で作った Cookie は null", async () => {
    const token = await issueSessionToken(MEMBER, hmacWith(OTHER_KEY));
    expect(await verifySessionToken(token, hmac, NOW)).toBeNull();
  });
});

describe("期限", () => {
  it("期限の 1 秒前は通る", async () => {
    const token = await issueSessionToken(MEMBER, hmac);
    expect(await verifySessionToken(token, hmac, MEMBER.exp - 1)).toEqual(MEMBER);
  });

  it.each([
    ["ちょうど", 0],
    ["後", 1],
  ])("期限%sは null", async (_name, after) => {
    const token = await issueSessionToken(MEMBER, hmac);
    expect(await verifySessionToken(token, hmac, MEMBER.exp + after)).toBeNull();
  });
});
