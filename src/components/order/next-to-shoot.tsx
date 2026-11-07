/**
 * 次に撮る畑（11-05、3 段目。11-04 夜の決定 ②）。今年の写真・判断が無い畑を、記録から並べて出すだけ（AI 不要）。
 * 押すとその畑を地図で示す。カメラの印から「写真を送る」へ（選んでいる畑があれば、その番号を送る画面に引き継ぐ。精査 5 回目 #5）。props だけで受け取る
 */
import Link from "next/link";
import type { Field } from "@/types";
import type { OrderRow } from "@/services/harvest-order";
import { monthDay } from "@/services/last-season";
import { IconCamera } from "@/components/icons";

interface Props {
  ids: string[];
  rows: Record<string, OrderRow>;
  fieldsById: Record<string, Field>;
  onSelect: (fieldId: string) => void;
  /** 選んでいる畑。あれば「写真を送る」をその畑の分にする */
  selectedId?: string | null;
}

export function NextToShoot({ ids, rows, fieldsById, onSelect, selectedId = null }: Props) {
  if (ids.length === 0) return null;
  return (
    <section className="shoot" aria-label="次に撮る畑">
      <h2 className="order-group-title">
        <IconCamera /> 次に撮る畑
      </h2>
      <ul className="shoot-list">
        {ids.map((id) => {
          const row = rows[id];
          return (
            <li key={id}>
              <button type="button" className="chip" onClick={() => onSelect(id)}>
                <span className="dock-id">{id}</span> {fieldsById[id]?.name ?? ""}
                <span className="shoot-why">{row?.latestPhotoAt ? `最新 ${monthDay(row.latestPhotoAt)}` : "写真なし"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Link className="button button-small shoot-send" href={selectedId ? `/upload#${selectedId}` : "/upload"}>
        <IconCamera />
        {selectedId ? `${selectedId} の写真を送る` : "写真を送る"}
      </Link>
    </section>
  );
}
