/**
 * 写真の保存先の約束（docs/spec.md §6 の L0 の API）。画面はこの約束だけを知る。
 * 実体は fetch で API を呼ぶもの（implementations/http-photo-repository.ts）。テストでは偽物を差し込む。
 */
import type { UploadedPhoto, UploadMeta } from "@/types";

/** POST /api/session の結果 */
export type LoginOutcome = "ok" | "wrong" | "too-many" | "network-error" | "error";

/** POST /api/uploads の結果 */
export type UploadOutcome =
  | { kind: "created"; id: string }
  | { kind: "duplicate"; id: string }
  | { kind: "unauthorized" }
  | { kind: "too-large" }
  | { kind: "rejected" }
  | { kind: "network-error" }
  | { kind: "error" };

/** GET /api/photos/recent の結果 */
export type RecentOutcome = { kind: "ok"; photos: UploadedPhoto[] } | { kind: "network-error" } | { kind: "error" };

export interface IPhotoRepository {
  /** 合言葉で入る（成功すると Cookie が付く） */
  login(passphrase: string): Promise<LoginOutcome>;
  /** 縮小済みの画像と meta を送る。撮影位置・距離は meta に入れない（K6） */
  upload(image: Blob, meta: UploadMeta): Promise<UploadOutcome>;
  /** 未確定を含む新着 */
  listRecent(limit: number): Promise<RecentOutcome>;
}
