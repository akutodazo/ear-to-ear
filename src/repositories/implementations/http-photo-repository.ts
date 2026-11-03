/**
 * fetch で L0 の API（docs/spec.md §6）を呼ぶ写真の保存先。fetch は引数で受け取る（AGENTS.md §4）。
 * HTTP の状態を画面の言葉の手前の「結果の種類」に読み分けるだけで、画面の文言は持たない。
 */
import type { IPhotoRepository } from "../interfaces/i-photo-repository";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function createHttpPhotoRepository(fetchFn: FetchLike, baseUrl = ""): IPhotoRepository {
  void fetchFn;
  void baseUrl;
  throw new Error("not implemented");
}
