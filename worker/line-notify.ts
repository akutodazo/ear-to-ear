/**
 * 判断を残した・取り消したときに LINE のグループに 1 通送る（L8、K15、docs/spec.md §9 の 14、#141）。
 * ハンドラが応答を返す直前に deps.waitUntil に渡す。失敗しても応答は変わらないよう、例外は外に出さない。
 * 順: LINE の口が無い → グループ ID が無い → 月の回数が上限 → のどれかなら送らない。送ったら結果は見ない（再試行しない）。
 * URL は判断ごとの OGP ページ（根拠の写真がサムネイルになる、#220）。グループ ID・本文はログに出さない。
 */
import { LINE_STOP_AT } from "@/config";
import { judgmentUrl } from "@/services/judgment-page";
import { lineNoticeText } from "@/services/line-notice";
import { lineCounterKey, lineMonthEndsAt } from "@/services/usage-limit";
import type { StatusEvent } from "@/types";
import type { Deps } from "./deps";

/** webhook の join で受けたグループ ID */
const GROUP_SQL = "SELECT value FROM settings WHERE key = 'line_group_id'";

/** 上限未満のときだけ 1 文で足す。満杯なら行は返らない（期限も変えない）。handover-post と同じ形 */
const COUNT_SQL =
  "INSERT INTO usage_counters (key, count, expires_at) VALUES (?, 1, ?) " +
  "ON CONFLICT(key) DO UPDATE SET count = usage_counters.count + 1 WHERE usage_counters.count < ? " +
  "RETURNING count";

export async function notifyLine(
  deps: Deps,
  event: StatusEvent,
  kind: "recorded" | "revoked",
  origin: string,
): Promise<void> {
  try {
    const line = deps.line;
    if (line === null) return;
    const group = await deps.db.prepare(GROUP_SQL).first<{ value: string }>();
    if (group === null) return;

    // 送る前に数える（失敗も数える）
    const nowMs = deps.nowMs();
    const reserved = await deps.db
      .prepare(COUNT_SQL)
      .bind(lineCounterKey(nowMs), lineMonthEndsAt(nowMs), LINE_STOP_AT)
      .first<{ count: number }>();
    if (reserved === null) return;

    await line.push(group.value, lineNoticeText(event, kind, judgmentUrl(origin, event.id, kind)));
  } catch {
    // 通知の失敗は判断の記録に響かせない（K15）。中身を出さないためログにも書かない
  }
}
