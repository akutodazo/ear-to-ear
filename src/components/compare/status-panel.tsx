"use client";

/**
 * 判断を残す（L1。11-05 に見比べるの中へ）。収穫可能／収穫済、理由（複数）、短いメモ、根拠の写真（写真の下で選ぶ）。
 * 送って合言葉が要ると返ったときだけ合言葉を聞く。props だけで受け取る（状態は useFieldStatus）
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
  onCancel: () => void;
  submitting: boolean;
  message: { text: string; ok: boolean } | null;
  needsPassphrase: boolean;
  loginMessage: string | null;
  loggingIn: boolean;
  onLogin: (passphrase: string) => void;
}

export function StatusPanel({
  draft,
  onChooseStatus,
  onToggleReason,
  onNote,
  onSubmit,
  onCancel,
  submitting,
  message,
  needsPassphrase,
  loginMessage,
  loggingIn,
  onLogin,
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
      <p className="note">根拠の写真: {draft.refPhotoIds.length} 枚（下の写真の「根拠にする」で選ぶ）</p>
      <div className="row">
        <button type="submit" className="button button-primary" disabled={submitting || draft.status === null}>
          {submitting ? "送っています…" : "記録する"}
        </button>
        <button type="button" className="button" onClick={onCancel} disabled={submitting}>
          やめる
        </button>
      </div>
      {message && <p className={message.ok ? "note note-ok" : "note"}>{message.text}</p>}
      {needsPassphrase && <PassphraseForm onSubmit={onLogin} message={loginMessage} lead="判断を残すには合言葉が要ります。入れたら、もう一度「記録する」を押してください。" submitLabel="入る" busy={loggingIn} />}
    </form>
  );
}
