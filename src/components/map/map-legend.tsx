/**
 * 地図の凡例（何も選んでいないときに左下）。既定は小さな「凡例」ボタンで、押すと開く（#200。最初の 1 回だけ開いておく）。
 * 印（.mark）は地図の札・板と同じもの。状態は色だけで言わず、文字を添える。props だけで受け取る
 */
import { IconClose } from "@/components/icons";

interface Props {
  open: boolean;
  onOpen: (open: boolean) => void;
}

export function MapLegend({ open, onOpen }: Props) {
  if (!open) {
    return (
      <button type="button" className="legend-toggle" onClick={() => onOpen(true)} aria-expanded="false">
        <i className="mark mark-ready" aria-hidden="true" />
        凡例
      </button>
    );
  }
  return (
    <div className="legend legend-open">
      <ul className="legend-list" aria-label="凡例">
        <li>
          <i className="mark mark-ready" aria-hidden="true" />
          収穫可能
        </li>
        <li>
          <i className="mark mark-done" aria-hidden="true" />
          収穫済
        </li>
        <li>
          <i className="mark mark-none" aria-hidden="true" />
          未確認
        </li>
        <li>
          <i className="mark mark-benchmark" aria-hidden="true" />
          目安の畑
        </li>
        <li>
          <i className="legend-dot" aria-hidden="true" />
          未確定の写真
        </li>
      </ul>
      <button type="button" className="legend-close" onClick={() => onOpen(false)} aria-label="凡例を閉じる">
        <IconClose />
      </button>
    </div>
  );
}
