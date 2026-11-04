/** 地図の凡例（何も選んでいないときに下に出る）。状態は色だけで言わず、文字を添える */
export function MapLegend() {
  return (
    <ul className="legend" aria-label="凡例">
      <li>
        <i className="legend-swatch legend-ready" aria-hidden="true" />
        収穫可能（人の判断）
      </li>
      <li>
        <i className="legend-swatch legend-done" aria-hidden="true" />
        収穫済
      </li>
      <li>
        <i className="legend-swatch" aria-hidden="true" />
        未確認
      </li>
      <li>
        <i className="legend-swatch legend-benchmark" aria-hidden="true" />
        目安の畑
      </li>
    </ul>
  );
}
