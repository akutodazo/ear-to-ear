"use client";

/**
 * 下から出るシート（#196。動かし方・… のまれな操作・送る絵の下見）。アカウントのシートと同じ形。
 * Esc と地の暗がりで閉じる。props だけで受け取る
 */
import { useEffect, type ReactNode } from "react";
import { IconClose } from "@/components/icons";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ title, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <button type="button" className="account-scrim" aria-label="閉じる" onClick={onClose} />
      <section className="account-sheet sheet" role="dialog" aria-label={title}>
        <header className="account-sheet-head">
          <p className="account-sheet-line">{title}</p>
          <button type="button" className="account-sheet-close" aria-label="閉じる" onClick={onClose}>
            <IconClose />
          </button>
        </header>
        {children}
      </section>
    </>
  );
}
