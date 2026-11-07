/**
 * 詳細の判断の段（#195）。今の判断の 1 行（右に「取り消す」、2 段）と、「収穫可能と判断」「収穫済と判断」の 2 ボタン。
 * 取り消しは主ボタンではなく記録の行に付ける（手袋で押し違えても記録が消えない）。props だけで受け取る
 */
"use client";

import { useEffect, useState } from "react";
import type { StatusEvent } from "@/types";

interface Props {
  line: string;
  /** 最新の判断の状態（印）。無ければ null */
  status: StatusEvent["status"] | null;
  loading: boolean;
  /** 取り消せる最新の判断。無ければ null */
  revocableId: number | null;
  revoking: boolean;
  onRevoke: (id: number) => void;
  /** 開いている入力の状態（押した側を選んでいる見た目に） */
  choosing: StatusEvent["status"] | null;
  onChoose: (status: StatusEvent["status"]) => void;
  /** 記録できた・取り消せたの 1 行 */
  result: { text: string; ok: boolean } | null;
}

const ARM_MS = 5000;

export function DecideBlock({ line, status, loading, revocableId, revoking, onRevoke, choosing, onChoose, result }: Props) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), ARM_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <section className="decide" aria-label="判断">
      <div className="decide-line">
        {loading ? (
          <span className="skeleton skeleton-line" aria-label="判断を読み込んでいます" />
        ) : (
          <p className={status ? "decide-text" : "decide-text decide-text-none"}>
            {status && <i className={`mark mark-${status} decide-mark`} aria-hidden="true" />}
            {line}
          </p>
        )}
        {revocableId !== null && (
          <button
            type="button"
            className={armed ? "decide-revoke decide-revoke-armed" : "decide-revoke"}
            disabled={revoking}
            aria-busy={revoking}
            onClick={() => {
              if (!armed) {
                setArmed(true);
                return;
              }
              setArmed(false);
              onRevoke(revocableId);
            }}
          >
            {revoking ? "取り消しています…" : armed ? "本当に取り消す" : "取り消す"}
            {armed && <span className="countdown" aria-hidden="true" />}
          </button>
        )}
      </div>
      {result && <p className={result.ok ? "decide-result decide-result-ok" : "decide-result"}>{result.text}</p>}
      <div className="decide-buttons">
        {(["ready", "done"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            className={choosing === kind ? "decide-button decide-button-on" : "decide-button"}
            aria-pressed={choosing === kind}
            onClick={() => onChoose(kind)}
          >
            <i className={`mark mark-${kind}`} aria-hidden="true" />
            <span className="decide-button-text">
              <span className="phrase">{kind === "ready" ? "収穫可能" : "収穫済"}</span>
              <wbr />
              <span className="phrase">と判断</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
