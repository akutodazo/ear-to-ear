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

/** 中身を好きな JSON にして、正しい鍵で署名する（署名が正しくても中身で弾けるか） */
async function signed(body: unknown): Promise<string> {
  const payload = Buffer.from(typeof body === "string" ? body : JSON.stringify(body)).toString(
    "base64url",
  );
  const signature = Buffer.from(await hmac(payload)).toString("base64url");
  return `${payload}.${signature}`;
}

describe("形の崩れ", () => {
  it.each([
    ["空", ""],
    ["点なし", "abc"],
    ["3 つに分かれる", "a.b.c"],
  ])("%s は null", async (_name, token) => {
    expect(await verifySessionToken(token, hmac, NOW)).toBeNull();
  });

  it.each([
    ["JSON でない", "not json"],
    ["役割が不正", { device: "dev-0001", role: "owner", exp: NOW + 60 }],
    ["期限が数でない", { device: "dev-0001", role: "member", exp: String(NOW + 60) }],
    ["端末 ID が空", { device: "", role: "member", exp: NOW + 60 }],
    ["端末 ID が無い", { role: "member", exp: NOW + 60 }],
    ["配列", ["dev-0001", "member", NOW + 60]],
  ])("署名が正しくても%sなら null", async (_name, body) => {
    expect(await verifySessionToken(await signed(body), hmac, NOW)).toBeNull();
  });
});

describe("署名の全位置（攻撃役の指摘）", () => {
  it("署名のどの位置の 1 文字を変えても null", async () => {
    const [payload, signature] = (await issueSessionToken(MEMBER, hmac)).split(".");
    for (let i = 0; i < signature.length; i++) {
      const forged = `${payload}.${flip(signature, i)}`;
      expect(await verifySessionToken(forged, hmac, NOW), `位置 ${i}`).toBeNull();
    }
  });

  it.each([
    ["長すぎる", (s: string) => `${s}A`],
    ["空", () => ""],
  ])("署名が%sと null", async (_name, change) => {
    const [payload, signature] = (await issueSessionToken(MEMBER, hmac)).split(".");
    expect(await verifySessionToken(`${payload}.${change(signature)}`, hmac, NOW)).toBeNull();
  });
});

describe("中身の型（攻撃役の指摘）", () => {
  it.each([
    ["端末 ID が数", { device: 123, role: "member", exp: NOW + 60 }],
    ["端末 ID が null", { device: null, role: "member", exp: NOW + 60 }],
    ["端末 ID が配列", { device: ["dev-0001"], role: "member", exp: NOW + 60 }],
    ["端末 ID がオブジェクト", { device: { id: 1 }, role: "member", exp: NOW + 60 }],
    ["役割が無い", { device: "dev-0001", exp: NOW + 60 }],
    ["役割が null", { device: "dev-0001", role: null, exp: NOW + 60 }],
    ["役割が大文字", { device: "dev-0001", role: "Admin", exp: NOW + 60 }],
    ["期限が null", { device: "dev-0001", role: "member", exp: null }],
    ["期限が小数", { device: "dev-0001", role: "member", exp: NOW + 60.5 }],
    ["JSON が null", null],
    ["JSON が数", 42],
    ["JSON が文字列", "dev-0001"],
  ])("署名が正しくても%sなら null", async (_name, body) => {
    expect(await verifySessionToken(await signed(body), hmac, NOW)).toBeNull();
  });
});

describe("返す中身（攻撃役の指摘）", () => {
  it("署名済みの中身に余分なキーがあっても、返すのは device・role・exp だけ", async () => {
    const token = await signed({ ...MEMBER, lat: 41.8, lng: 144.5 });
    expect(await verifySessionToken(token, hmac, NOW)).toStrictEqual(MEMBER);
  });
});

/** 前半の文字列をそのまま使い、正しい鍵で署名する（base64url として崩れた前半を試す） */
async function signedRaw(payload: string): Promise<string> {
  return `${payload}.${Buffer.from(await hmac(payload)).toString("base64url")}`;
}

describe("base64url の形（攻撃役の指摘）", () => {
  it.each([
    ["= が付く", (p: string) => `${p}=`],
    ["+ が混ざる", (p: string) => `${p.slice(0, -1)}+`],
    ["/ が混ざる", (p: string) => `${p.slice(0, -1)}/`],
  ])("前半に%sと、署名が正しくても null", async (_name, change) => {
    const [payload] = (await issueSessionToken(MEMBER, hmac)).split(".");
    expect(await verifySessionToken(await signedRaw(change(payload)), hmac, NOW)).toBeNull();
  });

  it.each([
    ["= が付く", (s: string) => `${s}=`],
    ["同じバイトの標準 base64（= 付き）", (s: string) => Buffer.from(s, "base64url").toString("base64")],
  ])("署名が%sだと null", async (_name, change) => {
    const [payload, signature] = (await issueSessionToken(MEMBER, hmac)).split(".");
    expect(await verifySessionToken(`${payload}.${change(signature)}`, hmac, NOW)).toBeNull();
  });
});

describe("HMAC に渡す値（攻撃役の指摘）", () => {
  it("確かめるときに HMAC へ渡すのは Cookie の前半そのもの", async () => {
    const token = await issueSessionToken(MEMBER, hmac);
    const seen: string[] = [];
    const spy: Hmac = async (data) => {
      seen.push(data);
      return hmac(data);
    };
    await verifySessionToken(token, spy, NOW);
    expect(seen).toEqual([token.split(".")[0]]);
  });
});
