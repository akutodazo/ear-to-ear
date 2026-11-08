/**
 * fetch で L0 の API（docs/spec.md §6）を呼ぶ写真の保存先。fetch は引数で受け取る（AGENTS.md §4）。
 * HTTP の状態を画面の言葉の手前の「結果の種類」に読み分けるだけで、画面の文言は持たない。
 */
import type { UploadedPhoto, UploadMeta } from "@/types";
import type { AssignOutcome, IPhotoRepository, LoginOutcome, LogoutOutcome, RecentOutcome, RoleOutcome, UploadOutcome } from "@/repositories/interfaces/i-photo-repository";
import { readJson, send, type FetchLike } from "./http-common";

/** 応答の本文の id。読めなければ null */
async function readId(response: Response): Promise<string | null> {
  const id = ((await readJson(response)) as { id?: unknown } | null | undefined)?.id;
  return typeof id === "string" ? id : null;
}

/** 写真の一覧の応答（200 で配列）を読む。それ以外は error、つながらなければ network-error */
async function readPhotos(response: Response | null): Promise<RecentOutcome> {
  if (response === null) return { kind: "network-error" };
  if (response.status !== 200) return { kind: "error" };
  const body = await readJson(response);
  return Array.isArray(body) ? { kind: "ok", photos: body as UploadedPhoto[] } : { kind: "error" };
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

    async logout(): Promise<LogoutOutcome> {
      const response = await send(fetchFn, `${baseUrl}/api/session`, { method: "DELETE" });
      if (response === null) return "network-error";
      return response.status === 204 ? "ok" : "error";
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
      return readPhotos(await send(fetchFn, `${baseUrl}/api/photos/recent?limit=${limit}`));
    },

    async listFieldPhotos(fieldId: string): Promise<RecentOutcome> {
      return readPhotos(await send(fetchFn, `${baseUrl}/api/photos?fieldId=${encodeURIComponent(fieldId)}`));
    },

    async getRole(): Promise<RoleOutcome> {
      const response = await send(fetchFn, `${baseUrl}/api/session`, { method: "GET" });
      if (response === null) return { kind: "network-error" };
      if (response.status === 401) return { kind: "ok", role: null };
      if (response.status !== 200) return { kind: "error" };
      const role = ((await readJson(response)) as { role?: unknown } | null | undefined)?.role;
      // 知らない形を管理者と見なさない（守るのはサーバーだが、画面も読み違えない）
      return role === "member" || role === "admin" ? { kind: "ok", role } : { kind: "error" };
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
