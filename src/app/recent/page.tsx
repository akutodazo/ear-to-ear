import type { Metadata } from "next";
import Link from "next/link";
import { RecentClient } from "./recent-client";

export const metadata: Metadata = {
  title: "新着 — ear-to-ear",
};

export default function RecentPage() {
  return (
    <main className="page">
      <Link className="back-link" href="/">
        ← トップへ
      </Link>
      <h1>新着</h1>
      <RecentClient />
    </main>
  );
}
