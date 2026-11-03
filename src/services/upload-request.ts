/**
 * 送る meta（docs/spec.md §6）を組み立てる。純粋関数。
 * **撮影位置と候補までの距離はここで落とす**（K6）。送ってよいのは UploadMeta の5項目だけ。
 */
import type { TakenAtSource, UploadMeta } from "@/types";

export interface UploadMetaInput {
  contentHash: string;
  takenAt: string | null;
  takenAtSource: TakenAtSource;
  /** 近い順の番号（距離は持たせない） */
  candidateFieldIds: readonly string[];
  chosenFieldId: string | null;
}

export function buildUploadMeta(input: UploadMetaInput): UploadMeta {
  void input;
  throw new Error("not implemented");
}
