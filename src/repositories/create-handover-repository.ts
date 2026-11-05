/**
 * 画面が使う引き継ぎメモの保存先を作る。API は同じ配信元（docs/spec.md §8）。
 * Repository の実体を知るのは Presenter（src/hooks/）だけ（AGENTS.md §4）。
 */
import type { IHandoverRepository } from "./interfaces/i-handover-repository";
import { createHttpHandoverRepository } from "./implementations/http-handover-repository";

export function createHandoverRepository(): IHandoverRepository {
  return createHttpHandoverRepository((input, init) => fetch(input, init));
}
