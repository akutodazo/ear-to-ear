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
import { IconCamera } from "@/components/icons";

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
  // 見ている地区。圃場を押すとその地区に変わり、閉じても戻らない（精査 #1）。既定は最初の地区（開いたときに選んでいればその地区）
  const [districtChoice, setDistrictChoice] = useState<string | null>(() => selected?.district ?? null);
  const district = selected?.district ?? districtChoice ?? districts[0] ?? "";
  // 地図を合わせ直すのは選択欄を変えたときだけ。圃場を押しても地図は動かさない（押した畑が指の下から動かない。精査 #1）
  const [fit, setFit] = useState<{ district: string | null; seq: number }>(() => ({ district: selected?.district ?? null, seq: 0 }));
  const fitDistrict = fit.district ?? districts[0] ?? "";

  const choose = (id: string | null) => {
    select(id);
    const field = id === null ? undefined : map.pins.find((p) => p.field.id === id)?.field;
    if (field) setDistrictChoice(field.district);
  };

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
  const fitItems = useMemo(() => items.filter((i) => i.field.district === fitDistrict), [items, fitDistrict]);

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
              setFit((prev) => ({ district: e.target.value, seq: prev.seq + 1 }));
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
          <IconCamera />
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
        <FieldMap parcels={items} fitItems={fitItems} fitKey={`${fitDistrict}#${fit.seq}`} onSelect={choose} />
        {selectedItem ? (
          <SelectionDock
            field={selectedItem.field}
            appearance={selectedItem.appearance}
            statusLine={selectedItem.labelLines[1] ?? (map.message ? "判断を読み込めていません" : "判断を読み込んでいます")}
            latest={latest}
            onClose={() => choose(null)}
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
