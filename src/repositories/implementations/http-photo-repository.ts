/**
 * fetch で L0 の API（docs/spec.md §6）を呼ぶ写真の保存先。fetch は引数で受け取る（AGENTS.md §4）。
 * HTTP の状態を画面の言葉の手前の「結果の種類」に読み分けるだけで、画面の文言は持たない。
 */
import type { UploadedPhoto, UploadMeta } from "@/types";
import type {
  AssignOutcome,
  IPhotoRepository,
  LoginOutcome,
  RecentOutcome,
  RoleOutcome,
  UploadOutcome,
} from "@/repositories/interfaces/i-photo-repository";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** つながらない（fetch そのものが失敗した）ときは null */
async function send(fetchFn: FetchLike, url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetchFn(url, init);
  } catch {
    return null;
  }
}

/** 応答の本文の id。読めなければ null */
async function readId(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    const id = (body as { id?: unknown } | null)?.id;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}

export function createHttpPhotoRepository(fetchFn: FetchLike, baseUrl = ""): IPhotoRepository {
  return {
    async login(passphrase: string): Promise<LoginOutcome> {
      const response = await send(fetchFn, `${baseUrl}/api/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (response === null) return "network-error";
      if (response.status === 204) return "ok";
      if (response.status === 401) return "wrong";
      if (response.status === 429) return "too-many";
      return "error";
    },

    async upload(image: Blob, meta: UploadMeta): Promise<UploadOutcome> {
      const form = new FormData();
      form.append("image", image, "photo.jpg");
      form.append("meta", JSON.stringify(meta));
      const response = await send(fetchFn, `${baseUrl}/api/uploads`, { method: "POST", body: form });
      if (response === null) return { kind: "network-error" };
      switch (response.status) {
        case 201:
        case 409: {
          const id = await readId(response);
          if (id === null) return { kind: "error" };
          return response.status === 201 ? { kind: "created", id } : { kind: "duplicate", id };
        }
        case 401:
          return { kind: "unauthorized" };
        case 413:
          return { kind: "too-large" };
        case 415:
        case 422:
          return { kind: "rejected" };
        default:
          return { kind: "error" };
      }
    },

    async listRecent(limit: number): Promise<RecentOutcome> {
      const response = await send(fetchFn, `${baseUrl}/api/photos/recent?limit=${limit}`);
      if (response === null) return { kind: "network-error" };
      if (response.status !== 200) return { kind: "error" };
      try {
        const body: unknown = await response.json();
        if (!Array.isArray(body)) return { kind: "error" };
        return { kind: "ok", photos: body as UploadedPhoto[] };
      } catch {
        return { kind: "error" };
      }
    },

    async getRole(): Promise<RoleOutcome> {
      const response = await send(fetchFn, `${baseUrl}/api/session`, { method: "GET" });
      if (response === null) return { kind: "network-error" };
      if (response.status === 401) return { kind: "ok", role: null };
      if (response.status !== 200) return { kind: "error" };
      try {
        const body: unknown = await response.json();
        const role = (body as { role?: unknown } | null)?.role;
        // 知らない形を管理者と見なさない（守るのはサーバーだが、画面も読み違えない）
        return role === "member" || role === "admin" ? { kind: "ok", role } : { kind: "error" };
      } catch {
        return { kind: "error" };
      }
    },

    async assign(photoId: string, fieldId: string): Promise<AssignOutcome> {
      const response = await send(fetchFn, `${baseUrl}/api/photos/${encodeURIComponent(photoId)}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldId }),
      });
      if (response === null) return "network-error";
      switch (response.status) {
        case 200:
          return "ok";
        case 401:
          return "unauthorized";
        case 403:
          return "forbidden";
        case 404:
          return "not-found";
        case 422:
          return "rejected";
        default:
          return "error";
      }
    },
  };
}
