/**
 * 画面が使う LINE に 1 枚の共有の保存先を作る。API は同じ配信元（docs/spec.md §8）。
 * Repository の実体を知るのは Presenter（src/hooks/）だけ（AGENTS.md §4）。
 */
import type { IOrderShareRepository } from "./interfaces/i-order-share-repository";
import { createHttpOrderShareRepository } from "./implementations/http-order-share-repository";

export function createOrderShareRepository(): IOrderShareRepository {
  return createHttpOrderShareRepository((input, init) => fetch(input, init));
}
