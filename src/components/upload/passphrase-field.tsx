"use client";

/**
 * 写真を送るの合言葉の欄（みっきぃ 1、#214）。欄だけで、押すボタンは下の「送る（n枚）」1 つ。Enter でも同じ動き。
 * 違うときは欄の枠と下の文を赤にし、印（!）と言葉でも伝える（色だけに頼らない）。出たら画面の中へ動かして欄にカーソルを置く。props だけで受け取る
 */
import { useEffect, useId, useRef } from "react";
import { IconAlert } from "@/components/icons";
import { PhrasedText } from "@/components/upload/phrased-text";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  message: string | null;
  busy: boolean;
}

export function PassphraseField({ value, onChange, onSubmit, message, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const messageId = useId();

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // 違うと言われたら、欄を選び直して打ち直しやすくする
  useEffect(() => {
    if (message) inputRef.current?.select();
  }, [message]);

  const invalid = message !== null && !busy;
  return (
    <form
      ref={formRef}
      className="passphrase-field"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit();
      }}
    >
      <label className="passphrase-field-label" htmlFor={`${messageId}-input`}>
        合言葉
      </label>
      <p className="passphrase-field-lead">
        <PhrasedText text="送るには合言葉が要ります。入れてから、下の「送る」を押してください。" />
      </p>
      <input
        id={`${messageId}-input`}
        ref={inputRef}
        className={invalid ? "input passphrase-field-input passphrase-field-invalid" : "input passphrase-field-input"}
        type="password"
        autoComplete="current-password"
        enterKeyHint="send"
        disabled={busy}
        value={value}
        aria-invalid={invalid}
        aria-describedby={invalid ? messageId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {invalid && (
        <p id={messageId} className="passphrase-field-error" role="alert">
          <IconAlert />
          {message}
        </p>
      )}
    </form>
  );
}
