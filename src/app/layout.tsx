import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ear-to-ear — 穂から穂へ、写真と判断をつなぐ",
  description:
    "小麦収穫委員会の写真共有。委員が写真を送るだけで圃場番号の候補と撮影日が付いて共有され、判断とその理由を根拠付きで残す。",
};

/** ブラウザの上の帯の色をブランドの濃い緑に（globals.css の --brand と同じ。11-04 夜の本人決定） */
export const viewport: Viewport = {
  themeColor: "#2d6441",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
