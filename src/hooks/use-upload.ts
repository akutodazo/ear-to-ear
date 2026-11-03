/**
 * /upload の Presenter。写真を選ぶ → 候補と撮影日を出す → 送る（docs/spec.md §4・§7）。
 * 撮影位置と距離はこの中（端末の中）だけで使い、送る meta は buildUploadMeta で5項目に絞る（K6）。
 * 合言葉は最初に聞かない。送って「合言葉が要る」と返ったときだけ聞き、入れたら送り直す（K1、11-03 本人決定）。
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import fieldsData from "@/data/fields.json";
import type { Field } from "@/types";
import { candidateFieldIds, distanceMeters } from "@/services/candidates";
import { uploadOutcomeLabel } from "@/services/photo-labels";
import { buildUploadMeta } from "@/services/upload-request";
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

const LOGIN_MESSAGES: Record<LoginOutcome, string | null> = {
  ok: null,
  wrong: "合言葉が違います",
  "too-many": "何度も間違えたので、10分ほどおいてからもう一度",
  "network-error": "つながりませんでした。電波のよい所でもう一度",
  error: "うまくいきませんでした。時間をおいてもう一度",
};

let nextKey = 0;

function candidatesFor(info: PhotoInfo): UploadItem["candidates"] {
  const position = info.position;
  if (position === null) return [];
  return candidateFieldIds(position, fields).map((fieldId) => {
    const field = fields.find((f) => f.id === fieldId);
    return { fieldId, meters: field ? distanceMeters(position, field) : 0 };
  });
}

/** 送れる写真（読み取りが済んで、まだ送れていないもの） */
function isSendable(item: UploadItem): boolean {
  return item.info !== null && (item.status === "ready" || item.status === "failed");
}

export function useUpload(repository?: IPhotoRepository) {
  const [repo] = useState<IPhotoRepository>(() => repository ?? createPhotoRepository());
  const [items, setItems] = useState<UploadItem[]>([]);
  const [sending, setSending] = useState(false);
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const filesByKey = useRef(new Map<string, File>());
  const urlsByKey = useRef(new Map<string, string>());

  useEffect(() => {
    const urls = urlsByKey.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const update = useCallback((key: string, change: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const key = `p${nextKey++}`;
        const previewUrl = URL.createObjectURL(file);
        urlsByKey.current.set(key, previewUrl);
        filesByKey.current.set(key, file);
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
        readPhotoInfo(file).then(
          (info) => update(key, { info, candidates: candidatesFor(info), status: "ready" }),
          () => update(key, { status: "failed", message: "写真を読めませんでした。外してください" }),
        );
      }
    },
    [update],
  );

  const choose = useCallback((key: string, fieldId: string | null) => update(key, { chosenFieldId: fieldId }), [update]);

  const remove = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
    filesByKey.current.delete(key);
    const url = urlsByKey.current.get(key);
    if (url) URL.revokeObjectURL(url);
    urlsByKey.current.delete(key);
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
            ? `この写真は送れませんでした（${error.message}）`
            : "写真を送る形にできませんでした";
        update(item.key, { status: "failed", message });
        return "failed";
      }
      // 元のファイルをそのまま送らない（メタデータに撮影位置が残る。K6）
      if (prepared.image === file) {
        update(item.key, { status: "failed", message: "写真を送る形にできませんでした" });
        return "failed";
      }
      const meta = buildUploadMeta({
        contentHash: prepared.contentHash,
        takenAt: item.info.takenAt,
        takenAtSource: item.info.takenAtSource,
        candidateFieldIds: item.candidates.map((c) => c.fieldId),
        chosenFieldId: item.chosenFieldId,
      });
      const outcome = await repo.upload(prepared.image, meta);
      const sent = outcome.kind === "created" || outcome.kind === "duplicate";
      update(item.key, { status: sent ? "sent" : "failed", message: uploadOutcomeLabel(outcome) });
      if (outcome.kind === "unauthorized") return "unauthorized";
      return sent ? "ok" : "failed";
    },
    [repo, update],
  );

  const sendAll = useCallback(async () => {
    if (sending) return;
    setSending(true);
    try {
      for (const item of items.filter(isSendable)) {
        if ((await sendOne(item)) === "unauthorized") {
          setNeedsPassphrase(true);
          return;
        }
      }
    } finally {
      setSending(false);
    }
  }, [items, sending, sendOne]);

  const login = useCallback(
    async (passphrase: string) => {
      const outcome = await repo.login(passphrase);
      setLoginMessage(LOGIN_MESSAGES[outcome]);
      if (outcome !== "ok") return;
      setNeedsPassphrase(false);
      // 入れたら、押し直さなくても送り直す（委員の手間を増やさない。K1）
      await sendAll();
    },
    [repo, sendAll],
  );

  const sendableCount = items.filter(isSendable).length;

  return { items, fields, sending, sendableCount, addFiles, choose, remove, sendAll, needsPassphrase, login, loginMessage };
}
