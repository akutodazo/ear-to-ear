/**
 * POST /api/line/webhook（L8、docs/spec.md §6、#140）。Cookie ではなく LINE の署名で守る。
 * 判定は Service（line-signature・line-webhook）、外の世界は deps の line・db だけ。
 * 順: LINE の口が無い 503 → 宣言の長さが上限超 413 → 生の本文を読む（超えたら 413）→ 署名が違う 401（D1 に触らない）
 *   → join（group）のグループ ID の最後の 1 つを settings に上書きで保存
 *   → 登録したグループの画像のメッセージを、応答の後（1 つの waitUntil）で 1 枚ずつ順に、10 枚まで受け取る（L9、#172）→ 200
 * グループ ID・本文はログに出さない。
 */
import { verifyLineSignature } from "@/services/line-signature";
import {
  groupImageMessages,
  LINE_PHOTOS_PER_WEBHOOK,
  linePhotoOverflowReply,
  type LineImageMessage,
} from "@/services/line-image-event";
import { joinedGroupIds } from "@/services/line-webhook";
import { declaredTooLarge, readBodyLimited } from "./body";
import type { Deps, Handler } from "./deps";
import { errorResponse, json } from "./http";
import { receiveLinePhoto } from "./line-photos";

/** 本文の上限（バイト）。LINE のイベントは数件ずつ届くので十分な大きさ。共有の config.ts は変えずにここに置く */
export const LINE_WEBHOOK_MAX_BYTES = 64 * 1024;

/** 同じ key の行は 1 文で上書きする（DELETE を使わない） */
const SAVE_SQL =
  "INSERT INTO settings (key, value) VALUES ('line_group_id', ?) " +
  "ON CONFLICT(key) DO UPDATE SET value = excluded.value";

const GROUP_SQL = "SELECT value FROM settings WHERE key = 'line_group_id'";

export const postLineWebhook: Handler = async (request, { deps, url }) => {
  const line = deps.line;
  if (line === null) return errorResponse(503, "line_disabled");
  if (declaredTooLarge(request.headers.get("content-length"), LINE_WEBHOOK_MAX_BYTES)) {
    return errorResponse(413, "payload_too_large");
  }

  // 署名は受け取ったバイト列そのものに対して確かめる（JSON に直してから並べ直さない）
  const bytes = await readBodyLimited(request, LINE_WEBHOOK_MAX_BYTES);
  if (bytes === null) return errorResponse(413, "payload_too_large");
  const valid = await verifyLineSignature(bytes, request.headers.get("x-line-signature"), line.sign);
  if (!valid) return errorResponse(401, "unauthorized");

  // LINE の「検証」は events が空の本文を送るので、何も書かずに 200
  const text = new TextDecoder().decode(bytes);
  const groupId = joinedGroupIds(text).at(-1);
  if (groupId !== undefined) await deps.db.prepare(SAVE_SQL).bind(groupId).run();

  // 画像が無ければ settings を読まない。登録したグループ（同じ本文の join も含む）の画像だけ受ける
  const images = groupImageMessages(text);
  if (images.length > 0) {
    const saved = await deps.db.prepare(GROUP_SQL).first<{ value: string }>();
    const mine = saved === null ? [] : images.filter((image) => image.groupId === saved.value);
    if (mine.length > 0) deps.waitUntil(receiveInOrder(deps, mine, url.origin));
  }
  return json(200, { ok: true });
};

/**
 * 1 回の webhook の画像を 1 枚ずつ順に受け取る（同時に走らせない）。上限を超えた分は取りに行かず、
 * 超えた最初の 1 枚の replyToken で 1 通だけ返す。例外は外に出さない
 */
async function receiveInOrder(deps: Deps, images: LineImageMessage[], origin: string): Promise<void> {
  for (const image of images.slice(0, LINE_PHOTOS_PER_WEBHOOK)) {
    await receiveLinePhoto(deps, image, origin);
  }
  const skipped = images.slice(LINE_PHOTOS_PER_WEBHOOK);
  if (skipped.length === 0 || deps.line === null) return;
  try {
    await deps.line.reply(skipped[0].replyToken, linePhotoOverflowReply(origin, skipped.length));
  } catch {
    // 返事の失敗は無視する
  }
}
