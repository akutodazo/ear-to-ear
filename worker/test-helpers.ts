/**
 * テスト用の Deps（人が書く。檻の外）。
 * HMAC は node:crypto、時計と ID は固定。db と photos は土台では呼ばないので、呼ぶと例外にする。
 */
import { createHmac } from "node:crypto";
import { issueSessionToken, type Hmac } from "@/services/session-token";
import type { Role } from "@/types";
import type { BucketPort, DbPort, Deps } from "./deps";

export const KEY = Buffer.alloc(32, 0x01);
export const NOW_MS = 1_793_000_000_000;
export const NOW_SEC = NOW_MS / 1000;

export function hmacWith(key: Buffer): Hmac {
  return async (data) => new Uint8Array(createHmac("sha256", key).update(data).digest());
}

function unused(name: string): never {
  throw new Error(`${name} は土台では呼ばない`);
}

const db: DbPort = {
  prepare: () => unused("db.prepare"),
  batch: () => unused("db.batch"),
};

const photos: BucketPort = {
  put: () => unused("photos.put"),
  get: () => unused("photos.get"),
  delete: () => unused("photos.delete"),
};

export function fakeDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    db,
    photos,
    assets: async (request) =>
      new Response(`asset:${new URL(request.url).pathname}`, {
        status: 200,
        headers: { "x-asset": "1" },
      }),
    hmac: hmacWith(KEY),
    hashIp: async (ip, day) => `ip:${day}:${ip}`,
    matchPassphrase: async () => null,
    nowMs: () => NOW_MS,
    newId: () => "00000000-0000-4000-8000-000000000001",
    ...overrides,
  };
}

/** 正しい鍵で署名した Cookie の値 */
export async function sessionToken(role: Role, exp = NOW_SEC + 60, key = KEY): Promise<string> {
  return issueSessionToken({ device: `dev-${role}`, role, exp }, hmacWith(key));
}

/** JSON の本文を持つ要求。headers で Content-Type・CF-Connecting-IP などを足す・上書きする */
export function jsonRequest(
  method: string,
  path: string,
  body: string,
  headers: Record<string, string> = {},
): Request {
  return new Request(`https://example.test${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

export function request(method: string, path: string, cookie?: string): Request {
  return new Request(`https://example.test${path}`, {
    method,
    headers: cookie === undefined ? {} : { cookie },
  });
}
