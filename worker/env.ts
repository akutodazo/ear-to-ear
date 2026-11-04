/**
 * Worker の環境（バインディングと Secret）から Deps を作る（人が書く。檻の外）。
 * crypto.subtle・crypto.randomUUID・Date.now に触るのはここだけ。
 * バインディング名は wrangler.jsonc（本人が作る）との約束: DB・PHOTOS・ASSETS。
 * fetch で Claude の Messages API を呼ぶのもここだけ（T31。SDK は使わない、11-04 先輩決定 #107）。
 */
import { CLAUDE_TIMEOUT_MS } from "@/config";
import fields from "@/data/fields.json";
import type { Role } from "@/types";
import type { BucketPort, ClaudePort, DbPort, Deps } from "./deps";

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB: DbPort;
  PHOTOS: BucketPort;
  MEMBER_PASSPHRASE: string;
  ADMIN_PASSPHRASE: string;
  SESSION_SECRET: string;
  /** Claude API のキー（Worker の秘密、本人が登録）。無ければ Claude を呼ばない */
  CLAUDE_API_KEY?: string;
  /** "false" なら Claude を全部止める（docs/spec.md §6） */
  CLAUDE_ENABLED?: string;
}

const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2026-10-21";

/**
 * Messages API を 1 回呼ぶ口。30 秒で打ち切り、再試行しない。通信の失敗・時間切れは { status: 0, body: null }、
 * JSON でない本文は body null。キーは見出しにだけ入れ、例外やログに出さない
 */
function createClaude(env: Env): ClaudePort | null {
  const key = env.CLAUDE_API_KEY;
  // 大文字小文字と前後の空白は見ない（"FALSE"・" false " でも止まる。レビュー #113 の指摘 5）
  if (env.CLAUDE_ENABLED?.trim().toLowerCase() === "false" || !key) return null;
  return async (requestBody) => {
    try {
      const response = await fetch(CLAUDE_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": ANTHROPIC_VERSION },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS),
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      return { status: response.status, body };
    } catch {
      return { status: 0, body: null };
    }
  };
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

/** 圃場の番号だけを持つ（座標は Worker の判定に使わない） */
const knownFieldIds: ReadonlySet<string> = new Set(fields.map((field) => field.id));

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
    knownFieldIds,
    claude: createClaude(env),
  };
}
