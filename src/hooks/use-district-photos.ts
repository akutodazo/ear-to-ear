/**
 * 同じ地区の畑の確定済みの写真をまとめて読む（見比べるの「同じ日に撮った別の畑と」。11-05）。
 * 畑ごとに GET /api/photos?fieldId= を呼び、畑 → 写真の一覧で返す。Repository の実体を知るのはここだけ（AGENTS.md §4）
 */
"use client";

import { useEffect, useState } from "react";
import type { UploadedPhoto } from "@/types";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type { IPhotoRepository } from "@/repositories/interfaces/i-photo-repository";

export interface DistrictPhotos {
  byField: Record<string, UploadedPhoto[]>;
  loading: boolean;
  /** 1 つでも読めなかった畑があれば、その番号 */
  failed: string[];
  refresh: () => void;
}

interface Loaded {
  key: string;
  byField: Record<string, UploadedPhoto[]>;
  failed: string[];
}

export function useDistrictPhotos(fieldIds: readonly string[], repository?: IPhotoRepository): DistrictPhotos {
  const [repo] = useState<IPhotoRepository>(() => repository ?? createPhotoRepository());
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = fieldIds.join(",");

  useEffect(() => {
    // 地区が変わったら読み直す。閉じた後に届いた結果は捨てる
    let active = true;
    const ids = key === "" ? [] : key.split(",");
    Promise.all(ids.map((id) => repo.listFieldPhotos(id))).then((outcomes) => {
      if (!active) return;
      const byField: Record<string, UploadedPhoto[]> = {};
      const failed: string[] = [];
      outcomes.forEach((outcome, i) => {
        if (outcome.kind === "ok") byField[ids[i]] = outcome.photos;
        else failed.push(ids[i]);
      });
      setLoaded({ key, byField, failed });
    });
    return () => {
      active = false;
    };
  }, [repo, key, attempt]);

  const ready = loaded !== null && loaded.key === key;
  return {
    byField: ready ? loaded.byField : {},
    loading: !ready,
    failed: ready ? loaded.failed : [],
    refresh: () => setAttempt((n) => n + 1),
  };
}
