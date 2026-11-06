/**
 * GET /api/shares/:id（OGP 付きの HTML）と GET /api/share-files/:id（絵）。LINE に 1 枚、#160。
 * どちらも認証なし（LINE のサーバーは Cookie 無しで取りに来る）。期限切れ・無い id は 404（R2 は読まない）
 */
import fields from "@/data/fields.json";
import { shareR2Key } from "@/services/order-share-meta";
import { sharePageHtml } from "@/services/share-page";
import type { Field } from "@/types";
import type { Deps, Handler } from "./deps";
import { errorResponse } from "./http";

const SELECT_SHARE =
  "SELECT id, district, ranked, benchmark_id, confirmed_at, width, height FROM order_shares WHERE id = ? AND expires_at > ?";

interface ShareRow {
  id: string;
  district: string;
  ranked: string;
  benchmark_id: string | null;
  confirmed_at: string;
  width: number;
  height: number;
}

const fieldsById: Record<string, Field> = Object.fromEntries((fields as Field[]).map((f) => [f.id, f]));

/** HTML はすぐ直せるよう短く。絵は id ごとに変わらないので 1 日 */
export const SHARE_PAGE_CACHE_CONTROL = "public, max-age=300";
export const SHARE_FILE_CACHE_CONTROL = "public, max-age=86400";

async function findShare(deps: Deps, id: string): Promise<ShareRow | null> {
  return deps.db.prepare(SELECT_SHARE).bind(id, new Date(deps.nowMs()).toISOString()).first<ShareRow>();
}

export const getSharePage: Handler = async (_request, ctx) => {
  const row = await findShare(ctx.deps, ctx.params.id);
  if (row === null) return errorResponse(404, "not_found");
  let ranked: string[];
  try {
    ranked = JSON.parse(row.ranked) as string[];
  } catch {
    return errorResponse(404, "not_found");
  }
  const html = sharePageHtml({
    id: row.id,
    origin: ctx.url.origin,
    district: row.district,
    confirmedAt: row.confirmed_at,
    ranked,
    benchmarkId: row.benchmark_id,
    width: row.width,
    height: row.height,
    fieldsById,
  });
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": SHARE_PAGE_CACHE_CONTROL,
      "x-robots-tag": "noindex, nofollow",
      "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      "referrer-policy": "no-referrer",
    },
  });
};

export const getShareFile: Handler = async (_request, ctx) => {
  const row = await findShare(ctx.deps, ctx.params.id);
  if (row === null) return errorResponse(404, "not_found");
  const object = await ctx.deps.photos.get(shareR2Key(row.id));
  if (object === null) return errorResponse(404, "not_found");
  return new Response(object.body, {
    status: 200,
    headers: {
      "content-type": "image/jpeg",
      "content-length": String(object.size),
      "cache-control": SHARE_FILE_CACHE_CONTROL,
    },
  });
};
