/**
 * 刈る順番の Presenter（11-05、3 段目）。記録からの下書き（base）に保存した順を重ね、人が直し、保存・確定する。
 * 確定は委員長（admin）だけに出す（守るのは将来のサーバー）。いまの保存先は端末の中（create-harvest-order-repository）。
 * Repository の実体を知るのはここだけ（AGENTS.md §4）
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Role } from "@/types";
import { applySaved, moveTo as moveToIn, moveWithin, rankOrUnrank, sameOrder, type OrderDraft } from "@/services/harvest-order";
import { createHarvestOrderRepository } from "@/repositories/create-harvest-order-repository";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type { IHarvestOrderRepository, SavedOrder } from "@/repositories/interfaces/i-harvest-order-repository";
import type { IPhotoRepository } from "@/repositories/interfaces/i-photo-repository";

interface Keyed<T> {
  key: string;
  value: T;
}

export function useHarvestOrder(
  district: string,
  season: string,
  /** 記録からの下書き。記録がまだ読めていなければ null */
  base: OrderDraft | null,
  repositories?: { order?: IHarvestOrderRepository; photo?: IPhotoRepository },
) {
  const [orderRepo] = useState<IHarvestOrderRepository>(() => repositories?.order ?? createHarvestOrderRepository());
  const [photoRepo] = useState<IPhotoRepository>(() => repositories?.photo ?? createPhotoRepository());
  const key = `${season}/${district}`;
  const [saved, setSaved] = useState<Keyed<SavedOrder | null> | null>(null);
  const [edited, setEdited] = useState<Keyed<OrderDraft> | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    // 地区が変わったら読み直す。閉じた後に届いた結果は捨てる
    let active = true;
    orderRepo.load(district, season).then((outcome) => {
      if (active) setSaved({ key, value: outcome.kind === "ok" ? outcome.order : null });
    });
    return () => {
      active = false;
    };
  }, [orderRepo, district, season, key]);

  useEffect(() => {
    let active = true;
    photoRepo.getRole().then((outcome) => {
      if (active && outcome.kind === "ok") setRole(outcome.role);
    });
    return () => {
      active = false;
    };
  }, [photoRepo]);

  const savedOrder = saved !== null && saved.key === key ? saved.value : null;
  const loadedSaved = saved !== null && saved.key === key;
  // 保存した順を今の記録に合わせたもの（保存が無ければ記録からの下書き）
  const fromSaved = useMemo(() => (base === null ? null : savedOrder === null ? base : applySaved(base, savedOrder)), [base, savedOrder]);
  const current = edited !== null && edited.key === key ? edited.value : fromSaved;
  const dirty = current !== null && fromSaved !== null && !sameOrder(current, savedOrder === null ? (base ?? current) : fromSaved);
  const differsFromConfirmed = savedOrder?.state === "confirmed" && current !== null && fromSaved !== null && !sameOrder(current, fromSaved);

  const update = useCallback(
    (fn: (d: OrderDraft) => OrderDraft) => {
      if (current === null) return;
      setEdited({ key, value: fn(current) });
      setMessage(null);
    },
    [current, key],
  );

  const move = useCallback((index: number, delta: number) => update((d) => ({ ...d, ranked: moveWithin(d.ranked, index, delta) })), [update]);
  const moveTo = useCallback((from: number, to: number) => update((d) => ({ ...d, ranked: moveToIn(d.ranked, from, to) })), [update]);
  const toggle = useCallback((fieldId: string) => update((d) => rankOrUnrank(d, fieldId)), [update]);

  /** 記録からの下書きに戻す（人が並べた順は消える。押す側で 2 段にする） */
  const resetToRecords = useCallback(() => {
    if (base === null) return;
    setEdited({ key, value: base });
    setMessage(null);
  }, [base, key]);

  /** 保存した順（確定した順）に戻す */
  const revert = useCallback(() => {
    setEdited(null);
    setMessage(null);
  }, []);

  const persist = useCallback(
    async (state: "draft" | "confirmed") => {
      if (current === null || busy) return;
      setBusy(true);
      try {
        const outcome = await orderRepo.save({ district, season, ranked: current.ranked, unranked: current.unranked, state });
        if (outcome.kind === "ok") {
          setSaved({ key, value: outcome.order });
          setEdited(null);
          setMessage({ text: state === "confirmed" ? "確定しました" : "保存しました", ok: true });
        } else {
          setMessage({ text: "保存できませんでした。並べた順はこのまま残しています", ok: false });
        }
      } finally {
        setBusy(false);
      }
    },
    [current, busy, orderRepo, district, season, key],
  );

  return {
    order: current,
    saved: savedOrder,
    loading: base === null || !loadedSaved,
    dirty,
    differsFromConfirmed,
    canConfirm: role === "admin",
    busy,
    message,
    move,
    moveTo,
    toggle,
    resetToRecords,
    revert,
    saveDraft: () => persist("draft"),
    confirm: () => persist("confirmed"),
  };
}
