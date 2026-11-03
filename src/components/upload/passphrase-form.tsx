"use client";

/** 合言葉の入力（送って「合言葉が要る」と返ったときだけ出す）。props だけで受け取る */
import { useState } from "react";

export function PassphraseForm({
  onSubmit,
  message,
}: {
  onSubmit: (passphrase: string) => void;
  message: string | null;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="panel stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <p>送るには合言葉が要ります。入れると、そのまま送り直します。</p>
      <label className="stack-tight">
        合言葉
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      {message && <p className="note">{message}</p>}
      <button type="submit" className="button">
        入って送る
      </button>
    </form>
  );
}
