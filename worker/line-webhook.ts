/**
 * POST /api/line/webhook（L8、docs/spec.md §6、#140）。Cookie ではなく LINE の署名で守る。
 * 判定は Service（line-signature・line-webhook）、外の世界は deps の line・db だけ。
 * 順: LINE の口が無い 503 → 宣言の長さが上限超 413 → 生の本文を読む（超えたら 413）→ 署名が違う 401（D1 に触らない）
 *   → join（group）のグループ ID の最後の 1 つを settings に上書きで保存
 *   → 登録したグループの画像のメッセージを、応答の後（1 つの waitUntil）で 1 枚ずつ順に、10 枚・20 秒まで受け取る（L9、#172）→ 200
 * グループ ID・本文はログに出さない。
 */
import { verifyLineSignature } from "@/services/line-signature";
import {
  groupImageMessages,
  LINE_PHOTOS_PER_WEBHOOK,
  linePhotoOverflowReply,
  linePhotoTimeoutReply,
  type LineImageMessage,
} from "@/services/line-image-event";
import { joinedGroupIds } from "@/services/line-webhook";
import { declaredTooLarge, readBodyLimited } from "./body";
import type { Deps, Handler } from "./deps";
import { errorResponse, json } from "./http";
import { receiveLinePhoto } from "./line-photos";

/**
 * 1 回の webhook の処理の締め切り（ミリ秒）。waitUntil は応答の後およそ 30 秒で打ち切られる（推定）ので、
 * これを過ぎたら次の写真を始めず、残りを 1 通で知らせる（PR #188 のレビュー 2）
 */
export const LINE_PHOTOS_DEADLINE_MS = 20_000;

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
 * 1 回の webhook の画像を 1 枚ずつ順に受け取る（同時に走らせない）。
 * 止めるのは 3 つ: 10 枚を超えた分（取りに行かず 1 通で知らせる）、締め切りを過ぎた後の分（同じく 1 通）、
 * 1 日の上限に当たった後の分（数えず、返事もしない。上限の返事は当たった 1 枚の分だけ。PR #188 のレビュー 5）。
 * 例外は外に出さない
 */
async function receiveInOrder(deps: Deps, images: LineImageMessage[], origin: string): Promise<void> {
  const startMs = deps.nowMs();
  const accepted = images.slice(0, LINE_PHOTOS_PER_WEBHOOK);
  for (const [index, image] of accepted.entries()) {
    if (deps.nowMs() - startMs >= LINE_PHOTOS_DEADLINE_MS) {
      const skipped = images.length - index;
      await replyQuietly(deps, image.replyToken, linePhotoTimeoutReply(origin, skipped));
      return;
    }
    const outcome = await receiveLinePhoto(deps, image, origin);
    if (outcome === "limit") return;
  }
  const overflow = images.slice(LINE_PHOTOS_PER_WEBHOOK);
  if (overflow.length > 0) {
    await replyQuietly(deps, overflow[0].replyToken, linePhotoOverflowReply(origin, overflow.length));
  }
}

/** 返事を 1 通。失敗は無視する */
async function replyQuietly(deps: Deps, replyToken: string, text: string): Promise<void> {
  if (deps.line === null) return;
  try {
    await deps.line.reply(replyToken, text);
  } catch {
    // 返事の失敗は無視する
  }
}
