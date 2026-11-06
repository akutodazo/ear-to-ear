/**
 * LINE に 1 枚の共有の保存先の約束（POST /api/shares、#159・#161）。画面はこの約束だけを知る。
 * 絵（JPEG）と番号の並びを送り、LINE に貼る URL を受け取る。座標・距離は送らない（K6）
 */
import type { OrderShareMeta } from "@/services/order-share-meta";

export interface OrderShare {
  id: string;
  /** LINE に貼る URL（https の絶対 URL。開くと OGP 付きのページ） */
  url: string;
  expiresAt: string;
}

/** rejected の reason は 422 の本文の理由のコード（読めなければ null） */
export type CreateOrderShareOutcome =
  | { kind: "created"; share: OrderShare }
  | { kind: "unauthorized" }
  | { kind: "too-large" }
  | { kind: "rejected"; reason: string | null }
  | { kind: "usage-limit" }
  | { kind: "network-error" }
  | { kind: "error" };

export interface IOrderShareRepository {
  create(image: Blob, meta: OrderShareMeta): Promise<CreateOrderShareOutcome>;
}
