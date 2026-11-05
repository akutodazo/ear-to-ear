/**
 * 判断の履歴（新しい順）。取り消したものは薄く「取り消し」。
 * 各項目に statusAnchorId の id を付ける（引き継ぎメモの根拠の印から戻ってくる先）。props だけで受け取る
 */
import type { StatusEvent } from "@/types";
import type { RevokeStatus } from "@/hooks/use-field-status";
import { reasonsLabel, statusLabel } from "@/services/status-view";
import { monthDayJst } from "@/services/parcel-geometry";
import { statusAnchorId } from "@/services/handover-view";

interface Props {
  history: StatusEvent[];
  loading: boolean;
  message: string | null;
  revokeStatus: Record<number, RevokeStatus>;
  onRevoke: (eventId: number) => void;
  onRetry: () => void;
}

const NO_HISTORY = "まだ判断の記録はありません";

export function StatusHistory({ history, loading, message, revokeStatus, onRevoke, onRetry }: Props) {
  const failed = message !== null && message !== NO_HISTORY;
  // 中身が無い段は見出しごと出さない（空の段を並べない。精査 #5）
  if (history.length === 0 && !loading && !failed) return null;
  return (
    <section className="history" aria-label="判断の履歴">
      <h2 className="season-title">判断の履歴</h2>
      {loading && history.length === 0 && <p className="note">読み込んでいます</p>}
      {message && <p className="note">{message}</p>}
      {failed && !loading && (
        <button type="button" className="button button-small" onClick={onRetry}>
          もう一度読み込む
        </button>
      )}
      <ul className="history-list">
        {history.map((e) => {
          const revoked = e.revokedAt !== null;
          const r = revokeStatus[e.id];
          return (
            <li key={e.id} id={statusAnchorId(String(e.id))} className={revoked ? "history-item history-revoked" : "history-item"}>
              <div className="history-head">
                <i className={`mark mark-${e.status}`} aria-hidden="true" />
                <span className="history-when">{monthDayJst(e.at)}</span>
                <span className="history-status">{statusLabel(e.status)}</span>
                {revoked && <span className="history-tag">取り消し</span>}
                {!revoked && (
                  <button type="button" className="history-revoke" onClick={() => onRevoke(e.id)} disabled={r?.busy ?? false}>
                    {r?.busy ? "…" : "取り消す"}
                  </button>
                )}
              </div>
              <div className="history-body">
                {reasonsLabel(e.reasons)}
                {e.note && <span>・{e.note}</span>}
                {e.refPhotoIds.length > 0 && <span>・根拠の写真 {e.refPhotoIds.length} 枚</span>}
              </div>
              {r?.message && <p className="note">{r.message}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
