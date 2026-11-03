/**
 * /recent の Presenter。「更新」で新着を読み直す（自動では反映しない。docs/spec.md §7）。
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { UploadedPhoto } from "@/types";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type { IPhotoRepository, RecentOutcome } from "@/repositories/interfaces/i-photo-repository";

const RECENT_LIMIT = 50;

export function useRecent(repository?: IPhotoRepository) {
  const [repo] = useState<IPhotoRepository>(() => repository ?? createPhotoRepository());
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

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
    return () => {
      active = false;
    };
  }, [repo, apply]);

  const refresh = useCallback(async () => {
    setLoading(true);
    apply(await repo.listRecent(RECENT_LIMIT));
  }, [repo, apply]);

  return { photos, loading, message, fetchedAt, refresh };
}
