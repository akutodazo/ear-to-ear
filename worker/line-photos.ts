/**
 * L9 LINE から写真を受け取る（docs/spec.md §3・§6、docs/decisions.md 11-06、#172）。
 * webhook が応答を返した後に deps.waitUntil で 1 枚ずつ呼ぶ。例外は外に出さず、結果のコードを返す。
 * 順: 1 日の枚数を数える（満杯なら取りに行かない）→ LINE から取る（3MB で打ち切り）→ 取ったままのバイト列のハッシュ（K7）
 *   → 画像の復元に要るセグメントだけを残す（K6。APP・COM などを読まずに捨てる、line-jpeg）→ Web の送る流れと同じ検査（upload-form）
 *   → 二重を見る → R2 に置く → D1 に「未確定」（候補なし・撮影日なし・端末は line）で入れる → reply で 1 回返す。
 * 再試行しない。ログに message ID・グループ ID・replyToken を出さない。
 */
import { MAX_UPLOAD_BYTES, THUMBNAIL_LONG_EDGE_PX } from "@/config";
import { inspectJpeg } from "@/services/jpeg-segments";
import { linePhotoReply, LINE_PHOTO_DAILY_LIMIT, type LineImageMessage, type LinePhotoOutcome } from "@/services/line-image-event";
import { keepImageSegmentsOnly } from "@/services/line-jpeg";
import { checkUploadImage, PHOTO_COLUMNS, photoRow, photoRowValues, r2KeyFor } from "@/services/upload-form";
import { claudeDayEndsAt, linePhotoCounterKey } from "@/services/usage-limit";
import type { Deps } from "./deps";

/** uploaded_photos.uploader_device に入れる値。LINE の個人 ID は残さない（privacy.md） */
export const LINE_UPLOADER_DEVICE = "line";

/** 上限未満のときだけ 1 文で足す。満杯なら行は返らない（line-notify・handover-post と同じ形） */
const COUNT_SQL =
  "INSERT INTO usage_counters (key, count, expires_at) VALUES (?, 1, ?) " +
  "ON CONFLICT(key) DO UPDATE SET count = usage_counters.count + 1 WHERE usage_counters.count < ? " +
  "RETURNING count";

const INSERT_PHOTO =
  `INSERT INTO uploaded_photos (${PHOTO_COLUMNS.join(", ")}) ` +
  `VALUES (${PHOTO_COLUMNS.map(() => "?").join(", ")}) ` +
  "ON CONFLICT(content_hash) DO NOTHING RETURNING id";

const SELECT_BY_HASH = "SELECT id FROM uploaded_photos WHERE content_hash = ?";

/** 置いた画像を消す。消せなければ R2 のキーだけを console.error に残す（投げない。uploads と同じ） */
async function removeObject(deps: Deps, key: string): Promise<void> {
  try {
    await deps.photos.delete(key);
  } catch {
    console.error(`R2 の片付けに失敗: ${key}`);
  }
}

/** 取って、確かめて、保存する。返事はしない */
async function store(deps: Deps, message: LineImageMessage, line: NonNullable<Deps["line"]>): Promise<LinePhotoOutcome> {
  const nowMs = deps.nowMs();
  // 取りに行く前に数える（失敗も数える）
  const reserved = await deps.db
    .prepare(COUNT_SQL)
    .bind(linePhotoCounterKey(nowMs), claudeDayEndsAt(nowMs), LINE_PHOTO_DAILY_LIMIT)
    .first<{ count: number }>();
  if (reserved === null) return "limit";

  let content: Awaited<ReturnType<typeof line.getContent>>;
  try {
    content = await line.getContent(message.messageId, MAX_UPLOAD_BYTES);
  } catch {
    return "fetch_failed";
  }
  if (!content.ok) return content.reason === "too_large" ? "too_large" : "fetch_failed";

  // 二重の判定は取ってきたままのバイト列（K7 の「元ファイルのハッシュ」に当たるもの）
  const contentHash = await deps.sha256Hex(content.bytes);
  // 画像の復元に要るセグメントだけを残す（APP0〜15・COM など、撮影位置・撮影日が入りうるものは中身を読まずに捨てる）。
  // 端末で作られたバイト列がそのまま届くので、Web の流れ（APP1〜15 を消す）より狭く残す（レビューの指摘）
  const stripped = keepImageSegmentsOnly(content.bytes);
  if (stripped === null) return "not_jpeg";
  const image = checkUploadImage(stripped, inspectJpeg, MAX_UPLOAD_BYTES, THUMBNAIL_LONG_EDGE_PX);
  if (!image.ok) return image.reason;

  // R2 に置く前に二重を見る（二重なら id も作らない）
  const existing = await deps.db.prepare(SELECT_BY_HASH).bind(contentHash).first<{ id: string }>();
  if (existing !== null) return "duplicate";

  const id = deps.newId();
  const key = r2KeyFor(id);
  await deps.photos.put(key, stripped, { httpMetadata: { contentType: "image/jpeg" } });

  const nowIso = new Date(nowMs).toISOString();
  const row = photoRow({
    id,
    meta: { contentHash, takenAt: null, takenAtSource: "none", candidateFieldIds: [], chosenFieldId: null },
    width: image.width,
    height: image.height,
    bytes: stripped.byteLength,
    device: LINE_UPLOADER_DEVICE,
    nowIso,
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
    // 置いている間に同じハッシュが入った
    await removeObject(deps, key);
    return "duplicate";
  }
  return "saved";
}

/**
 * 1 枚を受け取り、reply で返事をする。LINE の口が無ければ何もせず null。
 * 例外は外に出さない（保存の失敗は error、返事の失敗は結果を変えない）
 */
export async function receiveLinePhoto(
  deps: Deps,
  message: LineImageMessage,
  origin: string,
): Promise<LinePhotoOutcome | null> {
  const line = deps.line;
  if (line === null) return null;

  let outcome: LinePhotoOutcome;
  try {
    outcome = await store(deps, message, line);
  } catch {
    // 中身（message ID など）を出さないため、ログには種類だけ
    console.error("LINE の写真の保存に失敗");
    outcome = "error";
  }

  const text = linePhotoReply(outcome, origin, message.set);
  if (text !== null) {
    try {
      await line.reply(message.replyToken, text);
    } catch {
      // 返事の失敗は保存の結果に響かせない
    }
  }
  return outcome;
}
