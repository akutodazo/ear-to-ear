/**
 * /fields/[id] の判断の Presenter（docs/spec.md §7、L1）。履歴を読み、判断を送り、取り消す。
 * 送る前に、サーバーと同じ決まり（parseStatusInput、T12）で確かめる。守るのはサーバー（401／422）。
 * 合言葉は最初に聞かない。送る・取り消すで 401 が返ったときだけ聞く（新着の確定と同じ流れ）。
 * 画面の配置は見本（UI 精査の 1 回目）で決めるので、ここは状態と操作だけを返す。
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StatusEvent } from "@/types";
import { STATUS_REF_PHOTOS_MAX, type StatusReasonCode } from "@/config";
import { parseStatusInput } from "@/services/status-reason";
import {
  inputErrorLabel,
  postOutcomeLabel,
  revokeOutcomeLabel,
  toggleRefPhoto as toggleRefPhotoIn,
  withLocalChanges,
  withStatusEvent,
  type LocalStatusChange,
} from "@/services/status-view";
import { loginOutcomeLabel } from "@/services/login-label";
import { createFieldStatusRepository } from "@/repositories/create-field-status-repository";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type { HistoryOutcome, IFieldStatusRepository } from "@/repositories/interfaces/i-field-status-repository";
import type { IPhotoRepository } from "@/repositories/interfaces/i-photo-repository";

/** 入力中の判断 */
export interface StatusDraft {
  status: StatusEvent["status"] | null;
  reasons: StatusReasonCode[];
  note: string;
  refPhotoIds: string[];
}

/** 1 回の読み込み。seq は読み込みの番号、since は始めたときの手元の変更の番号 */
interface HistoryRead {
  seq: number;
  since: number;
}

const EMPTY_DRAFT: StatusDraft = { status: null, reasons: [], note: "", refPhotoIds: [] };

/** 判断ごとの取り消しの様子 */
export interface RevokeStatus {
  busy: boolean;
  message: string | null;
}

/**
 * confirmedPhotoIds は、その圃場に確定済みの写真の id（圃場ページで読んだもの）。根拠に選べるのはこれだけ。
 */
export function useFieldStatus(
  fieldId: string,
  confirmedPhotoIds: ReadonlySet<string>,
  repositories?: { status?: IFieldStatusRepository; photo?: IPhotoRepository },
) {
  const [statusRepo] = useState<IFieldStatusRepository>(() => repositories?.status ?? createFieldStatusRepository());
  const [photoRepo] = useState<IPhotoRepository>(() => repositories?.photo ?? createPhotoRepository());
  const [history, setHistory] = useState<StatusEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<StatusDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [revokeStatus, setRevokeStatus] = useState<Record<number, RevokeStatus>>({});
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  // 遅れて届いた読み込みで、送った判断や取り消しを消さないための番号（Codex の点検 #114 と同じ種類の競合）。
  // 最後に始めた読み込みの結果だけを使い、その読み込みを始めた後に手元で変えた判断を重ねる
  const readSeq = useRef(0);
  const changeStamp = useRef(0);
  const changes = useRef<LocalStatusChange[]>([]);

  const startRead = useCallback((): HistoryRead => {
    readSeq.current += 1;
    return { seq: readSeq.current, since: changeStamp.current };
  }, []);

  /** 送った・取り消した判断を履歴に入れ、後から届く古い読み込みにも重ねられるように覚える */
  const recordChange = useCallback((event: StatusEvent) => {
    changeStamp.current += 1;
    changes.current = [...changes.current, { stamp: changeStamp.current, event }];
    setHistory((h) => withStatusEvent(h, event));
    setHistoryMessage(null);
  }, []);

  const applyHistory = useCallback((read: HistoryRead, outcome: HistoryOutcome) => {
    if (read.seq !== readSeq.current) return;
    setHistoryLoading(false);
    if (outcome.kind === "ok") {
      const events = withLocalChanges(outcome.events, changes.current, read.since);
      // 読み込みを始める前の変更は、もうサーバーの履歴に入っている
      changes.current = changes.current.filter((c) => c.stamp > read.since);
      setHistory(events);
      setHistoryMessage(events.length === 0 ? "まだ判断の記録はありません" : null);
      return;
    }
    setHistoryMessage(
      outcome.kind === "network-error"
        ? "判断の履歴を読めませんでした。電波のよい所で「更新」を押してください"
        : "判断の履歴を読めませんでした。時間をおいて「更新」を押してください",
    );
  }, []);

  const loadHistory = useCallback(async () => {
    const read = startRead();
    setHistoryLoading(true);
    applyHistory(read, await statusRepo.listHistory(fieldId));
  }, [statusRepo, fieldId, startRead, applyHistory]);

  useEffect(() => {
    // 開いたときに1回だけ読む（静的書き出しの事前描画では動かない）。閉じた後に届いた結果は捨てる
    let active = true;
    const read = startRead();
    statusRepo.listHistory(fieldId).then((outcome) => {
      if (active) applyHistory(read, outcome);
    });
    return () => {
      active = false;
    };
  }, [statusRepo, fieldId, startRead, applyHistory]);

  const chooseStatus = useCallback((status: StatusEvent["status"]) => {
    setDraft((d) => ({ ...d, status }));
    setFormMessage(null);
  }, []);

  const toggleReason = useCallback((code: StatusReasonCode) => {
    setDraft((d) => ({
      ...d,
      reasons: d.reasons.includes(code) ? d.reasons.filter((r) => r !== code) : [...d.reasons, code],
    }));
  }, []);

  const setNote = useCallback((note: string) => setDraft((d) => ({ ...d, note })), []);

  const toggleRefPhoto = useCallback(
    (photoId: string) => {
      const next = toggleRefPhotoIn(draft.refPhotoIds, photoId, STATUS_REF_PHOTOS_MAX);
      setDraft((d) => ({ ...d, refPhotoIds: next.selected }));
      setFormMessage(next.limited ? { text: inputErrorLabel("too_many_ref_photos"), ok: false } : null);
    },
    [draft.refPhotoIds],
  );

  const resetDraft = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setFormMessage(null);
  }, []);

  const submit = useCallback(async () => {
    if (submitting) return;
    const parsed = parseStatusInput(
      { status: draft.status ?? undefined, reasons: draft.reasons, note: draft.note, refPhotoIds: draft.refPhotoIds },
      confirmedPhotoIds,
    );
    if (!parsed.ok) {
      setFormMessage({ text: inputErrorLabel(parsed.reason), ok: false });
      return;
    }
    setSubmitting(true);
    try {
      const outcome = await statusRepo.postStatus(fieldId, parsed.value);
      setFormMessage({ text: postOutcomeLabel(outcome), ok: outcome.kind === "created" });
      if (outcome.kind === "created") {
        recordChange(outcome.event);
        setDraft(EMPTY_DRAFT);
      } else if (outcome.kind === "unauthorized") {
        setLoginMessage(null);
        setNeedsPassphrase(true);
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, draft, confirmedPhotoIds, statusRepo, fieldId, recordChange]);

  const revoke = useCallback(
    async (eventId: number) => {
      setRevokeStatus((s) => ({ ...s, [eventId]: { busy: true, message: null } }));
      const outcome = await statusRepo.revoke(eventId);
      setRevokeStatus((s) => ({ ...s, [eventId]: { busy: false, message: revokeOutcomeLabel(outcome) } }));
      if (outcome.kind === "ok") {
        recordChange(outcome.event);
      } else if (outcome.kind === "unauthorized") {
        setLoginMessage(null);
        setNeedsPassphrase(true);
      } else if (outcome.kind === "not-found") {
        // ほかの端末で取り消されたかもしれないので、履歴を読み直す
        await loadHistory();
      }
    },
    [statusRepo, loadHistory, recordChange],
  );

  const login = useCallback(
    async (passphrase: string) => {
      if (loggingIn) return;
      setLoggingIn(true);
      try {
        const outcome = await photoRepo.login(passphrase);
        if (outcome === "ok") {
          setNeedsPassphrase(false);
          setLoginMessage(null);
          // 入った後は、もう一度「記録する」「取り消す」を押してもらう（入力はそのまま残す）
          setFormMessage(null);
          setRevokeStatus({});
        } else {
          setLoginMessage(loginOutcomeLabel(outcome));
        }
      } finally {
        setLoggingIn(false);
      }
    },
    [photoRepo, loggingIn],
  );

  return {
    history,
    historyLoading,
    historyMessage,
    refreshHistory: loadHistory,
    draft,
    chooseStatus,
    toggleReason,
    setNote,
    toggleRefPhoto,
    resetDraft,
    submit,
    submitting,
    formMessage,
    revoke,
    revokeStatus,
    needsPassphrase,
    loginMessage,
    loggingIn,
    login,
  };
}
