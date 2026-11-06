/**
 * LINE に 1 枚の共有（#159）。POST /api/shares の meta の検査と、保存の決まり。純粋関数。
 * 端末からは番号の並びだけを受け、自由文は受けない（文はサーバーでも order-message から作る）。座標・距離は受けない（K6）
 */
import type { Field } from "@/types";

/** 絵の上限（バイト）。canvas の JPEG 1080×1200 は 0.3〜0.6MB の見込み */
export const SHARE_MAX_IMAGE_BYTES = 1_500_000;
/** 本文の上限。画像に multipart の境界と meta のゆとりを足す */
export const SHARE_BODY_MAX_BYTES = SHARE_MAX_IMAGE_BYTES + 16 * 1024;
/** 絵の長辺の上限 */
export const SHARE_LONG_EDGE_PX = 2000;
/** 残す日数（11-06 先輩決定） */
export const SHARE_TTL_DAYS = 60;
/** 端末ごとの 1 日の回数 */
export const SHARE_DAILY_LIMIT = 30;
/** meta の文字数の上限 */
export const SHARE_META_MAX_CHARS = 1024;

export interface OrderShareMeta {
  season: string;
  district: string;
  /** 確定した時刻 ISO 8601（UTC） */
  confirmedAt: string;
  ranked: string[];
  benchmarkId: string | null;
}

export type OrderShareMetaReason =
  | "bad_json"
  | "unknown_key"
  | "bad_season"
  | "unknown_district"
  | "bad_list"
  | "unknown_field"
  | "duplicate_field"
  | "bad_confirmed_at"
  | "bad_benchmark";

export type OrderShareMetaResult = { ok: true; meta: OrderShareMeta } | { ok: false; reason: OrderShareMetaReason };

const KEYS = ["season", "district", "confirmedAt", "ranked", "benchmarkId"] as const;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

function isIsoUtc(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_UTC.test(value)) return false;
  const ms = Date.parse(value);
  // 2026-13-01 のような日付は Date.parse が NaN、2026-02-30 は繰り上がるので、戻して比べる
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 19) === value.slice(0, 19);
}

/** meta の検査。この順で最初の 1 つの理由を返す */
export function parseOrderShareMeta(text: string, fields: readonly Pick<Field, "id" | "district">[]): OrderShareMetaResult {
  const fail = (reason: OrderShareMetaReason): OrderShareMetaResult => ({ ok: false, reason });
  if (text.length > SHARE_META_MAX_CHARS) return fail("bad_json");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return fail("bad_json");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fail("bad_json");
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== KEYS.length || !KEYS.every((k) => keys.includes(k))) return fail("unknown_key");

  const { season, district, confirmedAt, ranked, benchmarkId } = record;
  if (typeof season !== "string" || !/^\d{4}$/.test(season)) return fail("bad_season");
  if (typeof district !== "string") return fail("unknown_district");
  const inDistrict = new Set(fields.filter((f) => f.district === district).map((f) => f.id));
  if (inDistrict.size === 0) return fail("unknown_district");
  if (!Array.isArray(ranked) || ranked.length === 0 || !ranked.every((id) => typeof id === "string")) return fail("bad_list");
  const ids = ranked as string[];
  if (!ids.every((id) => inDistrict.has(id))) return fail("unknown_field");
  if (new Set(ids).size !== ids.length) return fail("duplicate_field");
  if (!isIsoUtc(confirmedAt)) return fail("bad_confirmed_at");
  if (benchmarkId !== null && (typeof benchmarkId !== "string" || !inDistrict.has(benchmarkId))) return fail("bad_benchmark");

  return { ok: true, meta: { season, district, confirmedAt, ranked: ids, benchmarkId } };
}

/** R2 のキー shares/<id>.jpg（写真の uploads/ と分ける） */
export function shareR2Key(id: string): string {
  return `shares/${id}.jpg`;
}

/** 期限 ISO 8601（作成の SHARE_TTL_DAYS 日後） */
export function shareExpiresAt(nowMs: number): string {
  return new Date(nowMs + SHARE_TTL_DAYS * 86_400_000).toISOString();
}

/** 回数の key。`share:<端末>:<日本時間の YYYY-MM-DD>` */
export function shareCounterKey(device: string, nowMs: number): string {
  return `share:${device}:${new Date(nowMs + 9 * 3_600_000).toISOString().slice(0, 10)}`;
}
