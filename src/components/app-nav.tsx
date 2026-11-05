/** 下の帯（地図／見比べる／刈る順番）。11-04 夜の本人決定で、画面はこの 3 つで切り替える。アイコン＋短い文字で、説明の文は付けない（11-05） */
import Link from "next/link";
import { IconCompare, IconMap, IconOrder } from "@/components/icons";

interface Props {
  current: "map" | "compare" | "order";
  /** 見比べるの行き先。無ければ押せない */
  compareHref: string | null;
  /** 刈る順番の行き先 */
  orderHref: string;
}

export function AppNav({ current, compareHref, orderHref }: Props) {
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
      <Link href={orderHref} className={cls("order")} aria-current={current === "order" ? "page" : undefined}>
        <IconOrder />
        刈る順番
      </Link>
    </nav>
  );
}
