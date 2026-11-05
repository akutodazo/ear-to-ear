// #59（レビュー #7）: 合言葉の失敗のときに、usage_counters の期限の過ぎた行を消す（11-04 先輩決定）
import { describe, expect, it } from "vitest";
import { LOGIN_MAX_ATTEMPTS_PER_WINDOW } from "@/config";
import { handleRequest } from "./app";
import type { Deps } from "./deps";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, jsonRequest } from "./test-helpers";

// NOW_MS（test-helpers）は 2026-10-26T07:33:20Z
const NOW_ISO = "2026-10-26T07:33:20.000Z";
const IP = "203.0.113.7";

function setup(): { deps: Deps; testDb: TestDb } {
  const testDb = createTestDb();
  const deps = fakeDeps({
    db: testDb.db,
    matchPassphrase: async (input) => (input === "member-pass-for-test" ? "member" : null),
  });
  return { deps, testDb };
}

function seed(testDb: TestDb, rows: [string, number, string][]): void {
  const insert = testDb.raw.prepare("INSERT INTO usage_counters (key, count, expires_at) VALUES (?, ?, ?)");
  for (const row of rows) insert.run(...row);
}

function keys(testDb: TestDb): string[] {
  return (testDb.raw.prepare("SELECT key FROM usage_counters ORDER BY key").all() as { key: string }[]).map(
    (r) => r.key,
  );
}

const login = (deps: Deps, passphrase: string, ip = IP) =>
  handleRequest(jsonRequest("POST", "/api/session", JSON.stringify({ passphrase }), { "cf-connecting-ip": ip }), deps);

const OLD = [
  ["login:old-ip:2026-10-26T07:10", 5, "2026-10-26T07:20:00.000Z"],
  ["login:old-ip:2026-10-25T23:50", 2, "2026-10-26T00:00:00.000Z"],
  ["claude:2026-10-25", 12, "2026-10-25T15:00:00.000Z"],
] as [string, number, string][];
const LIVE = [
  ["claude:2026-10-26", 3, "2026-10-26T15:00:00.000Z"],
  ["login:other-ip:2026-10-26T07:30", 1, "2026-10-26T07:40:00.000Z"],
] as [string, number, string][];

describe("POST /api/session 失敗のときの掃除（#59）", () => {
  it("401 のとき、期限の過ぎた行を消し、期限内の行と今の失敗の行は残す", async () => {
    const { deps, testDb } = setup();
    seed(testDb, [...OLD, ...LIVE]);
    const response = await login(deps, "wrong");
    expect(response.status).toBe(401);
    const left = keys(testDb);
    for (const [key] of OLD) expect(left).not.toContain(key);
    for (const [key] of LIVE) expect(left).toContain(key);
    expect(left.filter((k) => k.startsWith("login:") && k.endsWith(":2026-10-26T07:30"))).toHaveLength(2);
    expect(left).toHaveLength(LIVE.length + 1);
  });

  it("期限がちょうど今の行は残す（過ぎたものだけ消す）", async () => {
    const { deps, testDb } = setup();
    seed(testDb, [["login:edge:2026-10-26T07:20", 1, NOW_ISO]]);
    await login(deps, "wrong");
    expect(keys(testDb)).toContain("login:edge:2026-10-26T07:20");
  });

  it("今の失敗の数え方は変わらない（同じ IP の 2 回目で count 2）", async () => {
    const { deps, testDb } = setup();
    seed(testDb, OLD);
    await login(deps, "wrong");
    await login(deps, "wrong");
    const rows = testDb.raw.prepare("SELECT count FROM usage_counters").all() as { count: number }[];
    expect(rows).toEqual([{ count: 2 }]);
  });

  it("429（枠が満杯）のときは書き込まないので、古い行も消さない", async () => {
    const { deps, testDb } = setup();
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS_PER_WINDOW; i++) await login(deps, "wrong");
    seed(testDb, OLD);
    const response = await login(deps, "wrong");
    expect(response.status).toBe(429);
    for (const [key] of OLD) expect(keys(testDb)).toContain(key);
  });

  it("成功（204）のときは掃除しない（成功の道は書き込みを増やさない）", async () => {
    const { deps, testDb } = setup();
    seed(testDb, OLD);
    expect((await login(deps, "member-pass-for-test")).status).toBe(204);
    for (const [key] of OLD) expect(keys(testDb)).toContain(key);
  });
});
