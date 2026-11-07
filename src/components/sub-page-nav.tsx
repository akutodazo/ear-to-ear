"use client";

/**
 * 送る・新着の下の帯（11-07 精査 6 回目 #3）。地図・比較・順番の 3 つの画面と同じ帯を出し、どれも選んでいない形にする。
 * 行き先は親（page）が決めて渡す。AppNav は押したときの処理を持つので、ここでブラウザの部品にする。props だけで受け取る
 */
import { AppNav } from "@/components/app-nav";
import type { AppNavHrefs } from "@/services/app-nav-view";

export function SubPageNav({ hrefs }: { hrefs: AppNavHrefs }) {
  return <AppNav current={null} hrefs={hrefs} />;
}
