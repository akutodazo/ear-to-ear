/**
 * 写真の保存先の約束（docs/spec.md §6 の L0 の API）。画面はこの約束だけを知る。
 * 実体は fetch で API を呼ぶもの（implementations/http-photo-repository.ts）。テストでは偽物を差し込む。
 */
import type { Role, UploadedPhoto, UploadMeta } from "@/types";

/** POST /api/session の結果 */
export type LoginOutcome = "ok" | "wrong" | "too-many" | "network-error" | "error";

/** DELETE /api/session の結果（出る。11-08） */
export type LogoutOutcome = "ok" | "network-error" | "error";

/** POST /api/uploads の結果 */
export type UploadOutcome =
  | { kind: "created"; id: string }
  | { kind: "duplicate"; id: string }
  | { kind: "unauthorized" }
  | { kind: "too-large" }
  | { kind: "rejected" }
  | { kind: "network-error" }
  | { kind: "error" };

/** GET /api/photos/recent・GET /api/photos?fieldId= の結果 */
export type RecentOutcome = { kind: "ok"; photos: UploadedPhoto[] } | { kind: "network-error" } | { kind: "error" };

/** GET /api/session の結果。入っていない（401）ときは role が null */
export type RoleOutcome = { kind: "ok"; role: Role | null } | { kind: "network-error" } | { kind: "error" };

/** PATCH /api/photos/:id/assignment の結果 */
export type AssignOutcome =
  | "ok"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "rejected"
  | "network-error"
  | "error";

export interface IPhotoRepository {
  /** 合言葉で入る（成功すると Cookie が付く） */
  login(passphrase: string): Promise<LoginOutcome>;
  /** 出る（Cookie は HttpOnly なので、サーバーに消してもらう） */
  logout(): Promise<LogoutOutcome>;
  /** 縮小済みの画像と meta を送る。撮影位置・距離は meta に入れない（K6） */
  upload(image: Blob, meta: UploadMeta): Promise<UploadOutcome>;
  /** 未確定を含む新着 */
  listRecent(limit: number): Promise<RecentOutcome>;
  /** その圃場に確定済みの写真（圃場ページ。並びはサーバーの順のまま） */
  listFieldPhotos(fieldId: string): Promise<RecentOutcome>;
  /** この端末の役割（画面が「確定・変更」を出すかを決める。守るのはサーバー） */
  getRole(): Promise<RoleOutcome>;
  /** 管理者が番号を確定・変更する（履歴はサーバーが残す） */
  assign(photoId: string, fieldId: string): Promise<AssignOutcome>;
}
