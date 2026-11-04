/**
 * 画面が使う判断と地図の保存先を作る。API は同じ配信元（docs/spec.md §8）。
 * Repository の実体を知るのは Presenter（src/hooks/）だけ（AGENTS.md §4）。
 */
import type { IFieldStatusRepository } from "./interfaces/i-field-status-repository";
import { createHttpFieldStatusRepository } from "./implementations/http-field-status-repository";

export function createFieldStatusRepository(): IFieldStatusRepository {
  return createHttpFieldStatusRepository((input, init) => fetch(input, init));
}
