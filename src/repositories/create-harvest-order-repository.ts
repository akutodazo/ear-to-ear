/**
 * 画面が使う刈る順番の保存先を作る。いまは端末の中（共有の API ができたら HTTP の実体に差し替える）。
 * Repository の実体を知るのは Presenter（src/hooks/）だけ（AGENTS.md §4）
 */
import type { IHarvestOrderRepository } from "./interfaces/i-harvest-order-repository";
import { createLocalHarvestOrderRepository, type StorageLike } from "./implementations/local-harvest-order-repository";

/** 保存場所が使えない（非公開の窓など）ときは、読めない・書けないとして扱う */
const unavailable: StorageLike = {
  getItem: () => {
    throw new Error("storage unavailable");
  },
  setItem: () => {
    throw new Error("storage unavailable");
  },
};

export function createHarvestOrderRepository(): IHarvestOrderRepository {
  let storage: StorageLike = unavailable;
  try {
    if (typeof window !== "undefined" && window.localStorage) storage = window.localStorage;
  } catch {
    storage = unavailable;
  }
  return createLocalHarvestOrderRepository(storage);
}
