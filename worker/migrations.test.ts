import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";

// D1 は SQLite なので、Node に標準の node:sqlite に流して確かめる（依存を増やさない）。
// node:sqlite の外部キーは既定で有効で、D1 と同じ
const SQL = readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8");

let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(SQL);
});

interface Column {
  name: string;
  notnull: number;
  pk: number;
}

function columns(table: string): Column[] {
  return db.prepare(`PRAGMA table_info(${table})`).all() as unknown as Column[];
}

function tables(): string[] {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as unknown as { name: string }[];
  return rows.map((r) => r.name).sort();
}

describe("表", () => {
  it("L0〜L1 の 4 つの表がある", () => {
    expect(tables()).toEqual([
      "field_status_events",
      "photo_assignments",
      "uploaded_photos",
      "usage_counters",
    ]);
  });
});

describe("列", () => {
  it.each([
    [
      "uploaded_photos",
      [
        "id", "field_id", "state", "candidate_field_ids", "taken_at", "taken_at_source",
        "content_hash", "r2_key", "width", "height", "bytes", "uploader_device",
        "uploaded_at", "updated_at",
      ],
    ],
    ["photo_assignments", ["id", "photo_id", "from_field_id", "to_field_id", "actor_device", "at"]],
    [
      "field_status_events",
      ["id", "field_id", "status", "reasons", "note", "ref_photo_ids", "actor_device", "at", "revoked_at"],
    ],
    ["usage_counters", ["key", "count", "expires_at"]],
  ])("%s の列が仕様どおり", (table, expected) => {
    expect(columns(table).map((c) => c.name)).toEqual(expected);
  });

  it.each([
    ["uploaded_photos", ["field_id", "taken_at"]],
    ["photo_assignments", ["from_field_id"]],
    ["field_status_events", ["note", "revoked_at"]],
    ["usage_counters", []],
  ])("%s で NULL を許すのは決まった列だけ", (table, nullable) => {
    const actual = columns(table)
      .filter((c) => c.notnull === 0 && c.pk === 0)
      .map((c) => c.name);
    expect(actual).toEqual(nullable);
  });
});

describe("持ってはいけない列", () => {
  it.each([
    ["撮影位置（K6）", /(^|_)(lat|lng|lon|latitude|longitude|gps|distance|dist|coord|coords|location)(_|$)/],
    ["水分（K16）", /(^|_)(moisture|water)(_|$)/],
  ])("%s の列が無い", (_name, pattern) => {
    const names = tables().flatMap((t) => columns(t).map((c) => c.name));
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => pattern.test(n))).toEqual([]);
  });
});

const NOW = "2026-11-03T00:00:00.000Z";

function insertPhoto(overrides: Record<string, string | number | null> = {}): void {
  const row: Record<string, string | number | null> = {
    id: "photo-1",
    field_id: null,
    state: "unconfirmed",
    candidate_field_ids: '["A-01"]',
    taken_at: null,
    taken_at_source: "none",
    content_hash: "a".repeat(64),
    r2_key: "uploads/photo-1.jpg",
    width: 1600,
    height: 1200,
    bytes: 1000,
    uploader_device: "dev-0001",
    uploaded_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
  const names = Object.keys(row);
  db.prepare(
    `INSERT INTO uploaded_photos (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
  ).run(...Object.values(row));
}

function countPhotos(): unknown {
  return db.prepare("SELECT count(*) AS n FROM uploaded_photos").get();
}

describe("uploaded_photos の値", () => {
  it("番号なし・日付なしの未確定の写真が入る", () => {
    insertPhoto();
    expect(countPhotos()).toEqual({ n: 1 });
  });

  it.each([
    ["confirmed", { state: "confirmed", field_id: "A-01" }],
    ["xmp", { taken_at_source: "xmp", taken_at: "2026-07-21" }],
    ["exif", { taken_at_source: "exif", taken_at: "2026-07-21" }],
  ])("%s が入る", (_name, overrides) => {
    insertPhoto(overrides);
    expect(countPhotos()).toEqual({ n: 1 });
  });

  it.each([
    ["state", { state: "deleted" }],
    ["taken_at_source", { taken_at_source: "gps" }],
  ])("%s が不正なら拒否", (_name, overrides) => {
    expect(() => insertPhoto(overrides)).toThrow(/CHECK constraint failed/);
  });
});
