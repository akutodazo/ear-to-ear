/**
 * 地区の刈る順番（記録からの下書き＋保存した順）を、詳細と順番の 2 つの画面で同じ形で作る Presenter（#195）。
 * 判断のまとめ（useFieldMap）・地区の写真（useDistrictPhotos）・昨年の記録から下書きを作り、useHarvestOrder に渡す
 */
"use client";

import { useMemo } from "react";
import fieldsData from "@/data/fields.json";
import benchmarksData from "@/data/benchmarks.json";
import seasonsData from "@/data/seasons.json";
import type { Benchmark, Field } from "@/types";
import type { SeasonRecord } from "@/services/last-season";
import { useFieldMap } from "@/hooks/use-field-map";
import { useDistrictPhotos } from "@/hooks/use-district-photos";
import { useHarvestOrder } from "@/hooks/use-harvest-order";
import { benchmarkFor } from "@/services/parcel-geometry";
import { draftOrder, orderRows } from "@/services/harvest-order";

const fields: Field[] = fieldsData;
const benchmarks: Benchmark[] = benchmarksData;
const seasons: SeasonRecord[] = seasonsData;

export function useDistrictOrder(district: string, season: string) {
  const map = useFieldMap();
  const districtFields = useMemo(() => fields.filter((f) => f.district === district), [district]);
  const districtIds = useMemo(() => districtFields.map((f) => f.id), [districtFields]);
  const benchmarkId = benchmarkFor(benchmarks, season, district);
  const photos = useDistrictPhotos(districtIds);
  const summariesReady = !map.loading && map.message === null;
  const rows = useMemo(
    () => orderRows({ fields: districtFields, summaries: map.summaries, benchmarkId, season, lastSeason: seasons, photosByField: photos.byField }),
    [districtFields, map.summaries, benchmarkId, season, photos.byField],
  );
  const base = useMemo(() => (summariesReady && !photos.loading ? draftOrder(rows, districtFields) : null), [summariesReady, photos.loading, rows, districtFields]);
  const order = useHarvestOrder(district, season, base);
  return { map, photos, rows, base, order, districtFields, districtIds, benchmarkId, failed: map.message !== null };
}
