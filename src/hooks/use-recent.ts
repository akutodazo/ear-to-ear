/**
 * /recent の Presenter。「更新」で新着を読み直す（自動では反映しない。docs/spec.md §7）。
 * 管理者の端末にだけ「確定・変更」を出す。役割は GET /api/session で知る（11-03 本人決定）。守るのはサーバー（403）。
 * 合言葉は最初に聞かない。「管理者として入る」を押したときと、確定・変更で 401／403 が返ったときだけ聞く。
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import fieldsData from "@/data/fields.json";
import type { Field, Role, UploadedPhoto } from "@/types";
import { applyAssignment, assignOutcomeLabel } from "@/services/assignment";
import { filterRecent, unconfirmedCountLabel } from "@/services/recent-view";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type {
  IPhotoRepository,
  LoginOutcome,
  RecentOutcome,
  RoleOutcome,
} from "@/repositories/interfaces/i-photo-repository";

const RECENT_LIMIT = 50;
const fields: Field[] = fieldsData;

const LOGIN_MESSAGES: Record<LoginOutcome, string | null> = {
  ok: null,
  wrong: "合言葉が違います",
  "too-many": "何度も間違えたので、10分ほどおいてからもう一度",
  "network-error": "つながりませんでした。電波のよい所でもう一度",
  error: "うまくいきませんでした。時間をおいてもう一度",
};

/** 写真ごとの確定・変更の様子 */
export interface AssignStatus {
  busy: boolean;
  message: string | null;
  ok: boolean;
}

export function useRecent(repository?: IPhotoRepository) {
  const [repo] = useState<IPhotoRepository>(() => repository ?? createPhotoRepository());
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  /** 分かるまでは undefined（「確定・変更」も「管理者として入る」も出さない）。入っていなければ null */
  const [role, setRole] = useState<Role | null | undefined>(undefined);
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  /** 合言葉を確かめている間（Issue #69） */
  const [loggingIn, setLoggingIn] = useState(false);
  const [assignStatus, setAssignStatus] = useState<Record<string, AssignStatus>>({});
  /** 「未確定だけ見る」 */
  const [onlyUnconfirmed, setOnlyUnconfirmed] = useState(false);

  const apply = useCallback((outcome: RecentOutcome) => {
    setLoading(false);
    if (outcome.kind === "ok") {
      setPhotos(outcome.photos);
      setFetchedAt(new Date());
      setMessage(outcome.photos.length === 0 ? "まだ写真はありません" : null);
      return;
    }
    setMessage(
      outcome.kind === "network-error"
        ? "つながりませんでした。電波のよい所で「更新」を押してください"
        : "読み込めませんでした。時間をおいて「更新」を押してください",
    );
  }, []);

  useEffect(() => {
    // 開いたときに1回だけ読む（静的書き出しの事前描画では動かない）。閉じた後に届いた結果は捨てる
    let active = true;
    repo.listRecent(RECENT_LIMIT).then((outcome) => {
      if (active) apply(outcome);
    });
    repo.getRole().then((outcome) => {
      // 読めなかったときは管理者と見なさない
      if (active) setRole(outcome.kind === "ok" ? outcome.role : null);
    });
    return () => {
      active = false;
    };
  }, [repo, apply]);

  const refresh = useCallback(async () => {
    setLoading(true);
    apply(await repo.listRecent(RECENT_LIMIT));
  }, [repo, apply]);

  const openLogin = useCallback(() => {
    setLoginMessage(null);
    setNeedsPassphrase(true);
  }, []);

  const login = useCallback(
    async (passphrase: string) => {
      if (loggingIn) return;
      setLoggingIn(true);
      let current: RoleOutcome;
      try {
        const outcome = await repo.login(passphrase);
        if (outcome !== "ok") {
          setLoginMessage(LOGIN_MESSAGES[outcome]);
          return;
        }
        current = await repo.getRole();
      } finally {
        setLoggingIn(false);
      }
      const nextRole = current.kind === "ok" ? current.role : null;
      setRole(nextRole);
      if (nextRole === "admin") {
        setNeedsPassphrase(false);
        setLoginMessage(null);
        // 入り直す前の「合言葉を入れてください」などを残さない
        setAssignStatus({});
      } else {
        setLoginMessage("管理者の合言葉ではありません");
      }
    },
    [repo, loggingIn],
  );

  const assign = useCallback(
    async (photoId: string, fieldId: string) => {
      setAssignStatus((s) => ({ ...s, [photoId]: { busy: true, message: null, ok: false } }));
      const outcome = await repo.assign(photoId, fieldId);
      setAssignStatus((s) => ({
        ...s,
        [photoId]: { busy: false, message: assignOutcomeLabel(outcome, fieldId), ok: outcome === "ok" },
      }));
      if (outcome === "ok") {
        setPhotos((current) => applyAssignment(current, photoId, fieldId));
      } else if (outcome === "unauthorized" || outcome === "forbidden") {
        setRole(outcome === "unauthorized" ? null : "member");
        setLoginMessage(null);
        setNeedsPassphrase(true);
      }
    },
    [repo],
  );

  const toggleOnlyUnconfirmed = useCallback(() => setOnlyUnconfirmed((v) => !v), []);

  return {
    photos: filterRecent(photos, onlyUnconfirmed),
    unconfirmedLabel: unconfirmedCountLabel(photos),
    onlyUnconfirmed,
    toggleOnlyUnconfirmed,
    loading,
    message,
    fetchedAt,
    refresh,
    fields,
    role,
    needsPassphrase,
    loginMessage,
    loggingIn,
    openLogin,
    login,
    assignStatus,
    assign,
  };
}
