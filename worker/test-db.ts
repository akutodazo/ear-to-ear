/**
 * テスト用の D1（人が書く。檻の外）。node:sqlite のメモリの DB に migrations/ を全部流し、DbPort に包む。
 * SQL の文字列には依存しないので、実装の SQL が少し違っても意味が同じなら通る。
 */
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { DbPort, StmtPort } from "./deps";

const MIGRATIONS = new URL("../migrations/", import.meta.url);

export interface TestDb {
  db: DbPort;
  /** テストが表を直接読む・書くための生の DB */
  raw: DatabaseSync;
}

function statement(raw: DatabaseSync, sql: string, values: SQLInputValue[] = []): StmtPort {
  return {
    bind: (...next: unknown[]) => statement(raw, sql, next as SQLInputValue[]),
    first: async <T>() => (raw.prepare(sql).get(...values) ?? null) as T | null,
    all: async <T>() => ({ results: raw.prepare(sql).all(...values) as T[] }),
    run: async () => ({ meta: { changes: Number(raw.prepare(sql).run(...values).changes) } }),
  };
}

export function createTestDb(): TestDb {
  const raw = new DatabaseSync(":memory:");
  for (const name of readdirSync(MIGRATIONS).filter((n) => n.endsWith(".sql")).sort()) {
    raw.exec(readFileSync(new URL(name, MIGRATIONS), "utf8"));
  }
  const db: DbPort = {
    prepare: (sql) => statement(raw, sql),
    batch: async (statements) => {
      raw.exec("BEGIN");
      try {
        const results = [];
        for (const stmt of statements) results.push(await stmt.all());
        raw.exec("COMMIT");
        return results;
      } catch (error) {
        raw.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { db, raw };
}
