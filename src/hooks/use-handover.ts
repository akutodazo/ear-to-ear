/**
 * /fields/[id] の引き継ぎメモ（L6、docs/spec.md §3・§7）の Presenter。今のシーズンのメモを読み、作り直す。
 * 作り直すのは管理者だけ（守るのはサーバーの 401／403）。合言葉は最初に聞かない。
 * 作るときに 401／403 が返ったときだけ聞く（新着の確定と同じ流れ。委員の端末から管理者で入り直せる）。
 * Claude を呼ぶのは 1 回押すごとに 1 回（作っている間は押せない。1 日の上限はサーバー）。
 * メモは画面の文と根拠の印（handover-view、T32）に分けて返す。
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HandoverNote } from "@/types";
import { createHandoverOutcomeLabel, handoverOutcomeLabel } from "@/services/handover-labels";
import { handoverSentences, type HandoverSentence } from "@/services/handover-view";
import { usePassphraseLogin } from "@/hooks/use-passphrase-login";
import { createHandoverRepository } from "@/repositories/create-handover-repository";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type { HandoverOutcome, IHandoverRepository } from "@/repositories/interfaces/i-handover-repository";
import type { IPhotoRepository } from "@/repositories/interfaces/i-photo-repository";

export function useHandover(
  fieldId: string,
  repositories?: { handover?: IHandoverRepository; photo?: IPhotoRepository },
) {
  const [handoverRepo] = useState<IHandoverRepository>(() => repositories?.handover ?? createHandoverRepository());
  const [photoRepo] = useState<IPhotoRepository>(() => repositories?.photo ?? createPhotoRepository());
  const [note, setNote] = useState<HandoverNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const passphrase = usePassphraseLogin(photoRepo);
  const { request: requestPassphrase, login: tryLogin } = passphrase;
  // 読み込みの番号。新しい読み込みを始めたときと、作り直しに成功したときに進める。
  // 番号が古い読み込みの結果は捨てる（遅れて届いた古いメモや 404 で、作ったばかりのメモを上書きしない）
  const readSeq = useRef(0);

  const apply = useCallback((seq: number, outcome: HandoverOutcome) => {
    if (seq !== readSeq.current) return;
    setLoading(false);
    setMessage(handoverOutcomeLabel(outcome));
    // 読めなかったときは、前に読めたメモを残す（電波が悪いだけで消さない）
    if (outcome.kind === "ok") setNote(outcome.note);
    else if (outcome.kind === "none") setNote(null);
  }, []);

  useEffect(() => {
    // 開いたときに1回だけ読む（静的書き出しの事前描画では動かない）。閉じた後に届いた結果は捨てる
    let active = true;
    const seq = ++readSeq.current;
    handoverRepo.getNote(fieldId).then((outcome) => {
      if (active) apply(seq, outcome);
    });
    return () => {
      active = false;
    };
  }, [handoverRepo, fieldId, apply]);

  const refresh = useCallback(async () => {
    const seq = ++readSeq.current;
    setLoading(true);
    apply(seq, await handoverRepo.getNote(fieldId));
  }, [handoverRepo, fieldId, apply]);

  const create = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setCreateMessage(null);
    try {
      const outcome = await handoverRepo.createNote(fieldId);
      setCreateMessage({ text: createHandoverOutcomeLabel(outcome), ok: outcome.kind === "created" });
      if (outcome.kind === "created") {
        readSeq.current += 1;
        setLoading(false);
        setNote(outcome.note);
        setMessage(null);
      } else if (outcome.kind === "unauthorized" || outcome.kind === "forbidden") {
        requestPassphrase();
      }
    } finally {
      setCreating(false);
    }
  }, [creating, handoverRepo, fieldId, requestPassphrase]);

  const login = useCallback(
    async (value: string) => {
      // 入った後は、もう一度「作る」を押してもらう（勝手に Claude を呼ばない）
      if (await tryLogin(value)) setCreateMessage(null);
    },
    [tryLogin],
  );

  const sentences = useMemo<HandoverSentence[]>(() => (note === null ? [] : handoverSentences(note)), [note]);

  return {
    note,
    sentences,
    loading,
    message,
    refresh,
    create,
    creating,
    createMessage,
    needsPassphrase: passphrase.needsPassphrase,
    loginMessage: passphrase.loginMessage,
    loggingIn: passphrase.loggingIn,
    login,
  };
}
