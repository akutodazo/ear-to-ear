/**
 * fetch で POST /api/shares（#159）を呼ぶ保存先。fetch は引数で受け取る（AGENTS.md §4）。
 * HTTP の状態を「結果の種類」に読み分けるだけで、画面の文言は持たない。
 */
import type { OrderShareMeta } from "@/services/order-share-meta";
import type { CreateOrderShareOutcome, IOrderShareRepository, OrderShare } from "@/repositories/interfaces/i-order-share-repository";
import { send, type FetchLike } from "./http-photo-repository";

async function readShare(response: Response): Promise<OrderShare | null> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null) return null;
  const { id, url, expiresAt } = body as Record<string, unknown>;
  if (typeof id !== "string" || typeof url !== "string" || typeof expiresAt !== "string") return null;
  // LINE に貼る URL。https（手元の wrangler dev では http://localhost）だけを受ける
  if (!/^https?:\/\//.test(url)) return null;
  return { id, url, expiresAt };
}

async function readReason(response: Response): Promise<string | null> {
  try {
    const reason = ((await response.json()) as { reason?: unknown } | null)?.reason;
    return typeof reason === "string" ? reason : null;
  } catch {
    return null;
  }
}

export function createHttpOrderShareRepository(fetchFn: FetchLike, baseUrl = ""): IOrderShareRepository {
  return {
    async create(image: Blob, meta: OrderShareMeta): Promise<CreateOrderShareOutcome> {
      const form = new FormData();
      form.append("image", image, "order.jpg");
      form.append("meta", JSON.stringify(meta));
      const response = await send(fetchFn, `${baseUrl}/api/shares`, { method: "POST", body: form });
      if (response === null) return { kind: "network-error" };
      switch (response.status) {
        case 201: {
          const share = await readShare(response);
          return share === null ? { kind: "error" } : { kind: "created", share };
        }
        case 401:
          return { kind: "unauthorized" };
        case 413:
          return { kind: "too-large" };
        case 422:
          return { kind: "rejected", reason: await readReason(response) };
        case 429:
          return { kind: "usage-limit" };
        default:
          return { kind: "error" };
      }
    },
  };
}
