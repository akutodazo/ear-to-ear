/**
 * いまの役割（委員長・委員・入っていない）を読む Presenter（#194）。アカウント札が使う。
 * 合言葉を入れ直す・出る（11-08 本人の依頼）。委員・委員長のどちらの合言葉でも入り直せる。
 * 入り直した・出たら画面を読み直す（ほかの Presenter も役割を読み直すため。手間は 1 回の再読み込みだけ）
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Role } from "@/types";
import { loginOutcomeLabel } from "@/services/login-label";
import type { AccountPending } from "@/services/app-nav-view";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type { IPhotoRepository } from "@/repositories/interfaces/i-photo-repository";

export function useRole(repository?: IPhotoRepository) {
  const [repo] = useState<IPhotoRepository>(() => repository ?? createPhotoRepository());
  // undefined はまだ読んでいる
  const [role, setRole] = useState<Role | null | undefined>(undefined);
  // 待っている操作と、それぞれの文（入り直すと出るを取り違えない。レビュー #1）
  const [pending, setPending] = useState<AccountPending>(null);
  const [signInMessage, setSignInMessage] = useState<string | null>(null);
  const [signOutMessage, setSignOutMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    repo.getRole().then((outcome) => {
      if (active) setRole(outcome.kind === "ok" ? outcome.role : null);
    });
    return () => {
      active = false;
    };
  }, [repo]);

  const signIn = useCallback(
    async (passphrase: string) => {
      if (pending !== null) return;
      setPending("sign-in");
      setSignOutMessage(null);
      try {
        const outcome = await repo.login(passphrase);
        if (outcome !== "ok") {
          setSignInMessage(loginOutcomeLabel(outcome));
          return;
        }
        setSignInMessage(null);
        window.location.reload();
      } finally {
        setPending(null);
      }
    },
    [pending, repo],
  );

  /** 出る。消せなかったら文を出す（入ったまま） */
  const signOut = useCallback(async () => {
    if (pending !== null) return;
    setPending("sign-out");
    setSignInMessage(null);
    try {
      const outcome = await repo.logout();
      if (outcome !== "ok") {
        setSignOutMessage(outcome === "network-error" ? "つながりませんでした。電波のよい所でもう一度押してください" : "出られませんでした。もう一度押してください");
        return;
      }
      setSignOutMessage(null);
      window.location.reload();
    } finally {
      setPending(null);
    }
  }, [pending, repo]);

  return { role, signIn, signOut, pending, signInMessage, signOutMessage };
}
