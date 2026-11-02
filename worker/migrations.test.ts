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
