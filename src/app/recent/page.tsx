import type { Metadata } from "next";
import benchmarksData from "@/data/benchmarks.json";
import fieldsData from "@/data/fields.json";
import { benchmarkFor } from "@/services/parcel-geometry";
import { appNavHrefs } from "@/services/app-nav-view";
import { SubPageHead } from "@/components/sub-page-head";
import { SubPageNav } from "@/components/sub-page-nav";
import { RecentClient } from "./recent-client";

export const metadata: Metadata = {
  title: "新着 — ear-to-ear",
};

/** 下の帯の詳細・比較の行き先（畑を選んでいないので、最初の地区の目安の畑） */
const NAV = appNavHrefs(benchmarkFor(benchmarksData, "2026", fieldsData[0].district) ?? fieldsData[0].id, null);

/** `/recent` は新着。配線だけ（AGENTS.md §4）。見出しは小さく、下の帯を出す（11-07 精査 6 回目 #3） */
export default function RecentPage() {
  return (
    <div className="sub-page">
      <main className="page">
        <SubPageHead title="新着" />
        <RecentClient />
      </main>
      <SubPageNav hrefs={NAV} />
    </div>
  );
}
