/**
 * 詳細の順番の段（#195）。順位の丸・「刈る順番 2 番目」・下書きか確定か、右に「外す／順位を付ける」。
 * 押すと順番の一覧へ。人の判断の段とは線で分ける。props だけで受け取る
 */
import Link from "next/link";
import type { RankLineView } from "@/services/detail-view";
import { IconChevron } from "@/components/icons";

interface Props {
  view: RankLineView | null;
  rank: number | null;
  href: string;
  loading: boolean;
  failed: boolean;
  onToggle: () => void;
}

export function RankLine({ view, rank, href, loading, failed, onToggle }: Props) {
  return (
    <section className="rank-line" aria-label="刈る順番">
      {failed ? (
        <p className="rank-line-sub">順番を読み込めませんでした</p>
      ) : loading || view === null ? (
        <span className="skeleton skeleton-line" aria-label="順番を読み込んでいます" />
      ) : (
        <>
          <span className={`rank rank-line-ring rank-line-ring-${view.ring}`} aria-hidden="true">
            {rank ?? ""}
          </span>
          <Link className="rank-line-link" href={href}>
            <span className="rank-line-title">{view.title}</span>
            {view.sub && <span className="rank-line-sub">{view.sub}</span>}
            <IconChevron className="rank-line-chevron" />
          </Link>
          <button type="button" className="rank-line-action" onClick={onToggle}>
            {view.action}
          </button>
        </>
      )}
    </section>
  );
}
