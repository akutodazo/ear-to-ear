/**
 * 401／403 が返ったときに合言葉を聞いて入り直す、の共通の Presenter（判断・メモ・共有・新着・送る が使う）。
 * 合言葉は最初に聞かない。呼ぶ側が request() で欄を出し、login() が入れたかを返す。入った後に何をするか
 * （結果の文を消す・送り直す など）は呼ぶ側が書く。
 * 二重押しは止める（確かめている間の login は何もせず false）。
 */
"use client";

import { useCallback, useState } from "react";
import { loginOutcomeLabel } from "@/services/login-label";
import type { IPhotoRepository } from "@/repositories/interfaces/i-photo-repository";

/**
 * 入った直後（確かめている間のまま）に呼ぶ追加の確かめ。null なら入った扱い。
 * 文字列を返すと、その文を出して欄を開いたままにする（例: 委員の合言葉で管理者の操作をしたとき）
 */
export type VerifyLogin = () => Promise<string | null>;

export function usePassphraseLogin(photoRepo: IPhotoRepository, verify?: VerifyLogin) {
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  /** 合言葉を確かめている間（Issue #69） */
  const [loggingIn, setLoggingIn] = useState(false);

  /** 合言葉の欄を出す（前の「違います」は消す） */
  const request = useCallback(() => {
    setLoginMessage(null);
    setNeedsPassphrase(true);
  }, []);

  /** 書き直したときなどに、前の「違います」だけを消す */
  const clearMessage = useCallback(() => setLoginMessage(null), []);

  /** 入れたら true（欄を閉じ、文を消してから返す）。違う・確かめている途中なら false */
  const login = useCallback(
    async (passphrase: string): Promise<boolean> => {
      if (loggingIn) return false;
      setLoggingIn(true);
      let problem: string | null;
      try {
        const outcome = await photoRepo.login(passphrase);
        problem = outcome === "ok" ? ((await verify?.()) ?? null) : loginOutcomeLabel(outcome);
      } finally {
        setLoggingIn(false);
      }
      if (problem !== null) {
        setLoginMessage(problem);
        return false;
      }
      setNeedsPassphrase(false);
      setLoginMessage(null);
      return true;
    },
    [photoRepo, verify, loggingIn],
  );

  return { needsPassphrase, loginMessage, loggingIn, request, clearMessage, login };
}
