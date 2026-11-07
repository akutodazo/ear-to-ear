/**
 * 送る・新着の見出し（11-07 精査 6 回目 #3）。大見出しと「← トップへ」をやめ、詳細の画面と同じ大きさの題と「地図」への戻り口にする。
 * props だけで受け取る
 */
import Link from "next/link";
import { IconMap } from "@/components/icons";

export function SubPageHead({ title, mapHref = "/" }: { title: string; mapHref?: string }) {
  return (
    <header className="sub-page-head">
      <Link href={mapHref} className="topbar-back">
        <IconMap />
        地図
      </Link>
      <h1 className="sub-page-title">{title}</h1>
    </header>
  );
}
