import { describe, expect, it, vi } from "vitest";
import { createTestDb } from "./test-db";
import { fakeDeps, request } from "./test-helpers";

// 攻撃役（T26 の 2 回目）: statusEventFromRow を使わず行の写しを自前で書いても通った。
// 行の写しは Service に 1 か所だけ（T23・T24 と同じ決まり）なので、差し替えて全行が通ることを確かめる
const statusEventFromRow = vi.fn();
vi.mock("@/services/status-events", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/status-events")>();
  return {
    ...original,
    statusEventFromRow: (row: Parameters<typeof original.statusEventFromRow>[0]) => statusEventFromRow(row),
  };
});

const { handleRequest } = await import("./app");

describe("GET /api/fields/:id/status-events は行の写しを statusEventFromRow に任せる（T26）", () => {
  it("全行を新しい順に statusEventFromRow に渡し、その戻りをそのまま返す", async () => {
    const testDb = createTestDb();
    for (const [id, at] of [
      [1, "2026-07-20T01:00:00.000Z"],
      [2, "2026-07-25T01:00:00.000Z"],
      [3, "2026-07-22T01:00:00.000Z"],
    ] as const) {
      testDb.raw
        .prepare(
          "INSERT INTO field_status_events (id, field_id, status, reasons, note, ref_photo_ids, actor_device, at) VALUES (?, 'A-06', 'ready', '[]', NULL, '[]', 'dev-x', ?)",
        )
        .run(id, at);
    }
    statusEventFromRow.mockImplementation((row: { id: number }) => ({ replaced: row.id }));
    const response = await handleRequest(request("GET", "/api/fields/A-06/status-events"), fakeDeps({ db: testDb.db }));
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual([{ replaced: 2 }, { replaced: 3 }, { replaced: 1 }]);
    expect(statusEventFromRow).toHaveBeenCalledTimes(3);
    expect(statusEventFromRow.mock.calls[0][0]).toMatchObject({ id: 2, field_id: "A-06", reasons: "[]" });
  });
});
