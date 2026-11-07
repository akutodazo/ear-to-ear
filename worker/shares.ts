/**
 * POST /api/shares（LINE に 1 枚、#159）。確定した順の絵（JPEG）と番号の並びを受け、R2 と D1 に置いて共有の URL を返す。
 * 順: 415 → 413 → 欄 → 画像 → meta → 期限切れを消す → 回数 429 → R2 → D1（失敗なら R2 を消す）→ 201。
 * 判定は Service（upload-form・jpeg-segments・order-share-meta）。座標・距離は受けない・持たない（K6）
 */
import fields from "@/data/fields.json";
import { claudeDayEndsAt } from "@/services/usage-limit";
import { inspectJpeg } from "@/services/jpeg-segments";
import {
  parseOrderShareMeta,
  SHARE_BODY_MAX_BYTES,
  SHARE_DAILY_LIMIT,
  SHARE_LONG_EDGE_PX,
  SHARE_MAX_IMAGE_BYTES,
  shareCounterKey,
  shareExpiresAt,
  shareR2Key,
} from "@/services/order-share-meta";
import { checkUploadImage, checkUploadParts, isMultipartContentType, type FormPart } from "@/services/upload-form";
import { requireSession } from "./auth";
import { declaredTooLarge, readBodyLimited } from "./body";
import type { Deps, Handler } from "./deps";
import { errorResponse, json } from "./http";

const DELETE_EXPIRED = "DELETE FROM order_shares WHERE expires_at < ?";

/** 上限未満のときだけ 1 足す（handover-post と同じ形）。上限なら行が返らない */
const COUNT_SQL =
  "INSERT INTO usage_counters (key, count, expires_at) VALUES (?, 1, ?) " +
  "ON CONFLICT(key) DO UPDATE SET count = usage_counters.count + 1 WHERE usage_counters.count < ? " +
  "RETURNING count";

const INSERT_SHARE =
  "INSERT INTO order_shares (id, season, district, ranked, benchmark_id, confirmed_at, r2_key, bytes, width, height, actor_device, created_at, expires_at) " +
  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

async function readParts(bytes: Uint8Array<ArrayBuffer>, contentType: string): Promise<FormPart[] | null> {
  let form: FormData;
  try {
    form = await new Response(bytes, { headers: { "content-type": contentType } }).formData();
  } catch {
    return null;
  }
  const parts: FormPart[] = [];
  for (const [name, value] of form) {
    parts.push({ name, value: typeof value === "string" ? value : new Uint8Array(await value.arrayBuffer()) });
  }
  return parts;
}

async function removeObject(deps: Deps, key: string): Promise<void> {
  try {
    await deps.photos.delete(key);
  } catch {
    console.error(`R2 の片付けに失敗: ${key}`);
  }
}

export const postShares: Handler = async (request, ctx) => {
  const { deps } = ctx;
  const session = requireSession(ctx);

  const contentType = request.headers.get("content-type");
  if (contentType === null || !isMultipartContentType(contentType)) return errorResponse(415, "unsupported_media_type");
  if (declaredTooLarge(request.headers.get("content-length"), SHARE_BODY_MAX_BYTES)) return errorResponse(413, "payload_too_large");
  const body = await readBodyLimited(request, SHARE_BODY_MAX_BYTES);
  if (body === null) return errorResponse(413, "payload_too_large");
  const parts = await readParts(body, contentType);
  if (parts === null) return errorResponse(415, "unsupported_media_type");

  const form = checkUploadParts(parts);
  if (!form.ok) return errorResponse(422, "unprocessable", { reason: form.reason });
  const image = checkUploadImage(form.image, inspectJpeg, SHARE_MAX_IMAGE_BYTES, SHARE_LONG_EDGE_PX);
  if (!image.ok) {
    return image.reason === "too_large"
      ? errorResponse(413, "payload_too_large")
      : errorResponse(422, "unprocessable", { reason: image.reason });
  }
  const parsed = parseOrderShareMeta(form.meta, fields);
  if (!parsed.ok) return errorResponse(422, "unprocessable", { reason: parsed.reason });
  const meta = parsed.meta;

  const nowMs = deps.nowMs();
  const nowIso = new Date(nowMs).toISOString();
  await deps.db.prepare(DELETE_EXPIRED).bind(nowIso).run();

  const dayEndsAt = claudeDayEndsAt(nowMs);
  const counted = await deps.db
    .prepare(COUNT_SQL)
    .bind(shareCounterKey(session.device, nowMs), dayEndsAt, SHARE_DAILY_LIMIT)
    .first<{ count: number }>();
  if (counted === null) {
    const response = errorResponse(429, "too_many_requests");
    response.headers.set("retry-after", String(Math.max(1, Math.ceil((Date.parse(dayEndsAt) - nowMs) / 1000))));
    return response;
  }

  const id = deps.newId();
  const key = shareR2Key(id);
  const expiresAt = shareExpiresAt(nowMs);
  await deps.photos.put(key, form.image, { httpMetadata: { contentType: "image/jpeg" } });
  try {
    await deps.db
      .prepare(INSERT_SHARE)
      .bind(
        id,
        meta.season,
        meta.district,
        JSON.stringify(meta.ranked),
        meta.benchmarkId,
        meta.confirmedAt,
        key,
        form.image.byteLength,
        image.width,
        image.height,
        session.device,
        nowIso,
        expiresAt,
      )
      .run();
  } catch (error) {
    await removeObject(deps, key);
    throw error;
  }

  const origin = ctx.url.origin;
  return json(201, { id, url: `${origin}/api/shares/${id}`, imageUrl: `${origin}/api/share-files/${id}`, expiresAt });
};
