/**
 * Worker の環境（バインディングと Secret）から Deps を作る（人が書く。檻の外）。
 * crypto.subtle・crypto.randomUUID・Date.now に触るのはここだけ。
 * バインディング名は wrangler.jsonc（本人が作る）との約束: DB・PHOTOS・ASSETS。
 */
import type { Role } from "@/types";
import type { BucketPort, DbPort, Deps } from "./deps";

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB: DbPort;
  PHOTOS: BucketPort;
  MEMBER_PASSPHRASE: string;
  ADMIN_PASSPHRASE: string;
  SESSION_SECRET: string;
}

/** Workers の crypto.subtle には timingSafeEqual がある。lib dom の型には無いので広げる */
type WorkersSubtle = SubtleCrypto & {
  timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean;
};

const encoder = new TextEncoder();

function requireSecret(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} が設定されていない`);
  return value;
}

function encodeBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function createDeps(env: Env): Deps {
  const secret = requireSecret(env.SESSION_SECRET, "SESSION_SECRET");
  const member = requireSecret(env.MEMBER_PASSPHRASE, "MEMBER_PASSPHRASE");
  const admin = requireSecret(env.ADMIN_PASSPHRASE, "ADMIN_PASSPHRASE");
  const subtle = crypto.subtle as WorkersSubtle;

  // 鍵は SESSION_SECRET の文字列の UTF-8 をそのまま使う（16進として復号しない）
  const key = subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sign = async (data: string) =>
    new Uint8Array(await subtle.sign("HMAC", await key, encoder.encode(data)));

  // バイト長が違えば不一致。同じ長さなら時間の差が出ない比較
  const equals = (input: string, expected: string) => {
    const a = encoder.encode(input);
    const b = encoder.encode(expected);
    return a.byteLength === b.byteLength && subtle.timingSafeEqual(a, b);
  };

  return {
    db: env.DB,
    photos: env.PHOTOS,
    assets: (request) => env.ASSETS.fetch(request),
    hmac: sign,
    hashIp: async (ip, day) => encodeBase64url(await sign(`ip:${day}:${ip}`)),
    matchPassphrase: async (input): Promise<Role | null> => {
      if (equals(input, admin)) return "admin";
      if (equals(input, member)) return "member";
      return null;
    },
    nowMs: () => Date.now(),
    newId: () => crypto.randomUUID(),
  };
}
