/**
 * テスト用の R2（人が書く。檻の外）。中身は Map に複製して持ち、呼ばれた順を残す。
 * 失敗や同時の割り込みは、テストが photos の put・delete を差し替えて作る。
 */
import type { BucketPort } from "./deps";

export interface TestBucket {
  photos: BucketPort;
  objects: Map<string, { bytes: Uint8Array<ArrayBuffer>; contentType: string | undefined }>;
  calls: { op: "put" | "get" | "delete"; key: string }[];
}

export function createTestBucket(): TestBucket {
  const objects: TestBucket["objects"] = new Map();
  const calls: TestBucket["calls"] = [];
  const photos: BucketPort = {
    put: async (key, value, options) => {
      calls.push({ op: "put", key });
      const bytes = value instanceof Uint8Array ? value.slice() : new Uint8Array(value.slice(0));
      objects.set(key, { bytes, contentType: options?.httpMetadata?.contentType });
      return {};
    },
    get: async (key) => {
      calls.push({ op: "get", key });
      const object = objects.get(key);
      if (object === undefined) return null;
      return { body: new Response(object.bytes).body as ReadableStream, size: object.bytes.byteLength };
    },
    delete: async (key) => {
      calls.push({ op: "delete", key });
      objects.delete(key);
    },
  };
  return { photos, objects, calls };
}
