"use client";

/**
 * 判断を残す（L1。11-05 に見比べるの中へ）。収穫可能／収穫済、理由（複数）、短いメモ。根拠の写真は下の写真で選び、
 * 「記録する」は画面の下の帯（status-actions）に置く（精査 #4）。送って合言葉が要ると返ったときだけ合言葉を聞く。props だけで受け取る
 */
import type { StatusEvent } from "@/types";
import { STATUS_NOTE_MAX_CHARS, STATUS_REASONS, type StatusReasonCode } from "@/config";
import type { StatusDraft } from "@/hooks/use-field-status";
import { PassphraseForm } from "@/components/upload/passphrase-form";

interface Props {
  draft: StatusDraft;
  onChooseStatus: (status: StatusEvent["status"]) => void;
  onToggleReason: (code: StatusReasonCode) => void;
  onNote: (note: string) => void;
  onSubmit: () => void;
  needsPassphrase: boolean;
  loginMessage: string | null;
  loggingIn: boolean;
  onLogin: (passphrase: string) => void;
  /** 状態を外の 2 ボタンで選ぶとき（詳細、#195）は false。中の選択を出さない */
  showStatusChoice?: boolean;
}

export function StatusPanel({
  draft,
  onChooseStatus,
  onToggleReason,
  onNote,
  onSubmit,
  needsPassphrase,
  loginMessage,
  loggingIn,
  onLogin,
  showStatusChoice = true,
}: Props) {
  return (
    <form
      className="status-panel"
      aria-label="判断を残す"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {showStatusChoice && (
        <div className="status-choice" role="group" aria-label="判断">
          <button type="button" className={draft.status === "ready" ? "choice choice-on" : "choice"} aria-pressed={draft.status === "ready"} onClick={() => onChooseStatus("ready")}>
            <i className="mark mark-ready" aria-hidden="true" />
            収穫可能
          </button>
          <button type="button" className={draft.status === "done" ? "choice choice-on" : "choice"} aria-pressed={draft.status === "done"} onClick={() => onChooseStatus("done")}>
            <i className="mark mark-done" aria-hidden="true" />
            収穫済
          </button>
        </div>
      )}
      {!showStatusChoice && <p className="status-group-head">理由（いくつでも。無くても残せます）</p>}
      <div className="reasons" role="group" aria-label="理由（いくつでも）">
        {STATUS_REASONS.map((r) => {
          const on = draft.reasons.includes(r.code);
          return (
            <button key={r.code} type="button" className={on ? "reason reason-on" : "reason"} aria-pressed={on} onClick={() => onToggleReason(r.code)}>
              {r.label}
            </button>
          );
        })}
      </div>
      <label className="stack-tight">
        <span className="note">メモ（{STATUS_NOTE_MAX_CHARS} 字まで、任意）</span>
        <input className="input" value={draft.note} maxLength={STATUS_NOTE_MAX_CHARS} onChange={(e) => onNote(e.target.value)} />
      </label>
      {needsPassphrase && <PassphraseForm onSubmit={onLogin} message={loginMessage} lead="判断を残すには合言葉が要ります。入れたら、もう一度「記録する」を押してください。" submitLabel="入る" busy={loggingIn} />}
    </form>
  );
}
