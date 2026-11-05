"use client";

/** `/` の配線: 地図（useFieldMap）・選択（useFieldSelection）・選んだ畑の最新の写真（useLatestPhoto）を呼び、部品に props で配る（AGENTS.md §4） */
import Link from "next/link";
import { useMemo, useState } from "react";
import parcelsData from "@/data/parcels.json";
import benchmarksData from "@/data/benchmarks.json";
import type { Benchmark, Parcel } from "@/types";
import { useFieldMap } from "@/hooks/use-field-map";
import { useFieldSelection } from "@/hooks/use-field-selection";
import { useLatestPhoto } from "@/hooks/use-latest-photo";
import { benchmarkFor, mapLabelLines, parcelAppearance } from "@/services/parcel-geometry";
import { FieldMap, type MapParcel } from "@/components/map/field-map";
import { SelectionDock } from "@/components/map/selection-dock";
import { MapLegend } from "@/components/map/map-legend";
import { AppNav } from "@/components/app-nav";

// JSON の型は number[][] なので、[lat, lng] の組に読み替える（中身は src/data/parcels.test.ts が確かめる）
const parcels: Parcel[] = parcelsData.map((p) => ({ fieldId: p.fieldId, polygon: p.polygon.map(([lat, lng]) => [lat, lng] as [number, number]) }));
const benchmarks: Benchmark[] = benchmarksData;
/** 今年。作付けの年の層はまだ無いので、固定（docs/design/design-concept.md A3） */
const SEASON = "2026";

export function HomeClient() {
  const map = useFieldMap();
  const { selectedId, selected, select } = useFieldSelection();
  const latest = useLatestPhoto(selectedId);
  const districts = useMemo(() => [...new Set(map.pins.map((p) => p.field.district))], [map.pins]);
  const [districtChoice, setDistrictChoice] = useState<string | null>(null);
  // 圃場を選ぶとその地区に、選んでいなければ切り替えた地区（既定は最初の地区）
  const district = selected?.district ?? districtChoice ?? districts[0] ?? "";

  const items = useMemo<MapParcel[]>(() => {
    const byField = new Map(parcels.map((p) => [p.fieldId, p]));
    return map.pins.flatMap(({ field, pin }) => {
      const parcel = byField.get(field.id);
      if (!parcel) return [];
      const benchmark = benchmarkFor(benchmarks, SEASON, field.district) === field.id;
      const summary = map.summaries.find((s) => s.fieldId === field.id) ?? null;
      return [
        {
          field,
          parcel,
          appearance: parcelAppearance(pin, { selected: field.id === selectedId, benchmark }),
          labelLines: mapLabelLines(field, summary),
        },
      ];
    });
  }, [map.pins, map.summaries, selectedId]);

  const selectedItem = items.find((i) => i.field.id === selectedId) ?? null;
  const districtItems = useMemo(() => items.filter((i) => i.field.district === district), [items, district]);

  return (
    <div className="home">
      <header className="topbar">
        <span className="topbar-brand">ear-to-ear</span>
        <label className="topbar-district">
          <span className="sr-only">地区</span>
          <select
            className="input"
            value={district}
            onChange={(e) => {
              select(null);
              setDistrictChoice(e.target.value);
            }}
          >
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <Link className="button button-small" href="/upload">
          写真を送る
        </Link>
      </header>
      {map.message && (
        <div className="map-note" role="status">
          {map.message}{" "}
          <button type="button" className="map-note-button" onClick={map.refresh} disabled={map.loading}>
            {map.loading ? "読み込み中…" : "もう一度読み込む"}
          </button>
        </div>
      )}
      {map.loading && !map.message && (
        <div className="map-note" role="status">
          判断を読み込んでいます
        </div>
      )}
      <div className="home-map">
        <FieldMap parcels={items} fitItems={districtItems} fitKey={district} onSelect={select} />
        {selectedItem ? (
          <SelectionDock
            field={selectedItem.field}
            appearance={selectedItem.appearance}
            statusLine={selectedItem.labelLines[1] ?? (map.message ? "判断を読み込めていません" : "判断を読み込んでいます")}
            latest={latest}
            onClose={() => select(null)}
          />
        ) : (
          <MapLegend />
        )}
        <span className="map-fictional-note">区画の形・番号・判断は架空のもの</span>
      </div>
      <AppNav current="map" compareHref={selected ? `/fields/${selected.id}` : null} />
    </div>
  );
}
