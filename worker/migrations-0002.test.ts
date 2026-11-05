import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";

// 0001 の上に 0002 を流す（本物の D1 と同じ順）
const SQL_0001 = readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8");
const SQL_0002 = readFileSync(new URL("../migrations/0002_handover.sql", import.meta.url), "utf8");

let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(SQL_0001);
  db.exec(SQL_0002);
});

const BODY = JSON.stringify({ records: [], blocks: [] });

function insert(fieldId: string, season: string, body = BODY): void {
  db.prepare("INSERT INTO handover_notes (field_id, season, body, model, created_at) VALUES (?, ?, ?, ?, ?)").run(
    fieldId,
    season,
    body,
    "claude-sonnet-5-5",
    "2026-11-05T01:00:00.000Z",
  );
}

describe("0002_handover（T29）", () => {
  it("handover_notes を足す（settings は L8 のときに足す）", () => {
    const names = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name <> 'sqlite_sequence'").all() as unknown as {
        name: string;
      }[]
    )
      .map((r) => r.name)
      .sort();
    expect(names).toEqual(["field_status_events", "handover_notes", "photo_assignments", "uploaded_photos", "usage_counters"]);
  });

  it("列は 5 つで、すべて NOT NULL、主キーは field_id と season", () => {
    const cols = db.prepare("PRAGMA table_xinfo(handover_notes)").all() as unknown as {
      name: string;
      notnull: number;
      pk: number;
    }[];
    expect(cols.map((c) => c.name)).toEqual(["field_id", "season", "body", "model", "created_at"]);
    expect(cols.every((c) => c.notnull === 1)).toBe(true);
    expect(cols.filter((c) => c.pk > 0).map((c) => c.name)).toEqual(["field_id", "season"]);
  });

  it("同じ圃場・同じシーズンは 1 件だけ（2 件目は失敗）、シーズンが違えば入る", () => {
    insert("A-06", "2026");
    insert("A-06", "2025");
    insert("A-07", "2026");
    expect(() => insert("A-06", "2026")).toThrow(/UNIQUE/);
  });

  it("body が JSON でなければ入らない", () => {
    expect(() => insert("A-06", "2026", "{records")).toThrow(/CHECK/);
  });
});
