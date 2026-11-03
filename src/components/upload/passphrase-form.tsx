"use client";

/**
 * 合言葉の入力（送って「合言葉が要る」と返ったとき、管理者が入るときだけ出す）。props だけで受け取る。
 * 出たときに画面の中へ動かして入力欄にカーソルを置く（押した場所から離れた所に出ても気付けるように）
 */
import { useEffect, useRef, useState } from "react";

export function PassphraseForm({
  onSubmit,
  message,
  lead = "送るには合言葉が要ります。入れると、そのまま送り直します。",
  submitLabel = "入って送る",
  busy = false,
}: {
  onSubmit: (passphrase: string) => void;
  message: string | null;
  /** 合言葉を確かめている間。押せなくして「確かめています…」（Issue #69） */
  busy?: boolean;
  lead?: string;
  submitLabel?: string;
}) {
  const [value, setValue] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <form
      ref={formRef}
      className="panel stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit(value);
      }}
    >
      <p>{lead}</p>
      <label className="stack-tight">
        合言葉
        <input
          ref={inputRef}
          className="input"
          type="password"
          autoComplete="current-password"
          disabled={busy}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      {message && !busy && <p className="note note-alert">{message}</p>}
      <button type="submit" className="button button-primary" disabled={busy} aria-busy={busy}>
        {busy ? "確かめています…" : submitLabel}
      </button>
    </form>
  );
}
