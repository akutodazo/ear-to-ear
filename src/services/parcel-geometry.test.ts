import { describe, expect, it } from "vitest";
import type { Field, FieldSummary, StatusEvent } from "@/types";
import {
  benchmarkFor,
  boundsOverlap,
  containsPoint,
  mapLabelLines,
  monthDayJst,
  parcelAppearance,
  polygonBounds,
  polygonCentroid,
  polygonsOverlap,
  unionBounds,
  type LatLng,
} from "./parcel-geometry";

// 座標はすべて架空の範囲（FICTIONAL_AREA）の中（AGENTS.md §1-6）
const square: LatLng[] = [
  [43.2400, 141.7500],
  [43.2400, 141.7520],
  [43.2420, 141.7520],
  [43.2420, 141.7500],
];
// 凹んだ形（L 字）
const lShape: LatLng[] = [
  [43.2400, 141.7500],
  [43.2400, 141.7530],
  [43.2410, 141.7530],
  [43.2410, 141.7510],
  [43.2430, 141.7510],
  [43.2430, 141.7500],
];

const field: Field = { id: "A-03", name: "北の3", lat: 43.2465, lng: 141.7525, district: "北地区" };

function event(over: Partial<StatusEvent> = {}): StatusEvent {
  return {
    id: 1,
    fieldId: "A-03",
    status: "ready",
    reasons: ["ear_color"],
    note: null,
    refPhotoIds: [],
    actorDevice: "d1",
    at: "2026-07-21T01:00:00.000Z",
    revokedAt: null,
    ...over,
  };
}

describe("polygonBounds（輪郭を含む最小の四角）", () => {
  it("四角の端を返す", () => {
    expect(polygonBounds(square)).toEqual({ latMin: 43.24, latMax: 43.242, lngMin: 141.75, lngMax: 141.752 });
  });

  it("点が 1 つなら幅 0 の四角", () => {
    expect(polygonBounds([[43.24, 141.75]])).toEqual({ latMin: 43.24, latMax: 43.24, lngMin: 141.75, lngMax: 141.75 });
  });

  it("点が無ければ例外（輪郭ではない）", () => {
    expect(() => polygonBounds([])).toThrow(/点が無い/);
  });
});

describe("polygonCentroid（重心）", () => {
  it("四角の重心は中央", () => {
    const [lat, lng] = polygonCentroid(square);
    expect(lat).toBeCloseTo(43.241, 6);
    expect(lng).toBeCloseTo(141.751, 6);
  });

  it("L 字の重心は点の平均ではなく面の重心（広い方に寄る）", () => {
    const [lat, lng] = polygonCentroid(lShape);
    // 点の平均は (43.24133, 141.75133)。面の重心は 横の棒 3 と 縦の棒 2 の面積の重み付きで (43.2411, 141.7511)
    expect(lat).toBeCloseTo(43.2411, 5);
    expect(lng).toBeCloseTo(141.7511, 5);
  });

  it("面積が 0（点が一直線）なら点の平均", () => {
    const line: LatLng[] = [
      [43.24, 141.75],
      [43.24, 141.751],
      [43.24, 141.752],
    ];
    expect(polygonCentroid(line)).toEqual([43.24, 141.751]);
  });
});

describe("containsPoint（点が輪郭の中か）", () => {
  it("中央は中、外は外", () => {
    expect(containsPoint(square, [43.241, 141.751])).toBe(true);
    expect(containsPoint(square, [43.243, 141.751])).toBe(false);
    expect(containsPoint(square, [43.241, 141.753])).toBe(false);
  });

  it("L 字の凹みの中は外", () => {
    expect(containsPoint(lShape, [43.242, 141.752])).toBe(false);
    expect(containsPoint(lShape, [43.2405, 141.752])).toBe(true);
    expect(containsPoint(lShape, [43.242, 141.7505])).toBe(true);
  });
});

describe("boundsOverlap・unionBounds", () => {
  const a = { latMin: 0, latMax: 1, lngMin: 0, lngMax: 1 };

  it("重なれば true", () => {
    expect(boundsOverlap(a, { latMin: 0.5, latMax: 2, lngMin: 0.5, lngMax: 2 })).toBe(true);
  });

  it("辺が触れるだけ・離れていれば false", () => {
    expect(boundsOverlap(a, { latMin: 1, latMax: 2, lngMin: 0, lngMax: 1 })).toBe(false);
    expect(boundsOverlap(a, { latMin: 2, latMax: 3, lngMin: 2, lngMax: 3 })).toBe(false);
  });

  it("unionBounds は全部を含む四角。空なら null", () => {
    expect(unionBounds([a, { latMin: -1, latMax: 0.5, lngMin: 2, lngMax: 3 }])).toEqual({ latMin: -1, latMax: 1, lngMin: 0, lngMax: 3 });
    expect(unionBounds([])).toBeNull();
  });
});

describe("parcelAppearance（区画の見え方）", () => {
  it("収穫可能は ready を塗り、未確定の点も持つ", () => {
    expect(parcelAppearance({ status: "ready", unconfirmed: true }, { selected: false, benchmark: false })).toEqual({
      fill: "ready",
      selected: false,
      benchmark: false,
      unconfirmed: true,
    });
  });

  it("収穫済は done、判断なしは none（未確認は塗らない）", () => {
    expect(parcelAppearance({ status: "done", unconfirmed: false }, { selected: true, benchmark: false }).fill).toBe("done");
    expect(parcelAppearance({ status: "none", unconfirmed: false }, { selected: false, benchmark: true })).toEqual({
      fill: "none",
      selected: false,
      benchmark: true,
      unconfirmed: false,
    });
  });

  it("まとめが読めていない（null）なら塗らず、点も付けない", () => {
    expect(parcelAppearance(null, { selected: false, benchmark: false })).toEqual({
      fill: "none",
      selected: false,
      benchmark: false,
      unconfirmed: false,
    });
  });
});

describe("monthDayJst（日本時間の月/日）", () => {
  it("UTC の日時を日本時間の日付に（日をまたぐ例）", () => {
    expect(monthDayJst("2026-07-21T01:00:00.000Z")).toBe("7/21");
    expect(monthDayJst("2026-07-20T16:00:00.000Z")).toBe("7/21");
    expect(monthDayJst("2026-07-21T14:59:59.000Z")).toBe("7/21");
    expect(monthDayJst("2026-07-21T15:00:00.000Z")).toBe("7/22");
  });

  it("読めない文字列なら例外", () => {
    expect(() => monthDayJst("いつか")).toThrow(/日時ではない/);
  });
});

describe("mapLabelLines（地図の札）", () => {
  const summary = (latest: StatusEvent | null): FieldSummary => ({ fieldId: "A-03", latest, hasUnconfirmed: false });

  it("収穫可能は「可 月/日」", () => {
    expect(mapLabelLines(field, summary(event()))).toEqual(["A-03 北の3", "可 7/21"]);
  });

  it("収穫済は「済 月/日」", () => {
    expect(mapLabelLines(field, summary(event({ status: "done", at: "2026-07-25T03:00:00.000Z" })))).toEqual(["A-03 北の3", "済 7/25"]);
  });

  it("判断が無ければ「未確認」（収穫不可とは書かない）", () => {
    expect(mapLabelLines(field, summary(null))).toEqual(["A-03 北の3", "未確認"]);
  });

  it("まとめが読めていなければ 1 行目だけ（未確認と見せない）", () => {
    expect(mapLabelLines(field, null)).toEqual(["A-03 北の3"]);
  });
});

describe("benchmarkFor（年・地区の目安の畑）", () => {
  const list = [
    { season: "2026", district: "北地区", fieldId: "A-03" },
    { season: "2025", district: "北地区", fieldId: "A-01" },
    { season: "2026", district: "中地区", fieldId: "A-07" },
  ];

  it("年と地区が合うものの番号", () => {
    expect(benchmarkFor(list, "2026", "北地区")).toBe("A-03");
    expect(benchmarkFor(list, "2025", "北地区")).toBe("A-01");
  });

  it("無ければ null（目安なしでも動く）", () => {
    expect(benchmarkFor(list, "2026", "南地区")).toBeNull();
    expect(benchmarkFor([], "2026", "北地区")).toBeNull();
  });
});

describe("polygonsOverlap（輪郭どうしが重なるか。傾いた帯は四角で見ると重なって見えるので、形で見る）", () => {
  // 北へ傾いた 2 本の帯（隣どうし）。四角（bounds）は重なるが、形は離れている
  const stripA: LatLng[] = [
    [43.2400, 141.7500],
    [43.2401, 141.7512],
    [43.2440, 141.7502],
    [43.2439, 141.7490],
  ];
  const stripB: LatLng[] = [
    [43.2401, 141.7514],
    [43.2402, 141.7526],
    [43.2441, 141.7516],
    [43.2440, 141.7504],
  ];

  it("重なれば true（一部でも、片方が中に入っていても）", () => {
    const shifted: LatLng[] = square.map(([lat, lng]) => [lat + 0.001, lng + 0.001]);
    expect(polygonsOverlap(square, shifted)).toBe(true);
    const inner: LatLng[] = [
      [43.2405, 141.7505],
      [43.2405, 141.7510],
      [43.2410, 141.7510],
      [43.2410, 141.7505],
    ];
    expect(polygonsOverlap(square, inner)).toBe(true);
    expect(polygonsOverlap(inner, square)).toBe(true);
  });

  it("離れていれば false。辺が触れるだけでも false", () => {
    const apart: LatLng[] = square.map(([lat, lng]) => [lat + 0.01, lng]);
    expect(polygonsOverlap(square, apart)).toBe(false);
    const touching: LatLng[] = square.map(([lat, lng]) => [lat, lng + 0.002]);
    expect(polygonsOverlap(square, touching)).toBe(false);
  });

  it("傾いた隣の帯は、四角で見ると重なるが、形で見ると重ならない", () => {
    expect(boundsOverlap(polygonBounds(stripA), polygonBounds(stripB))).toBe(true);
    expect(polygonsOverlap(stripA, stripB)).toBe(false);
    expect(polygonsOverlap(stripB, stripA)).toBe(false);
  });

  it("どちらかが空なら例外", () => {
    expect(() => polygonsOverlap([], square)).toThrow(/輪郭に点が無い/);
  });
});
