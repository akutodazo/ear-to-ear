"use client";

/**
 * 刈る順番の下の固定の帯（#196）。主ボタンは 1 つだけ: 委員は「この順で保存」、委員長は「この順で確定」（2 段、5 秒で戻る）、
 * 確定した順のままなら「LINE で送る準備 → LINE で送る」。失敗だけボタンの上に 1 行。props だけで受け取る
 */
import { useEffect, useState } from "react";
import type { OrderBarAction } from "@/services/order-view";
import { IconCheck, IconShare } from "@/components/icons";

interface Props {
  action: OrderBarAction;
  busy: boolean;
  message: { text: string; ok: boolean } | null;
  onSave: () => void;
  onConfirm: () => void;
  share: {
    label: string;
    /** 押せるか（絵を描いている・URL を作っている間は押せない） */
    enabled: boolean;
    /** 共有の URL ができていて、端末の共有が無いときの代わり */
    href: string | null;
    onPress: () => void;
    note: string | null;
  };
}

export function OrderBar({ action, busy, message, onSave, onConfirm, share }: Props) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(timer);
  }, [armed]);
  if (action === "none") return null;
  const failed = message !== null && !message.ok;
  return (
    <div className="order-bar">
      {failed && <p className="order-bar-note">{message.text}</p>}
      {action === "confirm-disabled" && <p className="order-bar-note order-bar-hint">順位を 1 つ以上付けると確定できます</p>}
      {action === "share" && share.note && <p className="order-bar-note">{share.note}</p>}
      {action === "save" && (
        <button type="button" className="button button-primary button-block" onClick={onSave} disabled={busy} aria-busy={busy}>
          {busy ? "保存しています…" : "この順で保存"}
        </button>
      )}
      {action === "saved" && (
        <span className="button button-block order-bar-done" aria-disabled="true">
          <IconCheck />
          保存しました
        </span>
      )}
      {(action === "confirm" || action === "reconfirm" || action === "confirm-disabled") &&
        (armed ? (
          <div className="order-bar-armed">
            <button type="button" className="button order-bar-cancel" onClick={() => setArmed(false)}>
              やめる
            </button>
            <button
              type="button"
              className="button button-primary order-bar-go"
              disabled={busy}
              aria-busy={busy}
              onClick={() => {
                setArmed(false);
                onConfirm();
              }}
            >
              {busy ? "確定しています…" : "もう一度押すと確定"}
              <span className="countdown" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button type="button" className="button button-primary button-block" disabled={action === "confirm-disabled" || busy} onClick={() => setArmed(true)}>
            {action === "reconfirm" ? "確定し直す" : "この順で確定"}
          </button>
        ))}
      {action === "share" &&
        (share.href ? (
          <a className="button button-primary button-block" href={share.href} target="_blank" rel="noreferrer">
            <IconShare />
            {share.label}
          </a>
        ) : (
          <button type="button" className="button button-primary button-block" disabled={!share.enabled} onClick={share.onPress}>
            <IconShare />
            {share.label}
          </button>
        ))}
    </div>
  );
}
