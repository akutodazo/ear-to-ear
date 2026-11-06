import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";

// 0001〜0003 の上に 0004 を流す（本物の D1 と同じ順、#159）
const SQL = ["0001_init.sql", "0002_handover.sql", "0003_settings.sql", "0004_order_shares.sql"].map((name) =>
  readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"),
);

let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  for (const sql of SQL) db.exec(sql);
});

describe("0004_order_shares（LINE に 1 枚、#159）", () => {
  it("order_shares を足す", () => {
    const names = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name <> 'sqlite_sequence'").all() as unknown as {
        name: string;
      }[]
    ).map((r) => r.name);
    expect(names).toContain("order_shares");
  });

  it("列に座標・距離が無く、すべて NOT NULL、id が主キー", () => {
    const cols = db.prepare("PRAGMA table_info(order_shares)").all() as unknown as { name: string; notnull: number; pk: number }[];
    expect(cols.map((c) => c.name)).toEqual([
      "id",
      "season",
      "district",
      "ranked",
      "benchmark_id",
      "confirmed_at",
      "r2_key",
      "bytes",
      "width",
      "height",
      "actor_device",
      "created_at",
      "expires_at",
    ]);
    // benchmark_id だけ null を許す
    expect(cols.filter((c) => c.notnull === 0).map((c) => c.name)).toEqual(["benchmark_id"]);
    expect(cols.filter((c) => c.pk === 1).map((c) => c.name)).toEqual(["id"]);
  });

  it("expires_at に索引がある（期限切れを消す）", () => {
    const indexes = db.prepare("PRAGMA index_list(order_shares)").all() as unknown as { name: string }[];
    const columns = indexes.flatMap(
      (i) => (db.prepare(`PRAGMA index_info(${i.name})`).all() as unknown as { name: string }[]).map((c) => c.name),
    );
    expect(columns).toContain("expires_at");
  });
});
