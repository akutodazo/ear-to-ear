/**
 * 画面が使う写真の保存先を作る。API は同じ配信元（Worker が静的アセットと API を両方返す。docs/spec.md §8）。
 * Repository の実体を知るのは Presenter（src/hooks/）だけ（AGENTS.md §4）。
 */
import type { IPhotoRepository } from "./interfaces/i-photo-repository";
import { createHttpPhotoRepository } from "./implementations/http-photo-repository";

export function createPhotoRepository(): IPhotoRepository {
  return createHttpPhotoRepository((input, init) => fetch(input, init));
}
