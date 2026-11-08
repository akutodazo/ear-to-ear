"use client";

/**
 * アカウント札（上の帯の右端、#194。西田 PM 11-07「委員長として入る → アカウント情報のように」）。
 * 人のアイコンに権限ごとの飾り（委員長＝王冠、委員＝くわ、一般＝なし、#218）と言葉を並べる。
 * 押すと下からシート: 今の役割・合言葉を入れる／入れ直す・出る（11-08）・管理者の入口・アプリの名前と架空の注記。props だけで受け取る
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Role } from "@/types";
import { accountView } from "@/services/app-nav-view";
import { IconClose } from "@/components/icons";
import { AccountAvatar } from "@/components/account-avatar";
import { PassphraseForm } from "@/components/upload/passphrase-form";

interface Props {
  role: Role | null | undefined;
  busy: boolean;
  message: string | null;
  onSignIn: (passphrase: string) => void;
  /** 出る（11-08） */
  onSignOut: () => void;
}

export function AccountChip({ role, busy, message, onSignIn, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const view = accountView(role);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`account-chip account-chip-${view.tier}${view.isAdmin ? " account-chip-admin" : ""}`}
        aria-label={`アカウント: ${view.line}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <AccountAvatar ornament={view.ornament} />
        {view.chip}
      </button>
      {open && (
        <>
          <button type="button" className="account-scrim" aria-label="閉じる" onClick={() => setOpen(false)} />
          <section className="account-sheet" aria-label="アカウント">
            <header className="account-sheet-head">
              <span className={`account-chip account-chip-${view.tier}${view.isAdmin ? " account-chip-admin" : ""}`} aria-hidden="true">
                <AccountAvatar ornament={view.ornament} />
                {view.chip}
              </span>
              <p className="account-sheet-line">{view.line}</p>
              <button type="button" className="account-sheet-close" aria-label="閉じる" onClick={() => setOpen(false)}>
                <IconClose />
              </button>
            </header>
            {view.signIn &&
              (asking ? (
                <PassphraseForm onSubmit={onSignIn} message={message} busy={busy} lead={view.signIn.lead} submitLabel={view.signIn.submit} />
              ) : (
                <button type="button" className="button button-block" onClick={() => setAsking(true)}>
                  {view.signIn.label}
                </button>
              ))}
            {/* 出られなかったときの文（入れ直しの欄を開いていないときだけ。開いていれば欄の中に出る） */}
            {!asking && message && <p className="note order-error">{message}</p>}
            {view.canSignOut && (
              <button type="button" className="account-sign-out" onClick={onSignOut} disabled={busy}>
                {busy ? "出ています…" : "この端末から出る"}
              </button>
            )}
            {view.isAdmin && (
              <nav className="account-links" aria-label="委員長の操作">
                <Link href="/recent#unconfirmed" onClick={() => setOpen(false)}>
                  新着の写真の番号を決める
                </Link>
              </nav>
            )}
            <footer className="account-sheet-foot">
              <span>ear-to-ear</span>
              <span>番号・名前・判断・順番は架空のもの（区画の形は公開の空中写真の畑）</span>
              <span>地図: 地理院タイル</span>
            </footer>
          </section>
        </>
      )}
    </>
  );
}
