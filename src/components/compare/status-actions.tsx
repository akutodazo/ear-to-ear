/**
 * 判断を書いている間だけ、画面の下（下の帯の上）に出る「記録する」の帯（精査 #4）。
 * 判断を選び、根拠の写真を選ぶまで押せない（写真が無い畑を除く。Issue #182）。根拠の枚数はボタンの横に出し、
 * 押せない理由があるときだけ 1 行で添える。props だけで受け取る
 */
interface Props {
  refCount: number;
  canSubmit: boolean;
  /** 押せない理由（無ければ null） */
  hint: string | null;
  submitting: boolean;
  message: { text: string; ok: boolean } | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function StatusActions({ refCount, canSubmit, hint, submitting, message, onSubmit, onCancel }: Props) {
  return (
    <div className="status-actions" role="group" aria-label="判断を記録する">
      {message && !message.ok && <p className="note status-actions-message">{message.text}</p>}
      {hint && !(message && !message.ok) && <p className="note status-actions-message">{hint}</p>}
      <div className="status-actions-row">
        <button type="button" className="button" onClick={onCancel} disabled={submitting}>
          やめる
        </button>
        <button type="button" className="button button-primary status-actions-submit" onClick={onSubmit} disabled={submitting || !canSubmit}>
          {submitting ? "送っています…" : "記録する"}
          <span className="status-actions-refs">根拠 {refCount} 枚</span>
        </button>
      </div>
    </div>
  );
}
