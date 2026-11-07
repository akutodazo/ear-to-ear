/**
 * 地図の上に出る、選んだ圃場の板（11-05 のデザインの引き継ぎ: 畑を押すと最新の写真が出る）。
 * 左に最新の写真、右に番号・名前・判断（地図と同じ印＋言葉）・目安。昨年の判断の頃なら、昨年の引き継ぎへの 1 行の入口（5 段目。
 * 文は出さない: 途中で切れる・今年の判断と同じ形で並ぶため。精査 4 回目 #2）。
 * 下は「目安の畑と見比べる」への入口。props だけで受け取る
 */
import Image from "next/image";
import Link from "next/link";
import type { Field } from "@/types";
import type { ParcelAppearance } from "@/services/parcel-geometry";
import { takenAtLabel } from "@/services/photo-labels";
import type { LatestPhotoState } from "@/hooks/use-latest-photo";
import { IconCalendar, IconClose, IconDetail, IconPhoto } from "@/components/icons";

interface Props {
  field: Field;
  appearance: ParcelAppearance;
  /** 判断の文（「可 7/21」「未確認」「判断を読み込んでいます」など。親が決める） */
  statusLine: string;
  latest: LatestPhotoState;
  /** 下のボタンの文言（地区に目安があるかで親が決める。精査 #3） */
  compareLabel: string;
  /** 昨年の引き継ぎ（昨年の判断の頃だけ）。年と、見比べるの全文への行き先。無ければ null */
  lastSeasonMemo?: { season: string; href: string } | null;
  /** 板の高さを親が測るため（選んだ畑を隠さない余白。精査 4 回目 #1） */
  ref?: React.Ref<HTMLElement>;
  onClose: () => void;
}

/** 地図では塗りだけだが、板は凡例が見えないので言葉で言う。日付は「いつ判断したか」と分かる形に（精査 #8） */
const STATUS_WORD = { ready: "収穫可能", done: "収穫済" } as const;

function statusText(appearance: ParcelAppearance, statusLine: string): string {
  // 未確認は「まだ無い」と言う（印の四角は押せる欄に見えるので出さない。精査 #7）。読み込み中などの文はそのまま
  if (appearance.fill === "none") return statusLine === "未確認" ? "判断はまだありません" : statusLine;
  const date = statusLine.split(" ")[1];
  return date ? `${date}に${STATUS_WORD[appearance.fill]}と判断` : STATUS_WORD[appearance.fill];
}

function photoLine(latest: LatestPhotoState): string {
  switch (latest.kind) {
    case "idle":
    case "loading":
      return "写真を読み込んでいます";
    case "error":
      return "写真を読み込めませんでした";
    case "ok":
      if (latest.photo === null) return "まだ確定した写真はありません";
      // 年も出す（昨年の写真を今年の様子と見せない）。短く 1 行に収める
      return `${takenAtLabel(latest.photo.takenAt)}・${latest.count} 枚`;
  }
}

export function SelectionDock({ field, appearance, statusLine, latest, compareLabel, lastSeasonMemo = null, ref, onClose }: Props) {
  const photo = latest.kind === "ok" ? latest.photo : null;
  return (
    <section ref={ref} className="dock" aria-label="選んだ圃場">
      <div className="dock-body">
        <Link href={`/fields/${field.id}`} className="dock-photo" aria-label={photo ? `${field.id} の写真を見る` : undefined} aria-hidden={photo === null ? "true" : undefined} tabIndex={photo === null ? -1 : undefined}>
          {photo ? (
            <Image src={`/api/photo-files/${encodeURIComponent(photo.id)}`} alt="" fill sizes="96px" />
          ) : (
            <span className="dock-photo-empty">
              <IconPhoto />
              {latest.kind === "ok" ? "写真なし" : ""}
            </span>
          )}
        </Link>
        <div className="dock-text">
          <div className="dock-title">
            <span className="dock-id">{field.id}</span> {field.name}
            {appearance.benchmark && (
              <span className="dock-benchmark">
                <i className="mark mark-benchmark" aria-hidden="true" />
                目安の畑
              </span>
            )}
          </div>
          <div className={appearance.fill === "none" ? "dock-status dock-status-none" : "dock-status"}>
            {appearance.fill !== "none" && <i className={`mark mark-${appearance.fill}`} aria-hidden="true" />}
            {statusText(appearance, statusLine)}
            {appearance.unconfirmed && (
              // 委員長が番号を確定する新着へ（未確定だけを見る形で開く。精査 5 回目 #1）
              <Link className="dock-unconfirmed" href="/recent#unconfirmed">
                <i className="map-label-dot" aria-hidden="true" />
                未確定の写真あり ›
              </Link>
            )}
          </div>
          <div className="dock-photo-line">
            <IconPhoto />
            {photoLine(latest)}
          </div>
        </div>
        <button type="button" className="dock-close" onClick={onClose} aria-label="閉じる">
          <IconClose />
        </button>
      </div>
      {lastSeasonMemo && (
        <Link className="dock-last-memo" href={lastSeasonMemo.href}>
          <IconCalendar />
          昨年の引き継ぎ（{lastSeasonMemo.season}年）あり
          <span className="dock-last-memo-arrow" aria-hidden="true">›</span>
        </Link>
      )}
      <Link className="button button-primary button-block" href={`/fields/${field.id}`}>
        <IconDetail />
        {compareLabel}
      </Link>
    </section>
  );
}
