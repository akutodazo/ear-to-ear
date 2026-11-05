/** 下の帯（地図／見比べる／刈る順番）。11-04 夜の本人決定で、画面はこの 3 つで切り替える。説明の文は付けない（11-05） */
import Link from "next/link";

interface Props {
  current: "map" | "compare" | "order";
  /** 選んでいる圃場。無ければ「見比べる」は押せない */
  compareHref: string | null;
}

export function AppNav({ current, compareHref }: Props) {
  return (
    <nav className="app-nav" aria-label="画面の切り替え">
      <Link href="/" className={current === "map" ? "app-nav-item app-nav-current" : "app-nav-item"} aria-current={current === "map" ? "page" : undefined}>
        地図
      </Link>
      {compareHref ? (
        <Link href={compareHref} className={current === "compare" ? "app-nav-item app-nav-current" : "app-nav-item"} aria-current={current === "compare" ? "page" : undefined}>
          見比べる
        </Link>
      ) : (
        <span className="app-nav-item app-nav-disabled" aria-disabled="true">
          見比べる
        </span>
      )}
      <span className="app-nav-item app-nav-disabled" aria-disabled="true">
        刈る順番
      </span>
    </nav>
  );
}
