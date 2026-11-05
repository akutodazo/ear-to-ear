/**
 * 地図の上に出る、選んだ圃場の板（11-05 のデザインの引き継ぎ: 畑を押すと最新の写真が出る）。
 * 左に最新の写真、右に番号・名前・判断・目安。下は「目安の畑と見比べる」への入口。props だけで受け取る
 */
import Image from "next/image";
import Link from "next/link";
import type { Field } from "@/types";
import type { ParcelAppearance } from "@/services/parcel-geometry";
import { takenAtLabel } from "@/services/photo-labels";
import type { LatestPhotoState } from "@/hooks/use-latest-photo";

interface Props {
  field: Field;
  appearance: ParcelAppearance;
  /** 判断の文（「可 7/21」「未確認」「判断を読み込んでいます」など。親が決める） */
  statusLine: string;
  latest: LatestPhotoState;
  onClose: () => void;
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

export function SelectionDock({ field, appearance, statusLine, latest, onClose }: Props) {
  const photo = latest.kind === "ok" ? latest.photo : null;
  return (
    <section className="dock" aria-label="選んだ圃場">
      <div className="dock-body">
        <div className="dock-photo" aria-hidden={photo === null ? "true" : undefined}>
          {photo ? (
            <Image src={`/api/photo-files/${encodeURIComponent(photo.id)}`} alt={`${field.id} の最新の写真`} fill sizes="96px" />
          ) : (
            <span className="dock-photo-empty">{latest.kind === "ok" ? "写真なし" : "…"}</span>
          )}
        </div>
        <div className="dock-text">
          <div className="dock-title">
            <span className="dock-id">{field.id}</span> {field.name}
            {appearance.benchmark && <span className="dock-benchmark">目安の畑</span>}
          </div>
          <div className="dock-status">
            {statusLine}
            {appearance.unconfirmed && "・未確定の写真あり"}
          </div>
          <div className="dock-photo-line">{photoLine(latest)}</div>
        </div>
        <button type="button" className="dock-close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
      </div>
      <Link className="button button-primary button-block" href={`/fields/${field.id}`}>
        {appearance.benchmark ? "この畑の写真を見る" : "目安の畑と見比べる"}
      </Link>
    </section>
  );
}
