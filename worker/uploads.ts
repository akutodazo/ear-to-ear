/**
 * POST /api/uploads（縮小画像と meta を検査し、R2 と D1 に「未確定」で残す）。
 * 判定は Service（upload-form・jpeg-segments・upload-meta）、外の世界は deps。例外は握らない（R2 の片付けだけ）。
 */
import { MAX_UPLOAD_BYTES, THUMBNAIL_LONG_EDGE_PX } from "@/config";
import { inspectJpeg } from "@/services/jpeg-segments";
import {
  checkUploadImage,
  checkUploadParts,
  isMultipartContentType,
  PHOTO_COLUMNS,
  photoRow,
  photoRowValues,
  r2KeyFor,
  UPLOAD_BODY_MAX_BYTES,
  type FormPart,
} from "@/services/upload-form";
import { parseUploadMeta } from "@/services/upload-meta";
import { requireSession } from "./auth";
import { declaredTooLarge, readBodyLimited } from "./body";
import type { Deps, Handler } from "./deps";
import { errorResponse, json } from "./http";

const INSERT_PHOTO =
  `INSERT INTO uploaded_photos (${PHOTO_COLUMNS.join(", ")}) ` +
  `VALUES (${PHOTO_COLUMNS.map(() => "?").join(", ")}) ` +
  "ON CONFLICT(content_hash) DO NOTHING RETURNING id";

const SELECT_BY_HASH = "SELECT id FROM uploaded_photos WHERE content_hash = ?";

/** formData() の欄をバイト列と文字列に直す。投げたら null（壊れた multipart） */
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

async function findIdByHash(deps: Deps, contentHash: string): Promise<string | null> {
  const row = await deps.db.prepare(SELECT_BY_HASH).bind(contentHash).first<{ id: string }>();
  return row === null ? null : row.id;
}

/** 置いた画像を消す。消せなければ R2 のキーだけを console.error に残す（投げない） */
async function removeObject(deps: Deps, key: string): Promise<void> {
  try {
    await deps.photos.delete(key);
  } catch {
    console.error(`R2 の片付けに失敗: ${key}`);
  }
}

export const postUploads: Handler = async (request, ctx) => {
  const { deps } = ctx;
  const session = requireSession(ctx);

  const contentType = request.headers.get("content-type");
  if (contentType === null || !isMultipartContentType(contentType)) return errorResponse(415, "unsupported_media_type");
  if (declaredTooLarge(request.headers.get("content-length"), UPLOAD_BODY_MAX_BYTES)) {
    return errorResponse(413, "payload_too_large");
  }

  const body = await readBodyLimited(request, UPLOAD_BODY_MAX_BYTES);
  if (body === null) return errorResponse(413, "payload_too_large");
  const parts = await readParts(body, contentType);
  if (parts === null) return errorResponse(415, "unsupported_media_type");

  const form = checkUploadParts(parts);
  if (!form.ok) return errorResponse(422, "unprocessable", { reason: form.reason });

  const image = checkUploadImage(form.image, inspectJpeg, MAX_UPLOAD_BYTES, THUMBNAIL_LONG_EDGE_PX);
  if (!image.ok) {
    return image.reason === "too_large"
      ? errorResponse(413, "payload_too_large")
      : errorResponse(422, "unprocessable", { reason: image.reason });
  }

  const parsed = parseUploadMeta(form.meta, deps.knownFieldIds);
  if (!parsed.ok) return errorResponse(422, "unprocessable", { reason: parsed.reason });
  const meta = parsed.meta;

  // R2 に置く前に二重を見る（二重なら id も作らない）
  const existing = await findIdByHash(deps, meta.contentHash);
  if (existing !== null) return json(409, { id: existing });

  const id = deps.newId();
  const key = r2KeyFor(id);
  await deps.photos.put(key, form.image, { httpMetadata: { contentType: "image/jpeg" } });

  const row = photoRow({
    id,
    meta,
    width: image.width,
    height: image.height,
    bytes: form.image.byteLength,
    device: session.device,
    nowIso: new Date(deps.nowMs()).toISOString(),
  });
  let inserted: { id: string } | null;
  try {
    inserted = await deps.db
      .prepare(INSERT_PHOTO)
      .bind(...photoRowValues(row))
      .first<{ id: string }>();
  } catch (error) {
    await removeObject(deps, key);
    throw error;
  }

  if (inserted === null) {
    // 置いている間に同じハッシュが入った。エラー文ではなく DO NOTHING の結果で見分ける
    await removeObject(deps, key);
    const winner = await findIdByHash(deps, meta.contentHash);
    if (winner === null) throw new Error("二重のはずの行が見つからない");
    return json(409, { id: winner });
  }
  return json(201, { id: inserted.id });
};
