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
import { loginOutcomeLabel } from "@/services/login-label";
import type { IHarvestOrderRepository, OrderWork, SavedOrder } from "@/repositories/interfaces/i-harvest-order-repository";
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
  /** 端末に残っていた並べ途中（画面を移っても消さない。11-06 地図の精査 #2） */
  const [work, setWork] = useState<Keyed<OrderWork | null> | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  /** 役割を読み終えたか（読む前に「委員長として入る」を出さない） */
  const [roleChecked, setRoleChecked] = useState(false);
  // 委員長として入る（確定は委員長だけ。入る所が新着にしか無かった。精査 5 回目 #1・#2）
  const [loginOpen, setLoginOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    // 地区が変わったら読み直す。閉じた後に届いた結果は捨てる
    let active = true;
    Promise.all([orderRepo.load(district, season), orderRepo.loadWork(district, season)]).then(([outcome, restored]) => {
      if (!active) return;
      setSaved({ key, value: outcome.kind === "ok" ? outcome.order : null });
      setWork({ key, value: restored });
    });
    return () => {
      active = false;
    };
  }, [orderRepo, district, season, key]);

  useEffect(() => {
    let active = true;
    photoRepo.getRole().then((outcome) => {
      if (!active) return;
      if (outcome.kind === "ok") setRole(outcome.role);
      setRoleChecked(true);
    });
    return () => {
      active = false;
    };
  }, [photoRepo]);

  const savedOrder = saved !== null && saved.key === key ? saved.value : null;
  const loadedSaved = saved !== null && saved.key === key && work !== null && work.key === key;
  // 保存した順を今の記録に合わせたもの（保存が無ければ記録からの下書き）
  const fromSaved = useMemo(() => (base === null ? null : savedOrder === null ? base : applySaved(base, savedOrder)), [base, savedOrder]);
  const restored = work !== null && work.key === key ? work.value : null;
  // 並べ途中が残っていれば、今の記録に合わせて重ねる（収穫済になった畑などは記録のほうに従う）
  const current = edited !== null && edited.key === key ? edited.value : restored !== null && base !== null ? applySaved(base, restored) : fromSaved;
  const dirty = current !== null && fromSaved !== null && !sameOrder(current, savedOrder === null ? (base ?? current) : fromSaved);
  const differsFromConfirmed = savedOrder?.state === "confirmed" && current !== null && fromSaved !== null && !sameOrder(current, fromSaved);

  /** 並べ途中を画面と端末の両方に残す（変えるたびに。押し忘れで消えない） */
  const keep = useCallback(
    (next: OrderDraft) => {
      setEdited({ key, value: next });
      void orderRepo.saveWork(district, season, { ranked: next.ranked, unranked: next.unranked });
    },
    [orderRepo, district, season, key],
  );
  /** 並べ途中を捨てる（保存した・保存した順に戻した） */
  const forget = useCallback(() => {
    setEdited(null);
    setWork({ key, value: null });
    void orderRepo.saveWork(district, season, null);
  }, [orderRepo, district, season, key]);

  const update = useCallback(
    (fn: (d: OrderDraft) => OrderDraft) => {
      if (current === null) return;
      keep(fn(current));
      setMessage(null);
    },
    [current, keep],
  );

  const move = useCallback((index: number, delta: number) => update((d) => ({ ...d, ranked: moveWithin(d.ranked, index, delta) })), [update]);
  const moveTo = useCallback((from: number, to: number) => update((d) => ({ ...d, ranked: moveToIn(d.ranked, from, to) })), [update]);
  const toggle = useCallback((fieldId: string) => update((d) => rankOrUnrank(d, fieldId)), [update]);

  /** 記録からの下書きに戻す（人が並べた順は消える。押す側で 2 段にする） */
  const resetToRecords = useCallback(() => {
    if (base === null) return;
    keep(base);
    setMessage(null);
  }, [base, keep]);

  /** 保存した順（確定した順）に戻す */
  const revert = useCallback(() => {
    forget();
    setMessage(null);
  }, [forget]);

  const persist = useCallback(
    async (state: "draft" | "confirmed") => {
      if (current === null || busy) return;
      setBusy(true);
      try {
        const outcome = await orderRepo.save({ district, season, ranked: current.ranked, unranked: current.unranked, state });
        if (outcome.kind === "ok") {
          setSaved({ key, value: outcome.order });
          forget();
          setMessage({ text: state === "confirmed" ? "確定しました" : "保存しました", ok: true });
        } else {
          setMessage({ text: "保存できませんでした。並べた順はこのまま残しています", ok: false });
        }
      } finally {
        setBusy(false);
      }
    },
    [current, busy, orderRepo, district, season, key, forget],
  );

  const login = useCallback(
    async (passphrase: string) => {
      if (loggingIn) return;
      setLoggingIn(true);
      try {
        const outcome = await photoRepo.login(passphrase);
        if (outcome !== "ok") {
          setLoginMessage(loginOutcomeLabel(outcome));
          return;
        }
        const next = await photoRepo.getRole();
        const nextRole = next.kind === "ok" ? next.role : null;
        setRole(nextRole);
        if (nextRole === "admin") {
          setLoginOpen(false);
          setLoginMessage(null);
        } else {
          setLoginMessage("委員長（管理者）の合言葉ではありません");
        }
      } finally {
        setLoggingIn(false);
      }
    },
    [loggingIn, photoRepo],
  );

  return {
    order: current,
    /** 役割を読み終え、委員長でないとき。確定の代わりに「委員長として入る」を出す */
    needsChair: roleChecked && role !== "admin",
    loginOpen,
    openLogin: () => setLoginOpen(true),
    login,
    loggingIn,
    loginMessage,
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
