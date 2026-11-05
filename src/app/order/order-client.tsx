"use client";

/**
 * /order の配線（11-05、3 段目「刈る順番」）。上に地区の地図（順位の丸が付く）、下に写真付きの一覧。
 * 記録からの下書き（harvest-order）→ 人が並べ替え → 保存・確定（useHarvestOrder）。地図の丸は並べ替えた瞬間に付け替わる。
 * 一覧の行を押すと地図で示し、地図の畑を押すと一覧の行を示す（useFieldSelection の #A-03 を共有。AGENTS.md §4）
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import fieldsData from "@/data/fields.json";
import parcelsData from "@/data/parcels.json";
import benchmarksData from "@/data/benchmarks.json";
import seasonsData from "@/data/seasons.json";
import type { Benchmark, Field, Parcel } from "@/types";
import type { SeasonRecord } from "@/services/last-season";
import { useFieldMap } from "@/hooks/use-field-map";
import { useFieldSelection } from "@/hooks/use-field-selection";
import { useDistrictPhotos } from "@/hooks/use-district-photos";
import { useHarvestOrder } from "@/hooks/use-harvest-order";
import { benchmarkFor, mapLabelLines, parcelAppearance } from "@/services/parcel-geometry";
import { draftOrder, nextToShoot, orderRows } from "@/services/harvest-order";
import { indexByDay } from "@/services/photo-compare";
import { FieldMap, type MapParcel } from "@/components/map/field-map";
import { OrderList } from "@/components/order/order-list";
import { OrderActions } from "@/components/order/order-actions";
import { NextToShoot } from "@/components/order/next-to-shoot";
import { AppNav } from "@/components/app-nav";
import { IconMap } from "@/components/icons";

const fields: Field[] = fieldsData;
const parcels: Parcel[] = parcelsData.map((p) => ({ fieldId: p.fieldId, polygon: p.polygon.map(([lat, lng]) => [lat, lng] as [number, number]) }));
const benchmarks: Benchmark[] = benchmarksData;
const seasons: SeasonRecord[] = seasonsData;
/** 今年（地図・見比べると同じ） */
const SEASON = "2026";
const districts = [...new Set(fields.map((f) => f.district))];
/** 刈る順番の地図には板が無いので、選んだ畑を隠さない余白は小さく */
const MAP_PADDING = { top: 40, bottom: 16 };

export function OrderClient() {
  const map = useFieldMap();
  const { selectedId, selected, select } = useFieldSelection();
  const [districtChoice, setDistrictChoice] = useState<string | null>(null);
  const district = districtChoice ?? selected?.district ?? districts[0];
  const districtFields = useMemo(() => fields.filter((f) => f.district === district), [district]);
  const districtIds = useMemo(() => districtFields.map((f) => f.id), [districtFields]);
  const fieldsById = useMemo(() => Object.fromEntries(districtFields.map((f) => [f.id, f])) as Record<string, Field>, [districtFields]);
  const benchmarkId = benchmarkFor(benchmarks, SEASON, district);
  const photos = useDistrictPhotos(districtIds);

  // 判断のまとめが読めてから下書きを作る（読めないのに「判断なし」と並べない）
  const summariesReady = !map.loading && map.message === null;
  const rows = useMemo(
    () => orderRows({ fields: districtFields, summaries: map.summaries, benchmarkId, season: SEASON, lastSeason: seasons, photosByField: photos.byField }),
    [districtFields, map.summaries, benchmarkId, photos.byField],
  );
  const base = useMemo(() => (summariesReady && !photos.loading ? draftOrder(rows, districtFields) : null), [summariesReady, photos.loading, rows, districtFields]);
  const order = useHarvestOrder(district, SEASON, base);
  const shoot = useMemo(() => nextToShoot(rows), [rows]);

  // 畑ごとの最新の写真（一覧の小さな写真）
  const photoIdByField = useMemo(() => {
    const out: Record<string, string> = {};
    for (const day of indexByDay(photos.byField)) {
      for (const [id, p] of Object.entries(day.photos)) if (out[id] === undefined) out[id] = p.id;
    }
    return out;
  }, [photos.byField]);

  const confirmedView = order.saved?.state === "confirmed" && !order.differsFromConfirmed;
  const rankOf = useMemo(() => new Map((order.order?.ranked ?? []).map((id, i) => [id, i + 1])), [order.order]);
  const items = useMemo<MapParcel[]>(() => {
    const byField = new Map(parcels.map((p) => [p.fieldId, p]));
    return districtFields.flatMap((field) => {
      const parcel = byField.get(field.id);
      if (!parcel) return [];
      const pin = map.pins.find((p) => p.field.id === field.id)?.pin ?? null;
      const summary = map.summaries.find((s) => s.fieldId === field.id) ?? null;
      const n = rankOf.get(field.id);
      return [
        {
          field,
          parcel,
          appearance: parcelAppearance(pin, { selected: field.id === selectedId, benchmark: field.id === benchmarkId }),
          labelLines: mapLabelLines(field, summary),
          rank: n === undefined ? null : { n, confirmed: confirmedView },
        },
      ];
    });
  }, [districtFields, map.pins, map.summaries, rankOf, selectedId, benchmarkId, confirmedView]);

  // 地図で畑を押したら、一覧のその行を見える所へ
  useEffect(() => {
    if (selectedId === null) return;
    document.querySelector(`.order-row[data-field="${selectedId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <div className="order">
      <header className="topbar">
        <Link href={selectedId ? `/#${selectedId}` : "/"} className="topbar-back">
          <IconMap />
          地図
        </Link>
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
      </header>
      <div className="order-map">
        <FieldMap parcels={items} fitItems={items} fitKey={`order:${district}`} onSelect={select} keepVisiblePadding={MAP_PADDING} />
        <span className="map-fictional-note">区画の形・番号・判断・順番は架空のもの</span>
      </div>
      <main className="order-body">
        {map.message && <p className="note">判断を読み込めませんでした。地図の「もう一度読み込む」から読み直してください</p>}
        {order.order === null ? (
          <p className="order-empty">{map.message ? "判断が読めないので、下書きを作っていません" : "記録を読み込んでいます"}</p>
        ) : (
          <>
            <OrderActions
              saved={order.saved}
              dirty={order.dirty}
              differsFromConfirmed={order.differsFromConfirmed}
              canConfirm={order.canConfirm}
              busy={order.busy}
              message={order.message}
              hasRanked={order.order.ranked.length > 0}
              onSave={order.saveDraft}
              onConfirm={order.confirm}
              onRevert={order.revert}
              onReset={order.resetToRecords}
            />
            <OrderList
              order={order.order}
              rows={rows}
              fieldsById={fieldsById}
              photoIdByField={photoIdByField}
              confirmed={confirmedView}
              selectedId={selectedId}
              onSelect={select}
              onMove={order.move}
              onMoveTo={order.moveTo}
              onToggle={order.toggle}
            />
            <NextToShoot ids={shoot} rows={rows} fieldsById={fieldsById} onSelect={select} />
            <p className="order-local-note">いまの保存先はこの端末だけです（委員で共有する保存先は準備中）</p>
          </>
        )}
      </main>
      <AppNav current="order" compareHref={`/fields/${selectedId ?? benchmarkId ?? districtIds[0]}`} orderHref="/order" />
    </div>
  );
}
