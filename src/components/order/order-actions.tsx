"use client";

/**
 * 刈る順番の状態と操作（11-05、3 段目）。下書きか確定か・確定した順と違うか、を印と短い文で。
 * 「保存」は誰でも、「確定する」は委員長だけ（委員には最初から出さない）。確定・記録に戻すは 2 段。props だけで受け取る
 */
import { useState, type ReactNode } from "react";
import type { SavedOrder } from "@/repositories/interfaces/i-harvest-order-repository";
import { monthDayJst } from "@/services/parcel-geometry";

interface Props {
  saved: SavedOrder | null;
  dirty: boolean;
  differsFromConfirmed: boolean;
  canConfirm: boolean;
  /** 委員長でない端末（役割を読み終えたとき）。確定の代わりに入り方を出す（精査 5 回目 #2） */
  needsChair?: boolean;
  onOpenLogin?: () => void;
  busy: boolean;
  message: { text: string; ok: boolean } | null;
  hasRanked: boolean;
  onSave: () => void;
  onConfirm: () => void;
  onRevert: () => void;
  onReset: () => void;
  /** 確定した順のすぐ下に出すもの（LINE に送る。11-06 本人の指示: 共有が分かりにくいので確定の横へ） */
  share?: ReactNode;
}

export function OrderActions({ saved, dirty, differsFromConfirmed, canConfirm, needsChair = false, busy, message, hasRanked, onSave, onConfirm, onRevert, onReset, share }: Props) {
  const [asking, setAsking] = useState<"confirm" | "reset" | null>(null);
  const confirmed = saved?.state === "confirmed";
  const state = confirmed
    ? differsFromConfirmed
      ? { tone: "warn", text: `${monthDayJst(saved.confirmedAt ?? saved.savedAt)} に確定した順と違います` }
      : { tone: "ok", text: `${monthDayJst(saved.confirmedAt ?? saved.savedAt)} に確定した順` }
    : dirty
      ? // 並べ途中は変えるたびに端末に残す（画面を移っても消えない。11-06 地図の精査 #2）。「保存」はまだ
        { tone: "draft", text: "並べ途中（この端末に残しています。保存はまだ）" }
      : saved
        ? { tone: "draft", text: `下書き（${monthDayJst(saved.savedAt)} に保存）` }
        : { tone: "draft", text: "記録から並べた下書き" };

  return (
    <section className="order-actions" aria-label="刈る順番の状態">
      <p className={`order-state order-state-${state.tone}`}>
        <span className={confirmed && !differsFromConfirmed ? "rank rank-confirmed rank-small" : "rank rank-small"} aria-hidden="true" />
        {state.text}
      </p>
      {/* 結果の文は印のすぐ下（LINE の欄の下に押し出さない） */}
      {message && <p className={message.ok ? "note note-ok" : "note order-error"}>{message.text}</p>}
      {share}
      {asking === null ? (
        <div className="order-buttons">
          {(dirty || !saved) && (
            <button type="button" className="button button-small" onClick={onSave} disabled={busy}>
              {busy ? "保存しています…" : "保存"}
            </button>
          )}
          {differsFromConfirmed && (
            <button type="button" className="button button-small" onClick={onRevert} disabled={busy}>
              確定した順に戻す
            </button>
          )}
          {canConfirm && hasRanked && (!confirmed || differsFromConfirmed) && (
            <button type="button" className="button button-primary button-small" onClick={() => setAsking("confirm")} disabled={busy}>
              {confirmed ? "確定し直す" : "この順で確定"}
            </button>
          )}
          {needsChair && hasRanked && <p className="order-chair note">確定は委員長だけ。右上の札から入れます</p>}
          <button type="button" className="order-reset" onClick={() => setAsking("reset")} disabled={busy}>
            記録から並べ直す
          </button>
        </div>
      ) : (
        <div className="order-buttons order-ask" role="group" aria-label={asking === "confirm" ? "確定の確認" : "並べ直しの確認"}>
          <span className="order-ask-text">{asking === "confirm" ? "この順で確定しますか" : "並べた順を消して、記録から並べ直しますか"}</span>
          <button
            type="button"
            className="button button-primary button-small"
            onClick={() => {
              setAsking(null);
              if (asking === "confirm") onConfirm();
              else onReset();
            }}
          >
            {asking === "confirm" ? "確定する" : "並べ直す"}
          </button>
          <button type="button" className="button button-small" onClick={() => setAsking(null)}>
            やめる
          </button>
        </div>
      )}
    </section>
  );
}
