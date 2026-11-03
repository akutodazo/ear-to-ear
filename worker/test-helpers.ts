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
    knownFieldIds: new Set(Array.from({ length: 12 }, (_, i) => `A-${String(i + 1).padStart(2, "0")}`)),
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

/** テスト用の JPEG は src/services/test-jpeg.ts に 1 つだけ置く */
export { tinyJpeg } from "@/services/test-jpeg";

export interface MultipartPart {
  name: string;
  value: string | Uint8Array;
  /** 付けるとファイルの欄になる。バイト列なら既定で "photo.jpg" */
  filename?: string;
  contentType?: string;
}

/** multipart/form-data の本文を生のバイト列で組む（余分な欄・meta をファイルで送る・境界なしを作れる） */
export function multipartBody(parts: MultipartPart[], boundary = "test-boundary-7MA4YWxk"): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  for (const part of parts) {
    const isFile = part.filename !== undefined || part.value instanceof Uint8Array;
    const filename = part.filename ?? "photo.jpg";
    const disposition = isFile
      ? `form-data; name="${part.name}"; filename="${filename}"`
      : `form-data; name="${part.name}"`;
    const type = part.contentType ?? (isFile ? "image/jpeg" : undefined);
    const head = `--${boundary}\r\nContent-Disposition: ${disposition}\r\n${type ? `Content-Type: ${type}\r\n` : ""}\r\n`;
    chunks.push(encoder.encode(head));
    chunks.push(typeof part.value === "string" ? encoder.encode(part.value) : part.value);
    chunks.push(encoder.encode("\r\n"));
  }
  chunks.push(encoder.encode(`--${boundary}--\r\n`));
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const body = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    body.set(c, offset);
    offset += c.byteLength;
  }
  return body;
}

/** POST /api/uploads の要求。contentType を null にすると Content-Type を付けない */
export function multipartRequest(
  parts: MultipartPart[],
  options: { boundary?: string; contentType?: string | null; cookie?: string; headers?: Record<string, string> } = {},
): Request {
  const boundary = options.boundary ?? "test-boundary-7MA4YWxk";
  const headers: Record<string, string> = { ...options.headers };
  const contentType = options.contentType === undefined ? `multipart/form-data; boundary=${boundary}` : options.contentType;
  if (contentType !== null) headers["content-type"] = contentType;
  if (options.cookie !== undefined) headers.cookie = options.cookie;
  return new Request("https://example.test/api/uploads", {
    method: "POST",
    headers,
    body: multipartBody(parts, boundary),
  });
}

/**
 * content-length の無い（chunked の）本文の要求。chunks は読まれたときに 1 つずつ取り出す。
 * pulled は読まれたバイト数（上限で読むのをやめたかを確かめる）
 */
export function streamRequest(
  path: string,
  chunks: Iterable<Uint8Array>,
  headers: Record<string, string> = {},
): { req: Request; pulled: () => number } {
  const iterator = chunks[Symbol.iterator]();
  let pulled = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = iterator.next();
      if (next.done) {
        controller.close();
        return;
      }
      pulled += next.value.byteLength;
      controller.enqueue(next.value);
    },
  });
  const req = new Request(`https://example.test${path}`, {
    method: "POST",
    headers,
    body,
    duplex: "half",
  } as RequestInit);
  return { req, pulled: () => pulled };
}

/** totalBytes を chunkBytes ずつ "a" で埋めた本文（作るのは読まれたときだけ） */
export function* repeatChunks(totalBytes: number, chunkBytes: number): Generator<Uint8Array> {
  for (let sent = 0; sent < totalBytes; sent += chunkBytes) {
    yield new Uint8Array(Math.min(chunkBytes, totalBytes - sent)).fill(0x61);
  }
}
