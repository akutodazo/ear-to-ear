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
  // 同じ値だと照合が常に admin を返し、全員が管理者になる
  if (member === admin) throw new Error("MEMBER_PASSPHRASE と ADMIN_PASSPHRASE が同じ");
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

  // 合言葉は HMAC してから比べる。どの入力も 32 バイトになるので、長さが時間で漏れない。
  // 用途の印 "pass:" で Cookie（base64url に ":" が無い）と hashIp（"ip:"）から分ける
  const digest = (passphrase: string) => sign(`pass:${passphrase}`);
  let expected: Promise<[Uint8Array, Uint8Array]> | undefined;

  return {
    db: env.DB,
    photos: env.PHOTOS,
    assets: (request) => env.ASSETS.fetch(request),
    hmac: sign,
    hashIp: async (ip, day) => encodeBase64url(await sign(`ip:${day}:${ip}`)),
    // admin と member の両方と必ず比べる（どちらに当たったかも時間で漏れない）。admin を優先する
    matchPassphrase: async (input): Promise<Role | null> => {
      expected ??= Promise.all([digest(admin), digest(member)]);
      const [adminDigest, memberDigest] = await expected;
      const got = await digest(input);
      const isAdmin = subtle.timingSafeEqual(got, adminDigest);
      const isMember = subtle.timingSafeEqual(got, memberDigest);
      if (isAdmin) return "admin";
      if (isMember) return "member";
      return null;
    },
    nowMs: () => Date.now(),
    newId: () => crypto.randomUUID(),
  };
}
