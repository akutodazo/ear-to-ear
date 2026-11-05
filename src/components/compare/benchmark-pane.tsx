/**
 * 見比べるの上に固定する「目安の畑」（11-05）。目安の最新の写真を大きく、下に番号・名前・撮影日。
 * この畑が目安なら、そう言うだけ。地区に目安が無ければ、無いと言う。props だけで受け取る
 */
import Image from "next/image";
import type { Field } from "@/types";
import type { LatestPhotoState } from "@/hooks/use-latest-photo";
import { takenAtLabel } from "@/services/photo-labels";
import { IconPhoto } from "@/components/icons";

export type BenchmarkPaneProps =
  | { kind: "none" }
  | { kind: "self"; field: Field }
  | { kind: "other"; field: Field; latest: LatestPhotoState };

export function BenchmarkPane(props: BenchmarkPaneProps) {
  if (props.kind === "none") {
    return (
      <div className="bench bench-band" role="note">
        この地区の目安の畑はまだ決まっていません
      </div>
    );
  }
  if (props.kind === "self") {
    return (
      <div className="bench bench-band" role="note">
        <i className="mark mark-benchmark" aria-hidden="true" />
        この畑が目安の畑（ほかの畑と見比べる基準）
      </div>
    );
  }
  const { field, latest } = props;
  const photo = latest.kind === "ok" ? latest.photo : null;
  return (
    <section className="bench" aria-label="目安の畑">
      <div className="bench-photo">
        {photo ? (
          <Image src={`/api/photo-files/${encodeURIComponent(photo.id)}`} alt={`目安の畑 ${field.id} の最新の写真`} fill sizes="100vw" priority />
        ) : (
          <div className="bench-empty">
            <IconPhoto />
            {latest.kind === "ok" ? "目安の写真はまだありません" : latest.kind === "error" ? "目安の写真を読み込めませんでした" : "目安の写真を読み込んでいます"}
          </div>
        )}
        <div className="bench-caption">
          <i className="mark mark-benchmark" aria-hidden="true" />
          <span className="bench-caption-title">
            目安 <span className="dock-id">{field.id}</span> {field.name}
          </span>
          {photo && <span className="bench-caption-date">{takenAtLabel(photo.takenAt)}</span>}
        </div>
      </div>
    </section>
  );
}
