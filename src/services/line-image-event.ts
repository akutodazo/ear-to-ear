/**
 * L9 LINE から写真を受け取る（docs/spec.md §3、docs/decisions.md 11-06、#172）。純粋関数。
 * webhook の本文から、グループに送られた画像のメッセージを取り出す。署名の検証は line-signature で先に済ませる。
 * どのグループを受けるかは呼ぶ側（settings の line_group_id と比べる）が決める。LINE の個人 ID は取り出さない。
 */

/** LINE から受け取る写真の 1 日（日本時間）の枚数の上限。取りに行く前に数える（共有の config.ts は変えずにここに置く） */
export const LINE_PHOTO_DAILY_LIMIT = 30;

/** まとめて送られた画像（imageSet）の何枚目か */
export interface LineImageSet {
  index: number;
  total: number;
}

export interface LineImageMessage {
  groupId: string;
  /** 画像の取得（`/v2/bot/message/{id}/content`）に使う。数字だけ */
  messageId: string;
  replyToken: string;
  /** imageSet が無い・崩れていれば null（1 枚として扱う） */
  set: LineImageSet | null;
}

/** 受け取った結果。返事の文を決める */
export type LinePhotoOutcome =
  | "saved"
  | "duplicate"
  | "too_large"
  | "bad_dimensions"
  | "not_jpeg"
  | "metadata"
  | "fetch_failed"
  | "error"
  | "limit";

/** LINE のグループ ID の形（C と 16 進 32 文字。line-webhook と同じ） */
const GROUP_ID_PATTERN = /^C[0-9a-f]{32}$/;
/** message の id。URL のパスに入れるので数字だけ */
const MESSAGE_ID_PATTERN = /^\d{1,32}$/;
/** replyToken。空白・制御文字の無い ASCII */
const REPLY_TOKEN_PATTERN = /^[\x21-\x7e]{1,256}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 自分のキーだけ読む（"__proto__" などから読まない） */
function own(record: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

function imageSetOf(value: unknown): LineImageSet | null {
  if (!isRecord(value)) return null;
  const index = own(value, "index");
  const total = own(value, "total");
  if (!Number.isInteger(index) || !Number.isInteger(total)) return null;
  const i = index as number;
  const t = total as number;
  if (i < 1 || i > t) return null;
  return { index: i, total: t };
}

function imageMessageOf(event: unknown): LineImageMessage | null {
  if (!isRecord(event) || own(event, "type") !== "message") return null;
  // 待機中のチャネル（standby）は返事ができず、ほかのチャネルが受け持つ
  if (own(event, "mode") === "standby") return null;

  const source = own(event, "source");
  if (!isRecord(source) || own(source, "type") !== "group") return null;
  const groupId = own(source, "groupId");
  if (typeof groupId !== "string" || !GROUP_ID_PATTERN.test(groupId)) return null;

  const message = own(event, "message");
  if (!isRecord(message) || own(message, "type") !== "image") return null;
  // LINE のサーバーにある画像だけ取りに行く（外部の URL は取りに行かない）
  const provider = own(message, "contentProvider");
  if (!isRecord(provider) || own(provider, "type") !== "line") return null;
  const messageId = own(message, "id");
  if (typeof messageId !== "string" || !MESSAGE_ID_PATTERN.test(messageId)) return null;

  const replyToken = own(event, "replyToken");
  if (typeof replyToken !== "string" || !REPLY_TOKEN_PATTERN.test(replyToken)) return null;

  return { groupId, messageId, replyToken, set: imageSetOf(own(message, "imageSet")) };
}

/**
 * events の中の、グループに送られた画像のメッセージを出てきた順に返す（同じ messageId は最初の 1 つ）。
 * JSON でない・events が配列でないときは []。例外を出さない
 */
export function groupImageMessages(text: string): LineImageMessage[] {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return [];
  }
  if (!isRecord(body)) return [];
  const events = own(body, "events");
  if (!Array.isArray(events)) return [];
  const messages: LineImageMessage[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    const message = imageMessageOf(event);
    if (message === null || seen.has(message.messageId)) continue;
    seen.add(message.messageId);
    messages.push(message);
  }
  return messages;
}

/**
 * 返事の文。受け取れたとき（saved・duplicate）は、まとめて送られた画像の最後の 1 枚にだけ返す（途中は null）。
 * 受け取れなかったときは 1 枚ごとに返す。写真の中身・番号・個人 ID は入れない
 */
export function linePhotoReply(outcome: LinePhotoOutcome, origin: string, set: LineImageSet | null): string | null {
  const recent = `${origin}/recent`;
  const upload = `${origin}/upload`;
  switch (outcome) {
    case "saved":
    case "duplicate":
      if (set !== null && set.index !== set.total) return null;
      return outcome === "saved"
        ? `写真を受け取りました（未確定）。圃場の番号は管理者が付けます。\n${recent}`
        : `この写真はもう届いています。\n${recent}`;
    case "too_large":
    case "bad_dimensions":
      return `写真が大きすぎて受け取れませんでした。サイトの「写真を送る」から送ってください。\n${upload}`;
    case "limit":
      return `今日 LINE から受け取れる写真の数（${LINE_PHOTO_DAILY_LIMIT} 枚）を超えました。サイトの「写真を送る」から送ってください。\n${upload}`;
    case "not_jpeg":
    case "metadata":
    case "fetch_failed":
    case "error":
      return `写真を受け取れませんでした。サイトの「写真を送る」から送ってください。\n${upload}`;
  }
}
