/**
 * 刈る順番を端末の中に保存する実体（11-05）。共有の保存先（Worker・D1。先輩の担当）ができるまでのもの。
 * この端末でしか見えない（委員長が確定しても、ほかの委員の端末には届かない）。保存場所は引数で注入する
 */
import type { IHarvestOrderRepository, LoadOrderOutcome, OrderWork, SavedOrder, SaveOrderOutcome } from "@/repositories/interfaces/i-harvest-order-repository";

/** localStorage と同じ形（テストでは偽物を入れる） */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const keyOf = (district: string, season: string) => `ear-to-ear:order:${season}:${district}`;
/** 並べ途中は保存した順と別の鍵（確定した順を下書きで上書きしない） */
const workKeyOf = (district: string, season: string) => `ear-to-ear:order-work:${season}:${district}`;

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** 知らない形は無いものとして扱う */
function parse(raw: string | null, district: string, season: string): SavedOrder | null {
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw) as Partial<SavedOrder> | null;
    if (v === null || typeof v !== "object") return null;
    if (!isStringArray(v.ranked) || !isStringArray(v.unranked)) return null;
    if (v.state !== "draft" && v.state !== "confirmed") return null;
    if (typeof v.savedAt !== "string") return null;
    const confirmedAt = typeof v.confirmedAt === "string" ? v.confirmedAt : null;
    return { district, season, ranked: v.ranked, unranked: v.unranked, state: v.state, savedAt: v.savedAt, confirmedAt };
  } catch {
    return null;
  }
}

function parseWork(raw: string | null): OrderWork | null {
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw) as Partial<OrderWork> | null;
    if (v === null || typeof v !== "object" || !isStringArray(v.ranked) || !isStringArray(v.unranked)) return null;
    return { ranked: v.ranked, unranked: v.unranked };
  } catch {
    return null;
  }
}

export function createLocalHarvestOrderRepository(storage: StorageLike, now: () => Date = () => new Date()): IHarvestOrderRepository {
  return {
    async load(district, season): Promise<LoadOrderOutcome> {
      try {
        return { kind: "ok", order: parse(storage.getItem(keyOf(district, season)), district, season) };
      } catch {
        return { kind: "error" };
      }
    },

    async save(input): Promise<SaveOrderOutcome> {
      const at = now().toISOString();
      const order: SavedOrder = { ...input, ranked: [...input.ranked], unranked: [...input.unranked], savedAt: at, confirmedAt: input.state === "confirmed" ? at : null };
      try {
        storage.setItem(keyOf(input.district, input.season), JSON.stringify(order));
        return { kind: "ok", order };
      } catch {
        return { kind: "error" };
      }
    },

    async loadWork(district, season) {
      try {
        return parseWork(storage.getItem(workKeyOf(district, season)));
      } catch {
        return null;
      }
    },

    async saveWork(district, season, work) {
      try {
        if (work === null) storage.removeItem(workKeyOf(district, season));
        else storage.setItem(workKeyOf(district, season), JSON.stringify({ ranked: [...work.ranked], unranked: [...work.unranked] }));
      } catch {
        // 書けない（非公開の窓など）ときは残さない。並べた順は画面の中には残っている
      }
    },
  };
}
