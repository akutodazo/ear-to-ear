import { describe, expect, it } from "vitest";
import {
  parseOrderShareMeta,
  SHARE_META_MAX_CHARS,
  shareCounterKey,
  shareExpiresAt,
  shareR2Key,
  type OrderShareMetaReason,
} from "./order-share-meta";

const FIELDS = [
  { id: "A-01", district: "北地区" },
  { id: "A-02", district: "北地区" },
  { id: "A-03", district: "北地区" },
  { id: "A-07", district: "南地区" },
];

const META = {
  season: "2026",
  district: "北地区",
  confirmedAt: "2026-11-06T03:00:00.000Z",
  ranked: ["A-02", "A-01"],
  benchmarkId: "A-01",
};

function parse(value: unknown) {
  return parseOrderShareMeta(typeof value === "string" ? value : JSON.stringify(value), FIELDS);
}

function reasonOf(value: unknown): OrderShareMetaReason | null {
  const result = parse(value);
  return result.ok ? null : result.reason;
}

describe("parseOrderShareMeta 通るもの", () => {
  it("5 項目をそのまま返す", () => {
    expect(parse(META)).toStrictEqual({ ok: true, meta: META });
  });

  it("benchmarkId は null でもよい", () => {
    expect(parse({ ...META, benchmarkId: null })).toStrictEqual({ ok: true, meta: { ...META, benchmarkId: null } });
  });

  it("地区の畑を全部並べてもよい", () => {
    expect(parse({ ...META, ranked: ["A-03", "A-02", "A-01"] }).ok).toBe(true);
  });
});

describe("parseOrderShareMeta 弾くもの（理由のコード）", () => {
  it("JSON でない・オブジェクトでない・上限の文字数を超える", () => {
    expect(reasonOf("{")).toBe("bad_json");
    expect(reasonOf("[]")).toBe("bad_json");
    expect(reasonOf("null")).toBe("bad_json");
    expect(reasonOf(JSON.stringify(META) + " ".repeat(SHARE_META_MAX_CHARS))).toBe("bad_json");
  });

  it("知らない項目・足りない項目", () => {
    expect(reasonOf({ ...META, lat: 43.2 })).toBe("unknown_key");
    const { benchmarkId: _omit, ...rest } = META;
    expect(reasonOf(rest)).toBe("unknown_key");
  });

  it("season は 4 桁の年だけ", () => {
    for (const season of ["26", "2026a", 2026, ""]) expect(reasonOf({ ...META, season })).toBe("bad_season");
  });

  it("知らない地区", () => {
    expect(reasonOf({ ...META, district: "東地区" })).toBe("unknown_district");
    expect(reasonOf({ ...META, district: 1 })).toBe("unknown_district");
  });

  it("ranked は 1 件以上の文字列の配列", () => {
    expect(reasonOf({ ...META, ranked: [] })).toBe("bad_list");
    expect(reasonOf({ ...META, ranked: "A-01" })).toBe("bad_list");
    expect(reasonOf({ ...META, ranked: ["A-01", 2] })).toBe("bad_list");
  });

  it("ほかの地区の畑・無い番号は unknown_field、重複は duplicate_field", () => {
    expect(reasonOf({ ...META, ranked: ["A-01", "A-07"] })).toBe("unknown_field");
    expect(reasonOf({ ...META, ranked: ["A-99"] })).toBe("unknown_field");
    expect(reasonOf({ ...META, ranked: ["A-01", "A-01"], benchmarkId: null })).toBe("duplicate_field");
  });

  it("confirmedAt は ISO 8601 の UTC だけ", () => {
    for (const confirmedAt of ["2026-11-06", "きのう", "2026-13-01T00:00:00.000Z", 0]) {
      expect(reasonOf({ ...META, confirmedAt })).toBe("bad_confirmed_at");
    }
  });

  it("benchmarkId は地区の畑か null", () => {
    expect(reasonOf({ ...META, benchmarkId: "A-07" })).toBe("bad_benchmark");
    expect(reasonOf({ ...META, benchmarkId: 1 })).toBe("bad_benchmark");
  });
});

describe("保存の決まり", () => {
  it("R2 のキーは shares/<id>.jpg", () => {
    expect(shareR2Key("abc")).toBe("shares/abc.jpg");
  });

  it("期限は 60 日後（11-06 先輩決定）", () => {
    const now = Date.parse("2026-11-06T03:00:00.000Z");
    expect(shareExpiresAt(now)).toBe("2027-01-05T03:00:00.000Z");
  });

  it("回数の key は端末と日本時間の日付", () => {
    // 2026-11-06T15:30Z は日本時間で 11-07 の 0:30
    expect(shareCounterKey("dev-1", Date.parse("2026-11-06T15:30:00.000Z"))).toBe("share:dev-1:2026-11-07");
  });
});
