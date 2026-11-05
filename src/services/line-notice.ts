/**
 * LINE のお知らせの本文（L8、K15）。純粋関数。
 * 載せるのは圃場の番号・状態・理由の言葉・日本時間の日時・圃場の URL だけ。
 * メモ（自由文）・根拠の写真・端末・記録の id は載せない（AGENTS.md §1、docs/privacy.md）。
 */
import type { StatusEvent } from "@/types";
import { STATUS_REASONS } from "@/config";
import { jstDateTimeLabel, statusLabel } from "./status-view";

/** 理由のコードを言葉に（「・」でつなぐ）。知らないコードは出さない。残らなければ「記録なし」 */
function noticeReasons(codes: readonly string[]): string {
  const labels = codes.flatMap((code) => {
    const reason = STATUS_REASONS.find((r) => r.code === code);
    return reason === undefined ? [] : [reason.label];
  });
  return labels.length === 0 ? "記録なし" : labels.join("・");
}

/**
 * 判断を記録した（recorded）・取り消した（revoked）ときの本文。行は改行でつなぐ。
 * recorded: 「A-03 収穫可能」／「理由: …」／記録の日本時間／URL
 * revoked: 「A-03 「収穫可能」の判断を取り消しました」／取り消しの日本時間（無ければ記録の時刻）／URL
 */
export function lineNoticeText(event: StatusEvent, kind: "recorded" | "revoked", fieldUrl: string): string {
  const status = statusLabel(event.status);
  if (kind === "revoked") {
    return [
      `${event.fieldId} 「${status}」の判断を取り消しました`,
      jstDateTimeLabel(event.revokedAt ?? event.at),
      fieldUrl,
    ].join("\n");
  }
  return [`${event.fieldId} ${status}`, `理由: ${noticeReasons(event.reasons)}`, jstDateTimeLabel(event.at), fieldUrl].join(
    "\n",
  );
}
