/** 下の帯（地図／見比べる／刈る順番）。11-04 夜の本人決定で、画面はこの 3 つで切り替える。アイコン＋短い文字で、説明の文は付けない（11-05） */
import Link from "next/link";
import { IconCompare, IconMap, IconOrder } from "@/components/icons";

interface Props {
  current: "map" | "compare" | "order";
  /** 選んでいる圃場。無ければ「見比べる」は押せない */
  compareHref: string | null;
}

export function AppNav({ current, compareHref }: Props) {
  const cls = (key: Props["current"]) => (current === key ? "app-nav-item app-nav-current" : "app-nav-item");
  return (
    <nav className="app-nav" aria-label="画面の切り替え">
      <Link href="/" className={cls("map")} aria-current={current === "map" ? "page" : undefined}>
        <IconMap />
        地図
      </Link>
      {compareHref ? (
        <Link href={compareHref} className={cls("compare")} aria-current={current === "compare" ? "page" : undefined}>
          <IconCompare />
          見比べる
        </Link>
      ) : (
        <span className="app-nav-item app-nav-disabled" aria-disabled="true">
          <IconCompare />
          見比べる
        </span>
      )}
      <span className="app-nav-item app-nav-disabled" aria-disabled="true">
        <IconOrder />
        刈る順番
      </span>
    </nav>
  );
}
