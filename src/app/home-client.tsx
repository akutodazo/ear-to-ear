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
import { useDemoToday, useLastSeasonMemo } from "@/hooks/use-last-season-memo";
import { useElementHeight } from "@/hooks/use-element-height";
import { useLastDistrict } from "@/hooks/use-last-district";
import { MapLegend } from "@/components/map/map-legend";
import { AppNav } from "@/components/app-nav";
import { IconCamera } from "@/components/icons";

// JSON の型は number[][] なので、[lat, lng] の組に読み替える（中身は src/data/parcels.test.ts が確かめる）
const parcels: Parcel[] = parcelsData.map((p) => ({ fieldId: p.fieldId, polygon: p.polygon.map(([lat, lng]) => [lat, lng] as [number, number]) }));
const benchmarks: Benchmark[] = benchmarksData;
/** 今年。作付けの年の層はまだ無いので、固定（docs/design/design-concept.md A3） */
const SEASON = "2026";

export function HomeClient() {
  // デモで今日を差し替えているときの表示（精査 4 回目 #5）
  const demoDate = useDemoToday();
  const map = useFieldMap();
  const { selectedId, selected, select } = useFieldSelection();
  const latest = useLatestPhoto(selectedId);
  const lastMemo = useLastSeasonMemo(selectedId, SEASON);
  // 選んだ畑を隠さない下の余白は、板の実際の高さから決める（精査 4 回目 #1）。測る前は地図の既定
  const [dockRef, dockHeight] = useElementHeight<HTMLElement>();
  const keepVisiblePadding = useMemo(() => (dockHeight > 0 ? { top: 56, bottom: dockHeight + 24 } : undefined), [dockHeight]);
  const districts = useMemo(() => [...new Set(map.pins.map((p) => p.field.district))], [map.pins]);
  // 見ている地区。圃場を押すとその地区に変わり、閉じても戻らない（精査 #1）。既定は最初の地区（開いたときに選んでいればその地区）
  const [districtChoice, setDistrictChoice] = useState<string | null>(() => selected?.district ?? null);
  // 選んでいない畑の画面を開いたときは、最後に見た地区から（刈る順番と同じ値。11-06 地図の精査 #4）
  const lastDistrict = useLastDistrict(districts);
  const district = selected?.district ?? districtChoice ?? lastDistrict.last ?? districts[0] ?? "";
  // 地図を合わせ直すのは選択欄を変えたときだけ。圃場を押しても地図は動かさない（押した畑が指の下から動かない。精査 #1）
  // 最初の描画ではハッシュがまだ読めない（事前描画の値は null）ので、初期値に selected を入れず、描画のたびに決める。
  // key は選択欄を変えるまで "initial" のままなので、畑を押して地区が変わっても合わせ直さない（精査 2 回目の #1）
  const [fit, setFit] = useState<{ district: string | null; seq: number }>({ district: null, seq: 0 });
  const fitDistrict = fit.district ?? selected?.district ?? lastDistrict.last ?? districts[0] ?? "";
  const fitKey = fit.district === null ? "initial" : `${fit.district}#${fit.seq}`;

  // 選択を外したときも、映っている地区（外す前に選んでいた畑の地区）のままにする（#A-07 で開いて外すと北地区に戻っていた。11-06 地図の精査 #4）
  const choose = (id: string | null) => {
    const field = id === null ? selected : map.pins.find((p) => p.field.id === id)?.field;
    if (field) {
      setDistrictChoice(field.district);
      lastDistrict.remember(field.district);
    }
    select(id);
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
  // 見比べるの行き先: 選んだ畑。選んでいなければ、見ている地区の目安の畑（無ければ最初の畑）
  const districtBenchmark = benchmarkFor(benchmarks, SEASON, district);
  const compareHref = selected ? `/fields/${selected.id}` : `/fields/${districtBenchmark ?? items.find((i) => i.field.district === district)?.field.id ?? "A-01"}`;
  // 板のボタン: 目安の畑と見比べられるのは、地区に目安があって、それが自分でないとき
  const compareLabel = selectedItem && districtBenchmark !== null && !selectedItem.appearance.benchmark ? "目安の畑と見比べる" : "この畑の写真を見る";
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
              lastDistrict.remember(e.target.value);
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
        <Link className="button button-small" href={selectedId ? `/upload#${selectedId}` : "/upload"}>
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
        <FieldMap parcels={items} fitItems={fitItems} fitKey={fitKey} onSelect={choose} keepVisiblePadding={keepVisiblePadding} />
        {selectedItem ? (
          <SelectionDock
            ref={dockRef}
            field={selectedItem.field}
            appearance={selectedItem.appearance}
            statusLine={selectedItem.labelLines[1] ?? (map.message ? "判断を読み込めていません" : "判断を読み込んでいます")}
            latest={latest}
            compareLabel={compareLabel}
            lastSeasonMemo={lastMemo ? { season: lastMemo.season, href: `/fields/${selectedItem.field.id}#last-season` } : null}
            onClose={() => choose(null)}
          />
        ) : (
          <MapLegend />
        )}
        <span className="map-fictional-note">区画の形・番号・判断は架空のもの</span>
      </div>
      <AppNav current="map" compareHref={compareHref} orderHref={selected ? `/order#${selected.id}` : "/order"} demoDate={demoDate} />
    </div>
  );
}
