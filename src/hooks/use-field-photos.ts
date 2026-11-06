/**
 * /fields/[id] の Presenter。その圃場に確定済みの写真を読み、撮影日ごとにまとめる（docs/spec.md §7、T06・T22）。
 * 新着と同じく「更新」で読み直す（自動では反映しない）。合言葉は要らない（認証なしの API）。
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { groupFieldPhotos, type PhotoGroup } from "@/services/photo-groups";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type { IPhotoRepository, RecentOutcome } from "@/repositories/interfaces/i-photo-repository";

export function useFieldPhotos(fieldId: string, repository?: IPhotoRepository) {
  const [repo] = useState<IPhotoRepository>(() => repository ?? createPhotoRepository());
  const [groups, setGroups] = useState<PhotoGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const apply = useCallback(
    (outcome: RecentOutcome) => {
      setLoading(false);
      if (outcome.kind === "ok") {
        // サーバーも同じ順で返すが、枠に分けるのはこちら。確定済み・番号の一致もここでもう一度絞る
        const next = groupFieldPhotos(outcome.photos, fieldId);
        setGroups(next);
        setFetchedAt(new Date());
        setMessage(next.length === 0 ? "まだ確定した写真はありません" : null);
        return;
      }
      setMessage(
        outcome.kind === "network-error"
          ? "つながりませんでした。電波のよい所で「もう一度読み込む」を押してください"
          : "読み込めませんでした。時間をおいて「もう一度読み込む」を押してください",
      );
    },
    [fieldId],
  );

  useEffect(() => {
    // 開いたときに1回だけ読む（静的書き出しの事前描画では動かない）。閉じた後に届いた結果は捨てる
    let active = true;
    repo.listFieldPhotos(fieldId).then((outcome) => {
      if (active) apply(outcome);
    });
    return () => {
      active = false;
    };
  }, [repo, fieldId, apply]);

  const refresh = useCallback(async () => {
    setLoading(true);
    apply(await repo.listFieldPhotos(fieldId));
  }, [repo, fieldId, apply]);

  /** 根拠に選べる写真（その圃場に確定済み）。判断の Presenter（useFieldStatus）に渡す */
  const confirmedPhotoIds = useMemo(() => new Set(groups.flatMap((g) => g.photos.map((p) => p.id))), [groups]);

  return { groups, confirmedPhotoIds, loading, message, fetchedAt, refresh };
}
