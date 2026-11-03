import { describe, expect, it } from "vitest";
import { createTestDb } from "./test-db";

describe("テスト用の D1", () => {
  it("migrations の表があり、行が無ければ first は null", async () => {
    const { db } = createTestDb();
    expect(await db.prepare("SELECT count FROM usage_counters WHERE key = ?").bind("k").first()).toBeNull();
  });

  it("bind した値で書き、UPSERT が数え、run が changes を返す", async () => {
    const { db, raw } = createTestDb();
    const upsert =
      "INSERT INTO usage_counters (key, count, expires_at) VALUES (?, 1, ?) " +
      "ON CONFLICT(key) DO UPDATE SET count = count + 1";
    expect(await db.prepare(upsert).bind("k", "2026-11-03T00:10:00.000Z").run()).toEqual({ meta: { changes: 1 } });
    await db.prepare(upsert).bind("k", "2026-11-03T00:10:00.000Z").run();
    expect(raw.prepare("SELECT key, count, expires_at FROM usage_counters").all()).toEqual([
      { key: "k", count: 2, expires_at: "2026-11-03T00:10:00.000Z" },
    ]);
  });

  it("bind は元の文を変えない（同じ prepare を別の値で使える）", async () => {
    const { db, raw } = createTestDb();
    raw.exec("INSERT INTO usage_counters VALUES ('a', 1, 'x'), ('b', 2, 'x')");
    const stmt = db.prepare("SELECT count FROM usage_counters WHERE key = ?");
    expect(await stmt.bind("a").first()).toEqual({ count: 1 });
    expect(await stmt.bind("b").first()).toEqual({ count: 2 });
  });

  it("batch は1つでも失敗すれば全部を戻して投げる", async () => {
    const { db, raw } = createTestDb();
    const insert = "INSERT INTO usage_counters (key, count, expires_at) VALUES (?, 1, 'x')";
    await expect(db.batch([db.prepare(insert).bind("a"), db.prepare(insert).bind("a")])).rejects.toThrow(/UNIQUE/);
    expect(raw.prepare("SELECT key FROM usage_counters").all()).toEqual([]);
  });
});
