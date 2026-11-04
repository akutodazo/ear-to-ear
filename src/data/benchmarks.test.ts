import { describe, expect, it } from "vitest";
import type { Benchmark, Field } from "@/types";
import { benchmarkFor } from "@/services/parcel-geometry";
import fieldsData from "./fields.json";
import benchmarksData from "./benchmarks.json";

// 架空の目安の畑（11-04 夜の本人決定）。北地区と中地区にだけ指定し、南地区は未指定（目安なしでも動くことを見せる）
const fields: Field[] = fieldsData;
const benchmarks: Benchmark[] = benchmarksData;

describe("架空の目安の畑（src/data/benchmarks.json）", () => {
  it("番号は圃場の一覧にあり、地区が一致する", () => {
    for (const b of benchmarks) {
      const f = fields.find((x) => x.id === b.fieldId);
      expect(f, b.fieldId).toBeDefined();
      expect(f!.district).toBe(b.district);
    }
  });

  it("年・地区の組は重ならない（1 地区に目安は 1 つ）", () => {
    const keys = benchmarks.map((b) => `${b.season}/${b.district}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("2026 年は 北地区 A-03、中地区 A-07、南地区は未指定", () => {
    expect(benchmarkFor(benchmarks, "2026", "北地区")).toBe("A-03");
    expect(benchmarkFor(benchmarks, "2026", "中地区")).toBe("A-07");
    expect(benchmarkFor(benchmarks, "2026", "南地区")).toBeNull();
  });
});
