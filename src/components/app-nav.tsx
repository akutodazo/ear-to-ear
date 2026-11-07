/**
 * 下の帯（地図／詳細／比較／順番、#194。西田 PM 11-07「4 つ。それぞれがメインになるように」）。
 * 4 つは同じ畑を引き継ぐ（行き先は services/app-nav-view）。アイコン＋短い文字で、説明の文は付けない（11-05）。
 * デモで今日を差し替えているときは、帯の上に「7/20 として表示中（デモ）×」を出す（精査 4 回目 #5）
 */
import Link from "next/link";
import type { AppNavHrefs } from "@/services/app-nav-view";
import { IconCalendar, IconClose, IconCompare, IconDetail, IconMap, IconOrder } from "@/components/icons";

export type AppNavKey = keyof AppNavHrefs;

interface Props {
  /** 今の画面。送る・新着のように 4 つのどれでもない画面は null（11-07 精査 6 回目 #3） */
  current: AppNavKey | null;
  hrefs: AppNavHrefs;
  /** デモで今日を差し替えているとき。言葉と外す操作 */
  demoDate?: { label: string; onClear: () => void } | null;
  /** 同じ画面の中で切り替えるとき（詳細と比較）。true を返したら遷移しない */
  onPick?: (key: AppNavKey) => boolean;
}

const ITEMS: { key: AppNavKey; label: string; Icon: typeof IconMap }[] = [
  { key: "map", label: "地図", Icon: IconMap },
  { key: "detail", label: "詳細", Icon: IconDetail },
  { key: "compare", label: "比較", Icon: IconCompare },
  { key: "order", label: "順番", Icon: IconOrder },
];

export function AppNav({ current, hrefs, demoDate = null, onPick }: Props) {
  return (
    <>
      {demoDate && (
        <div className="demo-date" role="status">
          <IconCalendar />
          {demoDate.label}
          <button type="button" className="demo-date-clear" onClick={demoDate.onClear} aria-label="日付の差し替えをやめる">
            <IconClose />
          </button>
        </div>
      )}
      <nav className="app-nav" aria-label="画面の切り替え">
        {ITEMS.map(({ key, label, Icon }) => (
          <Link
            key={key}
            href={hrefs[key]}
            className={current === key ? "app-nav-item app-nav-current" : "app-nav-item"}
            aria-current={current === key ? "page" : undefined}
            onClick={(e) => {
              if (onPick?.(key)) e.preventDefault();
            }}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
