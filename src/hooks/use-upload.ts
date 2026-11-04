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
import { sendSummaryLabel, sendingProgressLabel, uploadOutcomeLabel } from "@/services/photo-labels";
import { buildUploadMeta } from "@/services/upload-request";
import { loginOutcomeLabel } from "@/services/login-label";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type { IPhotoRepository, LoginOutcome } from "@/repositories/interfaces/i-photo-repository";
import {
  PreparePhotoUnavailableError,
  canOpenPhoto,
  preparePhoto,
  readPhotoInfo,
  type PhotoInfo,
} from "@/lib/upload-steps";

const fields: Field[] = fieldsData;

/** unusable は画像として開けない写真（送る数に入れない）。duplicate は同じ写真がもう送られていた（送り済みと同じ扱い） */
export type ItemStatus = "reading" | "ready" | "sending" | "sent" | "duplicate" | "failed" | "unusable";

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

/** 送り終わった写真（同じ写真がもう送られていたものを含む） */
function isDone(item: UploadItem): boolean {
  return item.status === "sent" || item.status === "duplicate";
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
  /** 合言葉を確かめている間（Issue #69） */
  const [loggingIn, setLoggingIn] = useState(false);
  /** 送っている間の何枚目か（Issue #69） */
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  /** 最後の「送る」が合言葉で止まらずに終わった（まとめを出す） */
  const [finished, setFinished] = useState(false);
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
      setFinished(false);
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
        Promise.all([readPhotoInfo(file), canOpenPhoto(file)]).then(
          ([info, openable]) =>
            update(
              key,
              openable
                ? { info, candidates: candidatesFor(info), status: "ready" }
                : { status: "unusable", message: "この写真は開けません。外してください" },
            ),
          () => update(key, { status: "unusable", message: "写真を読めませんでした。外してください" }),
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
      update(item.key, { status: "sending", message: "送っています…" });
      let prepared;
      try {
        prepared = await preparePhoto(file);
      } catch (error) {
        // 委員向けの言葉にする（APP の番号などは出さない）
        const messages = {
          metadata: "写真の情報を消しきれなかったので、送りませんでした",
          "too-large": "写真が大きすぎて送れませんでした",
          unreadable: "写真を読めませんでした",
        } as const;
        const message =
          error instanceof PreparePhotoUnavailableError ? messages[error.reason] : "写真を送る形にできませんでした";
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
      const status: ItemStatus = outcome.kind === "duplicate" ? "duplicate" : sent ? "sent" : "failed";
      update(item.key, { status, message: uploadOutcomeLabel(outcome) });
      if (outcome.kind === "unauthorized") return "unauthorized";
      return sent ? "ok" : "failed";
    },
    [repo, update],
  );

  const sendAll = useCallback(async () => {
    if (sending) return;
    setSending(true);
    setFinished(false);
    try {
      const targets = items.filter(isSendable);
      for (const [index, item] of targets.entries()) {
        setProgress({ done: index, total: targets.length });
        if ((await sendOne(item)) === "unauthorized") {
          setNeedsPassphrase(true);
          return;
        }
      }
      setFinished(true);
    } finally {
      setSending(false);
      setProgress(null);
    }
  }, [items, sending, sendOne]);

  const login = useCallback(
    async (passphrase: string) => {
      if (loggingIn) return;
      setLoggingIn(true);
      let outcome: LoginOutcome;
      try {
        outcome = await repo.login(passphrase);
      } finally {
        setLoggingIn(false);
      }
      setLoginMessage(loginOutcomeLabel(outcome));
      if (outcome !== "ok") return;
      setNeedsPassphrase(false);
      // 入れたら、押し直さなくても送り直す（委員の手間を増やさない。K1）
      await sendAll();
    },
    [repo, sendAll, loggingIn],
  );

  /** 送った写真を片付けて、続けて選べるようにする */
  const clearSent = useCallback(() => {
    for (const item of items) {
      if (!isDone(item)) continue;
      filesByKey.current.delete(item.key);
      const url = urlsByKey.current.get(item.key);
      if (url) URL.revokeObjectURL(url);
      urlsByKey.current.delete(item.key);
    }
    setItems((current) => current.filter((item) => !isDone(item)));
    setFinished(false);
  }, [items]);

  const sendableCount = items.filter(isSendable).length;
  const summary = finished
    ? sendSummaryLabel({
        sent: items.filter((i) => i.status === "sent").length,
        duplicate: items.filter((i) => i.status === "duplicate").length,
        failed: items.filter((i) => i.status === "failed").length,
      })
    : null;

  return {
    items,
    fields,
    sending,
    sendableCount,
    summary,
    addFiles,
    choose,
    remove,
    sendAll,
    clearSent,
    needsPassphrase,
    login,
    loginMessage,
    loggingIn,
    progressLabel: progress ? sendingProgressLabel(progress.done, progress.total) : null,
  };
}
