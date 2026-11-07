"use client";

/**
 * アカウント札（上の帯の右端、#194。西田 PM 11-07「委員長として入る → アカウント情報のように」）。
 * 押すと下からシート: 今の役割・委員長として入る・管理者の入口・アプリの名前と架空の注記。props だけで受け取る
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Role } from "@/types";
import { accountView } from "@/services/app-nav-view";
import { IconClose } from "@/components/icons";
import { PassphraseForm } from "@/components/upload/passphrase-form";

interface Props {
  role: Role | null | undefined;
  busy: boolean;
  message: string | null;
  onSignIn: (passphrase: string) => void;
}

export function AccountChip({ role, busy, message, onSignIn }: Props) {
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
        className={view.isAdmin ? "account-chip account-chip-admin" : "account-chip"}
        aria-label={`アカウント: ${view.line}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {view.chip}
      </button>
      {open && (
        <>
          <button type="button" className="account-scrim" aria-label="閉じる" onClick={() => setOpen(false)} />
          <section className="account-sheet" aria-label="アカウント">
            <header className="account-sheet-head">
              <span className={view.isAdmin ? "account-chip account-chip-admin" : "account-chip"} aria-hidden="true">
                {view.chip}
              </span>
              <p className="account-sheet-line">{view.line}</p>
              <button type="button" className="account-sheet-close" aria-label="閉じる" onClick={() => setOpen(false)}>
                <IconClose />
              </button>
            </header>
            {view.canSignInAsChair &&
              (asking ? (
                <PassphraseForm onSubmit={onSignIn} message={message} busy={busy} lead="委員長の合言葉を入れてください。" submitLabel="委員長として入る" />
              ) : (
                <button type="button" className="button button-block" onClick={() => setAsking(true)}>
                  委員長として入る
                </button>
              ))}
            {view.isAdmin && (
              <nav className="account-links" aria-label="委員長の操作">
                <Link href="/recent#unconfirmed" onClick={() => setOpen(false)}>
                  新着の写真の番号を決める
                </Link>
              </nav>
            )}
            <footer className="account-sheet-foot">
              <span>ear-to-ear</span>
              <span>区画の形・番号・判断・順番は架空のもの</span>
              <span>地図: 地理院タイル</span>
            </footer>
          </section>
        </>
      )}
    </>
  );
}
