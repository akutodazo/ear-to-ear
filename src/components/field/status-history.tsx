"use client";

/**
 * 判断の履歴（docs/design/screen-spec.md §2-2 の「記録」）。新しい順。取り消したものも残し、取り消したと分かるように出す。
 * 取り消しは 2 段（DS §7-5）: 1 回目でボタンが「本当に取り消す（5 秒で戻ります）」に変わり、5 秒で戻る。2 回目で取り消す。
 * 各項目に statusAnchorId の id を付ける（引き継ぎメモの根拠の印から戻ってくる先）。props だけで受け取る
 */
import Image from "next/image";
import { useEffect, useState } from "react";
import type { StatusEvent } from "@/types";
import type { RevokeStatus } from "@/hooks/use-field-status";
import { statusAnchorId } from "@/services/handover-view";
import { jstDateTimeLabel, reasonsLabel, statusLabel } from "@/services/status-view";

const CONFIRM_MS = 5000;

function RevokeButton({ eventId, status, onRevoke }: { eventId: number; status: RevokeStatus | undefined; onRevoke: (id: number) => void }) {
  const [confirming, setConfirming] = useState(false);
  const busy = status?.busy ?? false;

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <button
      type="button"
      className={confirming ? "button button-small button-danger" : "button button-small"}
      disabled={busy}
      aria-busy={busy}
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
          return;
        }
        setConfirming(false);
        onRevoke(eventId);
      }}
    >
      {busy ? "取り消しています…" : confirming ? "本当に取り消す（5 秒で戻ります）" : "取り消す"}
    </button>
  );
}

export function StatusHistory({
  events,
  loading,
  message,
  revokeStatus,
  onRevoke,
}: {
  events: StatusEvent[];
  loading: boolean;
  message: string | null;
  revokeStatus: Record<number, RevokeStatus>;
  onRevoke: (eventId: number) => void;
}) {
  return (
    <section className="stack-tight">
      <h2 className="day-heading">判断の履歴</h2>
      {loading && events.length === 0 && <p className="note">読み込んでいます</p>}
      {message && <p className="note">{message}</p>}
      {events.length > 0 && (
        <ol className="stack-tight history-list">
          {events.map((event) => {
            const revoked = event.revokedAt !== null;
            const status = revokeStatus[event.id];
            return (
              <li key={event.id} id={statusAnchorId(String(event.id))} className={revoked ? "card card-revoked" : "card"}>
                <p>
                  <span className={revoked ? "badge" : event.status === "done" ? "badge badge-done" : "badge badge-pending"}>
                    {statusLabel(event.status)}
                  </span>{" "}
                  <span className="note">{jstDateTimeLabel(event.at)}</span>
                  {revoked && <span className="note"> （{jstDateTimeLabel(event.revokedAt ?? "")} に取り消し）</span>}
                </p>
                <p>理由: {reasonsLabel(event.reasons)}</p>
                {event.note !== null && <p>メモ: {event.note}</p>}
                {event.refPhotoIds.length > 0 && (
                  <div className="stack-tight">
                    <p className="note">根拠の写真 {event.refPhotoIds.length}枚（押すと開きます）</p>
                    <ul className="photo-grid">
                      {event.refPhotoIds.map((photoId, i) => {
                        const src = `/api/photo-files/${encodeURIComponent(photoId)}`;
                        return (
                          <li key={photoId}>
                            <a className="thumb" href={src} target="_blank" rel="noreferrer">
                              <Image src={src} alt={`根拠の写真 ${i + 1}`} fill sizes="(max-width: 600px) 33vw, 200px" />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {!revoked && <RevokeButton eventId={event.id} status={status} onRevoke={onRevoke} />}
                {status?.message && <p className="note">{status.message}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
