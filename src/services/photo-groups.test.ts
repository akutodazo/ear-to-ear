import { describe, expect, it } from "vitest";
import type { UploadedPhoto } from "@/types";
import { groupFieldPhotos, type PhotoGroup } from "./photo-groups";

let serial = 0;

/** 確定済み・A-06・撮影日 2026-07-21 の写真。change で上書きする */
function photo(change: Partial<UploadedPhoto> = {}): UploadedPhoto {
  serial += 1;
  return {
    id: `p${String(serial).padStart(4, "0")}`,
    fieldId: "A-06",
    chosenFieldId: null,
    state: "confirmed",
    candidateFieldIds: ["A-06"],
    takenAt: "2026-07-21",
    takenAtSource: "xmp",
    width: 1600,
    height: 1200,
    uploadedAt: "2026-11-03T08:00:00.000Z",
    uploaderDevice: "dev-1",
    ...change,
  };
}

const ids = (groups: PhotoGroup[]) => groups.map((g) => [g.takenAt, g.photos.map((p) => p.id)]);

describe("groupFieldPhotos: どの写真を出すか（T06）", () => {
  it("その圃場に確定済みの写真だけを出す", () => {
    const keep = photo({ id: "keep" });
    const groups = groupFieldPhotos(
      [
        keep,
        photo({ id: "other-field", fieldId: "A-07" }),
        photo({ id: "unconfirmed-candidate", state: "unconfirmed", fieldId: null, candidateFieldIds: ["A-06"] }),
        photo({ id: "unconfirmed-chosen", state: "unconfirmed", fieldId: null, chosenFieldId: "A-06" }),
        photo({ id: "confirmed-no-field", fieldId: null }),
      ],
      "A-06",
    );
    expect(ids(groups)).toStrictEqual([["2026-07-21", ["keep"]]]);
  });

  it("未確定のまま番号が入っている行（矛盾）も、確定済みでなければ出さない", () => {
    const groups = groupFieldPhotos([photo({ id: "odd", state: "unconfirmed", fieldId: "A-06" })], "A-06");
    expect(groups).toStrictEqual([]);
  });

  it("番号は完全に一致するものだけ（大文字小文字・前後の空白を区別する）", () => {
    const groups = groupFieldPhotos(
      [photo({ id: "lower", fieldId: "a-06" }), photo({ id: "space", fieldId: " A-06" }), photo({ id: "ok" })],
      "A-06",
    );
    expect(ids(groups)).toStrictEqual([["2026-07-21", ["ok"]]]);
  });

  it("写真が無い・該当が無ければ []（空の枠を作らない）", () => {
    expect(groupFieldPhotos([], "A-06")).toStrictEqual([]);
    expect(groupFieldPhotos([photo({ fieldId: "A-07" })], "A-06")).toStrictEqual([]);
  });
});

describe("groupFieldPhotos: まとめ方と並び（T06）", () => {
  it("同じ撮影日は 1 つの枠にまとめる（入力で離れていても）", () => {
    const groups = groupFieldPhotos(
      [
        photo({ id: "a", takenAt: "2026-07-21", uploadedAt: "2026-11-03T08:00:00.000Z" }),
        photo({ id: "b", takenAt: "2026-07-20", uploadedAt: "2026-11-03T08:00:00.000Z" }),
        photo({ id: "c", takenAt: "2026-07-21", uploadedAt: "2026-11-03T09:00:00.000Z" }),
      ],
      "A-06",
    );
    expect(ids(groups)).toStrictEqual([
      ["2026-07-21", ["c", "a"]],
      ["2026-07-20", ["b"]],
    ]);
  });

  it("撮影日の新しい日が先。月・年をまたいでも日付の順", () => {
    const groups = groupFieldPhotos(
      [
        photo({ id: "sep30", takenAt: "2026-09-30" }),
        photo({ id: "oct05", takenAt: "2026-10-05" }),
        photo({ id: "dec31", takenAt: "2025-12-31" }),
        photo({ id: "jan01", takenAt: "2026-01-01" }),
      ],
      "A-06",
    );
    expect(groups.map((g) => g.takenAt)).toStrictEqual(["2026-10-05", "2026-09-30", "2026-01-01", "2025-12-31"]);
  });

  it("日付不明はいちばん後ろの別枠（takenAt: null）。日付のある写真と混ぜない", () => {
    const groups = groupFieldPhotos(
      [
        photo({ id: "unknown1", takenAt: null, takenAtSource: "none", uploadedAt: "2026-11-03T10:00:00.000Z" }),
        photo({ id: "dated", takenAt: "2026-07-01" }),
        photo({ id: "unknown2", takenAt: null, takenAtSource: "none", uploadedAt: "2026-11-03T11:00:00.000Z" }),
      ],
      "A-06",
    );
    expect(ids(groups)).toStrictEqual([
      ["2026-07-01", ["dated"]],
      [null, ["unknown2", "unknown1"]],
    ]);
  });

  it("日付不明だけなら、日付不明の枠が 1 つ", () => {
    const groups = groupFieldPhotos([photo({ id: "u", takenAt: null, takenAtSource: "none" })], "A-06");
    expect(ids(groups)).toStrictEqual([[null, ["u"]]]);
  });

  it("同じ日の中は送った時刻の新しい順", () => {
    const groups = groupFieldPhotos(
      [
        photo({ id: "early", uploadedAt: "2026-11-03T08:00:00.000Z" }),
        photo({ id: "late", uploadedAt: "2026-11-03T12:00:00.000Z" }),
        photo({ id: "middle", uploadedAt: "2026-11-03T10:30:00.000Z" }),
      ],
      "A-06",
    );
    expect(ids(groups)).toStrictEqual([["2026-07-21", ["late", "middle", "early"]]]);
  });

  it("送った時刻が同じなら id の大きい順（入力の順に関係なく同じ並び）", () => {
    const at = "2026-11-03T08:00:00.000Z";
    const a = photo({ id: "p-a", uploadedAt: at });
    const b = photo({ id: "p-b", uploadedAt: at });
    const c = photo({ id: "p-c", uploadedAt: at });
    expect(ids(groupFieldPhotos([a, c, b], "A-06"))).toStrictEqual([["2026-07-21", ["p-c", "p-b", "p-a"]]]);
    expect(ids(groupFieldPhotos([c, b, a], "A-06"))).toStrictEqual([["2026-07-21", ["p-c", "p-b", "p-a"]]]);
  });
});

describe("groupFieldPhotos: 元のデータ（T06）", () => {
  it("元の配列と写真を変えず、写真はそのままのものを返す（写しを作らない）", () => {
    const a = photo({ id: "a", uploadedAt: "2026-11-03T08:00:00.000Z" });
    const b = photo({ id: "b", uploadedAt: "2026-11-03T09:00:00.000Z" });
    const input = [a, b];
    const snapshot = JSON.stringify(input);
    const groups = groupFieldPhotos(input, "A-06");
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(input[0]).toBe(a);
    expect(groups[0].photos[0]).toBe(b);
    expect(groups[0].photos[1]).toBe(a);
  });

  it("枠は takenAt と photos の 2 つの項目だけ", () => {
    const [group] = groupFieldPhotos([photo()], "A-06");
    expect(Object.keys(group).sort()).toStrictEqual(["photos", "takenAt"]);
  });

  it("多くの写真でも、出すべき写真がちょうど 1 回ずつ、並びの決まりどおりに出る", () => {
    const days = ["2026-07-18", "2026-07-21", null, "2026-08-02", "2026-07-30"];
    const fields = ["A-06", "A-07"];
    const all: UploadedPhoto[] = [];
    for (let i = 0; i < 60; i++) {
      all.push(
        photo({
          id: `m${String((i * 37) % 60).padStart(3, "0")}`,
          fieldId: i % 7 === 0 ? null : fields[i % 2],
          state: i % 5 === 0 ? "unconfirmed" : "confirmed",
          takenAt: days[i % days.length],
          takenAtSource: days[i % days.length] === null ? "none" : "xmp",
          uploadedAt: new Date(Date.UTC(2026, 10, 3, 8, (i * 13) % 60)).toISOString(),
        }),
      );
    }
    const expected = all.filter((p) => p.state === "confirmed" && p.fieldId === "A-06");
    const groups = groupFieldPhotos(all, "A-06");
    const flat = groups.flatMap((g) => g.photos);
    expect(flat).toHaveLength(expected.length);
    expect(new Set(flat.map((p) => p.id))).toStrictEqual(new Set(expected.map((p) => p.id)));

    // 枠: 空でない、日付は重ならない、新しい日が先、null は最後だけ
    const keys = groups.map((g) => g.takenAt);
    expect(new Set(keys).size).toBe(keys.length);
    for (const g of groups) {
      expect(g.photos.length).toBeGreaterThan(0);
      for (const p of g.photos) expect(p.takenAt).toBe(g.takenAt);
    }
    const dated = keys.filter((k) => k !== null) as string[];
    expect(dated).toStrictEqual([...dated].sort().reverse());
    expect(keys.indexOf(null) === -1 || keys.indexOf(null) === keys.length - 1).toBe(true);

    // 枠の中: 送った時刻の新しい順、同じなら id の大きい順
    for (const g of groups) {
      for (let i = 1; i < g.photos.length; i++) {
        const prev = g.photos[i - 1];
        const cur = g.photos[i];
        const ordered =
          prev.uploadedAt > cur.uploadedAt || (prev.uploadedAt === cur.uploadedAt && prev.id > cur.id);
        expect(ordered).toBe(true);
      }
    }
  });
});
