/**
 * 写真を送るの下のボタン（みっきぃ 1、#214）。押すボタンは「送る（n枚）」の 1 つだけ。純粋関数。
 * 合言葉は最初に聞かない（K1）。送って「合言葉が要る」と返った後は、欄に入れて同じボタンを押すと、確かめてから送る
 */
export interface UploadActionInput {
  needsPassphrase: boolean;
  passphrase: string;
  sending: boolean;
  loggingIn: boolean;
  sendableCount: number;
  progressLabel: string | null;
}

export interface UploadActionView {
  label: string;
  disabled: boolean;
  /** send はそのまま送る。login-then-send は合言葉を確かめ、合っていれば送る */
  step: "send" | "login-then-send";
}

export function uploadActionView(input: UploadActionInput): UploadActionView | null {
  const { needsPassphrase, passphrase, sending, loggingIn, sendableCount, progressLabel } = input;
  if (sendableCount === 0 && !sending) return null;
  const step = needsPassphrase ? "login-then-send" : "send";
  if (sending) return { label: progressLabel ?? "送っています…", disabled: true, step };
  if (loggingIn) return { label: "確かめています…", disabled: true, step };
  return { label: `送る（${sendableCount}枚）`, disabled: needsPassphrase && passphrase.trim() === "", step };
}
