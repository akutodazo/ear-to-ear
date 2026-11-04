/** 地図の上に出る、選んだ圃場の小さな板（番号・名前・判断・目安。「目安の畑と見比べる」への入口） */
import Link from "next/link";
import type { Field } from "@/types";
import type { ParcelAppearance } from "@/services/parcel-geometry";

interface Props {
  field: Field;
  appearance: ParcelAppearance;
  /** 2 行目の文（「可 7/21」「未確認」「判断を読み込んでいます」など。親が決める） */
  statusLine: string;
  onClose: () => void;
}

export function SelectionDock({ field, appearance, statusLine, onClose }: Props) {
  return (
    <section className="dock" aria-label="選んだ圃場">
      <div className="dock-head">
        <div className="stack-tight">
          <div className="dock-title">
            <span className="label">{field.id}</span> {field.name}
            {appearance.benchmark && <span className="badge badge-benchmark">目安</span>}
          </div>
          <div className="note">
            {statusLine}
            {appearance.unconfirmed && "・未確定の写真あり"}
          </div>
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
