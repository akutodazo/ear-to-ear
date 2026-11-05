import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyLineSignature, type LineHmac } from "@/services/line-signature";

// 鍵は文字列にせず固定のバイト列で作る（チャネルシークレットらしい文字列をリポジトリに入れない）
const KEY = Buffer.alloc(32, 0x03);
const OTHER_KEY = Buffer.alloc(32, 0x04);

function hmacWith(key: Buffer): LineHmac {
  return async (body) => new Uint8Array(createHmac("sha256", key).update(body).digest());
}
const hmac = hmacWith(KEY);

/** LINE が付ける x-line-signature と同じ形（本文の HMAC-SHA256 の標準 base64、= 付き） */
function signatureOf(body: Uint8Array, key: Buffer = KEY): string {
  return createHmac("sha256", key).update(body).digest("base64");
}

const BODY = new TextEncoder().encode('{"destination":"Uxxxx","events":[{"type":"join"}]}');

/** 呼ばれた回数を数える HMAC */
function countingHmac(): { fn: LineHmac; calls: () => number } {
  let count = 0;
  return {
    fn: async (body) => {
      count++;
      return hmac(body);
    },
    calls: () => count,
  };
}

describe("正しい署名", () => {
  it("正しい署名を通す", async () => {
    expect(await verifyLineSignature(BODY, signatureOf(BODY), hmac)).toBe(true);
  });

  it("空の本文でも、正しい署名なら通す", async () => {
    const empty = new Uint8Array(0);
    expect(await verifyLineSignature(empty, signatureOf(empty), hmac)).toBe(true);
  });

  it("HMAC に渡すのは本文のバイト列そのもの", async () => {
    const seen: Uint8Array[] = [];
    const spy: LineHmac = async (body) => {
      seen.push(body);
      return hmac(body);
    };
    await verifyLineSignature(BODY, signatureOf(BODY), spy);
    expect(seen).toHaveLength(1);
    expect(Array.from(seen[0])).toEqual(Array.from(BODY));
  });
});

describe("改ざん", () => {
  it("本文を 1 バイト変えると拒否", async () => {
    const header = signatureOf(BODY);
    const changed = Uint8Array.from(BODY);
    changed[changed.length - 1] ^= 0x01;
    expect(await verifyLineSignature(changed, header, hmac)).toBe(false);
  });

  it("鍵違いの署名を拒否", async () => {
    expect(await verifyLineSignature(BODY, signatureOf(BODY, OTHER_KEY), hmac)).toBe(false);
  });

  it("署名のどのバイトを 1 ビット変えても拒否（早く抜けても抜けなくても結果は同じ）", async () => {
    const bytes = Buffer.from(signatureOf(BODY), "base64");
    for (let i = 0; i < bytes.length; i++) {
      const forged = Buffer.from(bytes);
      forged[i] ^= 0x01;
      expect(await verifyLineSignature(BODY, forged.toString("base64"), hmac), `位置 ${i}`).toBe(
        false,
      );
    }
  });
});

describe("見出しの形の崩れ（hmac を呼ばずに false）", () => {
  const valid = signatureOf(BODY);
  it.each([
    ["null", null],
    ["空", ""],
    ["base64 でない文字", "!".repeat(44)],
    ["前後に空白", ` ${valid} `],
    ["途中に改行", `${valid.slice(0, 10)}\n${valid.slice(10)}`],
    ["31 バイト", Buffer.alloc(31, 0x05).toString("base64")],
    ["33 バイト", Buffer.alloc(33, 0x05).toString("base64")],
    ["64 バイト（SHA-512 の長さ）", Buffer.alloc(64, 0x05).toString("base64")],
    ["= が足りない", valid.replace(/=+$/, "")],
    ["= が多い", `${valid}=`],
    ["base64url の文字", valid.replaceAll("+", "-").replaceAll("/", "_").replace(/^./, "-")],
  ])("%s は false", async (_name, header) => {
    const counter = countingHmac();
    expect(await verifyLineSignature(BODY, header, counter.fn)).toBe(false);
    expect(counter.calls()).toBe(0);
  });
});

describe("hmac の失敗", () => {
  it("hmac が例外を投げたら外に出さず false", async () => {
    const broken: LineHmac = async () => {
      throw new Error("鍵が読めない");
    };
    await expect(verifyLineSignature(BODY, signatureOf(BODY), broken)).resolves.toBe(false);
  });

  it("hmac が 32 バイトでない値を返したら false", async () => {
    const short: LineHmac = async (body) => (await hmac(body)).slice(0, 31);
    expect(await verifyLineSignature(BODY, signatureOf(BODY), short)).toBe(false);
  });
});
