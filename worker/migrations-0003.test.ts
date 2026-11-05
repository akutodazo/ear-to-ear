import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";

// 0001・0002 の上に 0003 を流す（本物の D1 と同じ順、#139）
const SQL = ["0001_init.sql", "0002_handover.sql", "0003_settings.sql"].map((name) =>
  readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"),
);

let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  for (const sql of SQL) db.exec(sql);
});

describe("0003_settings（L8、#139）", () => {
  it("settings を足す（ほかの表は変えない）", () => {
    const names = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name <> 'sqlite_sequence'").all() as unknown as {
        name: string;
      }[]
    )
      .map((r) => r.name)
      .sort();
    expect(names).toEqual([
      "field_status_events",
      "handover_notes",
      "photo_assignments",
      "settings",
      "uploaded_photos",
      "usage_counters",
    ]);
  });

  it("列は key と value の 2 つで NOT NULL、key が主キー", () => {
    const cols = db.prepare("PRAGMA table_info(settings)").all() as unknown as {
      name: string;
      notnull: number;
      pk: number;
    }[];
    expect(cols.map((c) => [c.name, c.notnull, c.pk])).toEqual([
      ["key", 1, 1],
      ["value", 1, 0],
    ]);
  });

  it("同じ key は 2 行にならず、UPSERT で上書きできる", () => {
    const upsert = db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    );
    upsert.run("line_group_id", "first");
    upsert.run("line_group_id", "second");
    expect(db.prepare("SELECT key, value FROM settings").all()).toEqual([{ key: "line_group_id", value: "second" }]);
    expect(() => db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("line_group_id", "x")).toThrow(
      /UNIQUE/,
    );
  });

  it("value の NULL は入らない", () => {
    expect(() => db.prepare("INSERT INTO settings (key, value) VALUES (?, NULL)").run("k")).toThrow(/NOT NULL/);
  });
});
