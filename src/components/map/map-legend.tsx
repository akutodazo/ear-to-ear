/** 地図の凡例（何も選んでいないときに左下に小さく出る）。印（.mark）は地図の札・板と同じもの。状態は色だけで言わず、文字を添える */
export function MapLegend() {
  return (
    <ul className="legend" aria-label="凡例">
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
    </ul>
  );
}
