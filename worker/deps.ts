/**
 * Worker の型だけを置く（人が書く。無人は import するだけ）。
 * 外の世界（crypto・env・時計・乱数・静的アセット）は Deps で受け取り、檻の側では直接触らない。
 * @cloudflare/workers-types は lib dom と衝突しやすいので、使う所だけの狭い口を自前で宣言する。
 */
import type { Role } from "@/types";
import type { Hmac, SessionClaims } from "@/services/session-token";

export interface StmtPort {
  bind(...values: unknown[]): StmtPort;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}

export interface DbPort {
  prepare(sql: string): StmtPort;
  batch(statements: StmtPort[]): Promise<unknown[]>;
}

export interface BucketPort {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; size: number } | null>;
  delete(key: string): Promise<void>;
}

export interface Deps {
  /** D1（バインディング名 DB） */
  db: DbPort;
  /** R2（バインディング名 PHOTOS） */
  photos: BucketPort;
  /** /api/ の外を静的アセットに渡す */
  assets: (request: Request) => Promise<Response>;
  /**
   * SESSION_SECRET で閉じた HMAC-SHA256。Cookie の署名と検証だけに使う。
   * 同じ鍵を hashIp（"ip:"）と合言葉の照合（"pass:"）にも使うが、Cookie の署名の対象は
   * base64url で ":" を含まないので、どの用途の値とも取り違えない
   */
  hmac: Hmac;
  /** 合言葉の失敗回数の鍵。"ip:" + 日付 + ":" + IP を同じ鍵で HMAC して base64url（用途の印で Cookie と分ける） */
  hashIp: (ip: string, day: string) => Promise<string>;
  /** "pass:" を付けて HMAC してから timingSafeEqual で照合。admin と member の両方と比べ、admin を優先。どちらでもなければ null */
  matchPassphrase: (input: string) => Promise<Role | null>;
  /** ミリ秒。秒に直すのは auth.ts だけ */
  nowMs: () => number;
  /** UUID v4 */
  newId: () => string;
  /** 架空の圃場の番号の一覧（src/data/fields.json）。meta の候補・選んだ番号を確かめる */
  knownFieldIds: ReadonlySet<string>;
}

export type AuthLevel = "none" | "member" | "admin";
export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RouteContext {
  url: URL;
  params: Record<string, string>;
  /** auth が none なら必ず null。member・admin なら必ず非 null */
  session: SessionClaims | null;
  deps: Deps;
}

export type Handler = (request: Request, ctx: RouteContext) => Promise<Response>;

export interface Route {
  method: HttpMethod;
  pattern: string;
  auth: AuthLevel;
  handler: Handler;
}
