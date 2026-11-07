import { describe, expect, it } from "vitest";
import { createLocalHarvestOrderRepository, type StorageLike } from "./local-harvest-order-repository";

/** 偽の保存場所（Map で持つ） */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  return { storage, data };
}

const now = () => new Date("2026-07-22T03:00:00.000Z");

describe("端末の中の刈る順番の保存先", () => {
  it("保存したものを地区・年ごとに読める。無ければ null", async () => {
    const { storage } = memoryStorage();
    const repo = createLocalHarvestOrderRepository(storage, now);
    expect(await repo.load("北地区", "2026")).toEqual({ kind: "ok", order: null });
    const saved = await repo.save({ district: "北地区", season: "2026", ranked: ["A-03", "A-04"], unranked: ["A-01"], state: "draft" });
    expect(saved).toEqual({
      kind: "ok",
      order: { district: "北地区", season: "2026", ranked: ["A-03", "A-04"], unranked: ["A-01"], state: "draft", savedAt: "2026-07-22T03:00:00.000Z", confirmedAt: null },
    });
    expect(await repo.load("北地区", "2026")).toEqual(saved);
    expect(await repo.load("中地区", "2026")).toEqual({ kind: "ok", order: null });
  });

  it("確定すると confirmedAt が付く", async () => {
    const repo = createLocalHarvestOrderRepository(memoryStorage().storage, now);
    const r = await repo.save({ district: "北地区", season: "2026", ranked: ["A-03"], unranked: [], state: "confirmed" });
    expect(r.kind === "ok" && r.order.confirmedAt).toBe("2026-07-22T03:00:00.000Z");
  });

  it("壊れた中身・知らない形は無いものとして扱う", async () => {
    const bad = memoryStorage({ "ear-to-ear:order:2026:北地区": "{oops", "ear-to-ear:order:2026:中地区": JSON.stringify({ ranked: "A-01" }) });
    const repo = createLocalHarvestOrderRepository(bad.storage, now);
    expect(await repo.load("北地区", "2026")).toEqual({ kind: "ok", order: null });
    expect(await repo.load("中地区", "2026")).toEqual({ kind: "ok", order: null });
  });

  it("保存場所が使えないときは error（例外にしない）", async () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const repo = createLocalHarvestOrderRepository(broken, now);
    expect(await repo.load("北地区", "2026")).toEqual({ kind: "error" });
    expect(await repo.save({ district: "北地区", season: "2026", ranked: [], unranked: [], state: "draft" })).toEqual({ kind: "error" });
  });
});

// 並べ途中（保存していない変更）を、変えるたびに端末に残す（11-06 地図の精査 #2: 画面を移ると知らせなく消えていた）。
// 保存した順・確定した順とは別の鍵に置き、確定した順を下書きで上書きしない
describe("並べ途中を端末に残す", () => {
  it("地区・年ごとに残して読める。保存した順の鍵とは別。null で消える", async () => {
    const { storage } = memoryStorage();
    const repo = createLocalHarvestOrderRepository(storage, now);
    expect(await repo.loadWork("中地区", "2026")).toBeNull();
    await repo.saveWork("中地区", "2026", { ranked: ["A-07", "A-06"], unranked: ["A-05"] });
    expect(await repo.loadWork("中地区", "2026")).toEqual({ ranked: ["A-07", "A-06"], unranked: ["A-05"] });
    expect(await repo.loadWork("北地区", "2026")).toBeNull();
    expect(await repo.load("中地区", "2026")).toEqual({ kind: "ok", order: null });
    await repo.saveWork("中地区", "2026", null);
    expect(await repo.loadWork("中地区", "2026")).toBeNull();
  });

  it("確定した順を残したまま、並べ途中だけを別に持てる", async () => {
    const { storage } = memoryStorage();
    const repo = createLocalHarvestOrderRepository(storage, now);
    await repo.save({ district: "中地区", season: "2026", ranked: ["A-05"], unranked: ["A-06"], state: "confirmed" });
    await repo.saveWork("中地区", "2026", { ranked: ["A-06", "A-05"], unranked: [] });
    const loaded = await repo.load("中地区", "2026");
    expect(loaded.kind === "ok" && loaded.order?.state).toBe("confirmed");
    expect(loaded.kind === "ok" && loaded.order?.ranked).toEqual(["A-05"]);
  });

  it("壊れた中身・保存場所が使えないときは null（例外にしない）", async () => {
    const bad = memoryStorage({ "ear-to-ear:order-work:2026:中地区": "{oops", "ear-to-ear:order-work:2026:北地区": JSON.stringify({ ranked: [1] }) });
    const repo = createLocalHarvestOrderRepository(bad.storage, now);
    expect(await repo.loadWork("中地区", "2026")).toBeNull();
    expect(await repo.loadWork("北地区", "2026")).toBeNull();
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const brokenRepo = createLocalHarvestOrderRepository(broken, now);
    expect(await brokenRepo.loadWork("中地区", "2026")).toBeNull();
    await expect(brokenRepo.saveWork("中地区", "2026", { ranked: [], unranked: [] })).resolves.toBeUndefined();
  });
});
