/**
 * /upload の Presenter。写真を選ぶ → 候補と撮影日を出す → 送る（docs/spec.md §4・§7）。
 * 撮影位置と距離はこの中（端末の中）だけで使い、送る meta には入れない（K6）。
 * 合言葉は最初に聞かない。送って「合言葉が要る」と返ったときだけ聞く（委員の手間を増やさない。K1）。
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import fieldsData from "@/data/fields.json";
import type { Field, UploadMeta } from "@/types";
import { candidateFieldIds, distanceMeters } from "@/services/candidates";
import { uploadOutcomeLabel } from "@/services/photo-labels";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type { IPhotoRepository, LoginOutcome } from "@/repositories/interfaces/i-photo-repository";
import { PreparePhotoUnavailableError, preparePhoto, readPhotoInfo, type PhotoInfo } from "@/lib/upload-steps";

const fields: Field[] = fieldsData;

export type ItemStatus = "reading" | "ready" | "sending" | "sent" | "failed";

export interface UploadItem {
  key: string;
  fileName: string;
  previewUrl: string;
  info: PhotoInfo | null;
  /** 近い順。距離は画面に出すだけ */
  candidates: { fieldId: string; meters: number }[];
  chosenFieldId: string | null;
  status: ItemStatus;
  message: string | null;
}

let nextKey = 0;

function candidatesFor(info: PhotoInfo): UploadItem["candidates"] {
  const position = info.position;
  if (position === null) return [];
  return candidateFieldIds(position, fields).map((fieldId) => {
    const field = fields.find((f) => f.id === fieldId);
    return { fieldId, meters: field ? distanceMeters(position, field) : 0 };
  });
}

export function useUpload(repository?: IPhotoRepository) {
  const [repo] = useState<IPhotoRepository>(() => repository ?? createPhotoRepository());
  const [items, setItems] = useState<UploadItem[]>([]);
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const urls = useRef<string[]>([]);
  const filesByKey = useRef(new Map<string, File>());

  useEffect(() => {
    const created = urls.current;
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const update = useCallback((key: string, change: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const key = `p${nextKey++}`;
        const previewUrl = URL.createObjectURL(file);
        urls.current.push(previewUrl);
        const item: UploadItem = {
          key,
          fileName: file.name,
          previewUrl,
          info: null,
          candidates: [],
          chosenFieldId: null,
          status: "reading",
          message: null,
        };
        setItems((current) => [...current, item]);
        filesByKey.current.set(key, file);
        readPhotoInfo(file).then(
          (info) => update(key, { info, candidates: candidatesFor(info), status: "ready" }),
          () => update(key, { status: "failed", message: "写真を読めませんでした" }),
        );
      }
    },
    [update],
  );

  const choose = useCallback((key: string, fieldId: string | null) => update(key, { chosenFieldId: fieldId }), [update]);

  const remove = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
    filesByKey.current.delete(key);
  }, []);

  const sendOne = useCallback(
    async (item: UploadItem): Promise<"ok" | "unauthorized" | "failed"> => {
      const file = filesByKey.current.get(item.key);
      if (!file || !item.info) return "failed";
      update(item.key, { status: "sending", message: null });
      let prepared;
      try {
        prepared = await preparePhoto(file);
      } catch (error) {
        const message =
          error instanceof PreparePhotoUnavailableError
            ? "準備中: 写真の縮小がまだ無いので送れません"
            : "写真を送る形にできませんでした";
        update(item.key, { status: "failed", message });
        return "failed";
      }
      const meta: UploadMeta = {
        contentHash: prepared.contentHash,
        takenAt: item.info.takenAt,
        takenAtSource: item.info.takenAtSource,
        candidateFieldIds: item.candidates.map((c) => c.fieldId),
        chosenFieldId: item.chosenFieldId,
      };
      const outcome = await repo.upload(prepared.image, meta);
      const sent = outcome.kind === "created" || outcome.kind === "duplicate";
      update(item.key, { status: sent ? "sent" : "failed", message: uploadOutcomeLabel(outcome) });
      if (outcome.kind === "unauthorized") return "unauthorized";
      return sent ? "ok" : "failed";
    },
    [repo, update],
  );

  const sendAll = useCallback(async () => {
    for (const item of items.filter((i) => i.status === "ready" || i.status === "failed")) {
      const result = await sendOne(item);
      if (result === "unauthorized") {
        setNeedsPassphrase(true);
        return;
      }
    }
  }, [items, sendOne]);

  const login = useCallback(
    async (passphrase: string) => {
      const outcome: LoginOutcome = await repo.login(passphrase);
      const messages: Record<LoginOutcome, string | null> = {
        ok: null,
        wrong: "合言葉が違います",
        "too-many": "何度も間違えたので、10分ほどおいてからもう一度",
        "network-error": "つながりませんでした。電波のよい所でもう一度",
        error: "うまくいきませんでした。時間をおいてもう一度",
      };
      setLoginMessage(messages[outcome]);
      if (outcome === "ok") setNeedsPassphrase(false);
    },
    [repo],
  );

  return { items, addFiles, choose, remove, sendAll, needsPassphrase, login, loginMessage, fields };
}
