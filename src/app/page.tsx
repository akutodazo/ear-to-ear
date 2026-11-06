import type { Metadata } from "next";
import { HomeClient } from "./home-client";

export const metadata: Metadata = {
  title: "畑の地図 — ear-to-ear",
};

/** `/` は地図（L1）。配線だけ（AGENTS.md §4） */
export default function Home() {
  return (
    <main className="home-main">
      <HomeClient />
    </main>
  );
}
