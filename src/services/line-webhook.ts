/**
 * POST /api/line/webhook の本文から、Bot がグループに入ったときのグループ ID を取り出す（docs/spec.md §6、L8）。
 * 署名の検証は line-signature で先に済ませる。ここは例外を出さず、読めないものは捨てる。
 */

/** LINE のグループ ID の形（C と 16 進 32 文字） */
const GROUP_ID_PATTERN = /^C[0-9a-f]{32}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * events の中の join（source.type が group）の groupId を、出てきた順に重ねずに返す。
 * room・user の join、message・leave などは無視。JSON でない・events が配列でないときは []
 */
export function joinedGroupIds(text: string): string[] {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return [];
  }
  if (!isRecord(body)) return [];
  // 自分のキーだけ見る（"__proto__" などから読まない）
  if (!Object.hasOwn(body, "events")) return [];
  const events = body.events;
  if (!Array.isArray(events)) return [];
  const ids: string[] = [];
  for (const event of events) {
    if (!isRecord(event) || event.type !== "join") continue;
    const source = event.source;
    if (!isRecord(source) || source.type !== "group") continue;
    const groupId = source.groupId;
    if (typeof groupId !== "string" || !GROUP_ID_PATTERN.test(groupId)) continue;
    if (!ids.includes(groupId)) ids.push(groupId);
  }
  return ids;
}
