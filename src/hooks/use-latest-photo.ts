/**
 * 地図で選んだ圃場の最新の写真（11-05 のデザインの引き継ぎ: 畑を押すと、その畑の最新の写真が出る）。
 * その圃場に確定済みの写真を読み、いちばん新しい 1 枚と枚数を返す。選んでいなければ読まない。
 * Repository の実体を知るのはここだけ（AGENTS.md §4）。合言葉は要らない（認証なしの API）。
 */
"use client";

import { useEffect, useState } from "react";
import type { UploadedPhoto } from "@/types";
import { groupFieldPhotos } from "@/services/photo-groups";
import type { LatestPhotoState } from "@/services/map-view";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type { IPhotoRepository } from "@/repositories/interfaces/i-photo-repository";

interface Loaded {
  fieldId: string;
  state: LatestPhotoState;
}

export function useLatestPhoto(fieldId: string | null, repository?: IPhotoRepository): LatestPhotoState {
  const [repo] = useState<IPhotoRepository>(() => repository ?? createPhotoRepository());
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (fieldId === null) return;
    // 選び直したら読み直す。閉じた後・別の圃場に移った後に届いた結果は捨てる
    let active = true;
    repo.listFieldPhotos(fieldId).then((outcome) => {
      if (!active) return;
      if (outcome.kind !== "ok") {
        setLoaded({ fieldId, state: { kind: "error" } });
        return;
      }
      const groups = groupFieldPhotos(outcome.photos, fieldId);
      const count = groups.reduce((n, g) => n + g.photos.length, 0);
      setLoaded({ fieldId, state: { kind: "ok", photo: groups[0]?.photos[0] ?? null, count } });
    });
    return () => {
      active = false;
    };
  }, [repo, fieldId]);

  if (fieldId === null) return { kind: "idle" };
  if (loaded === null || loaded.fieldId !== fieldId) return { kind: "loading" };
  return loaded.state;
}
