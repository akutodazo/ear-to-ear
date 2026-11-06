/**
 * LINE に 1 枚（11-05、4 段目。11-06 に URL の共有へ、#162）の Presenter。
 * 確定した順から地図 1 枚の絵（src/lib/order-image）を描き、2 段で送る:
 *   1. 送る準備: 絵と番号の並びを POST /api/shares に送り、共有の URL を受け取る（同じ順では 1 回だけ）
 *   2. LINE で送る: 端末の共有（Web Share）に文と URL を渡す。LINE がページの og:image を読み、トークに地図のサムネイルが出る
 * 2 段に分けるのは、iOS が共有を「押した直後」にしか許さないため（通信を待った後だと断られる。推定）。
 * 共有が無い端末では、URL を付けた文を line.me に渡す。座標・距離は送らない（K6）
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { drawOrderImage, type OrderImageInput } from "@/lib/order-image";
import { loginOutcomeLabel } from "@/services/login-label";
import type { OrderShareMeta } from "@/services/order-share-meta";
import { createShareOutcomeLabel, shareData } from "@/services/order-share-view";
import { createOrderShareRepository } from "@/repositories/create-order-share-repository";
import { createPhotoRepository } from "@/repositories/create-photo-repository";
import type { IOrderShareRepository } from "@/repositories/interfaces/i-order-share-repository";
import type { IPhotoRepository } from "@/repositories/interfaces/i-photo-repository";

export type ShareState = { kind: "drawing" } | { kind: "ready"; url: string; file: File } | { kind: "error" };

/** 共有の URL の段階 */
export type LinkState = { kind: "none" } | { kind: "uploading" } | { kind: "ready"; url: string; expiresAt: string };

interface Drawn {
  key: string;
  state: ShareState;
}

interface Linked {
  key: string;
  state: LinkState;
}

/** image・meta は呼ぶ側で useMemo して渡す（参照が変わるたびに描き直すため） */
export function useOrderShare(
  image: OrderImageInput | null,
  meta: OrderShareMeta | null,
  text: string,
  fileName: string,
  repositories?: { share?: IOrderShareRepository; photo?: IPhotoRepository },
) {
  const [shareRepo] = useState<IOrderShareRepository>(() => repositories?.share ?? createOrderShareRepository());
  const [photoRepo] = useState<IPhotoRepository>(() => repositories?.photo ?? createPhotoRepository());
  const key = image === null ? "" : `${image.title}|${image.parcels.map((p) => `${p.fieldId}:${p.rank ?? "-"}:${p.fill}`).join(",")}`;
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const [linked, setLinked] = useState<Linked | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (image === null) return;
    // 確定した順が変わったら描き直す。閉じた後に描き終わった絵は捨てる
    let active = true;
    let url: string | null = null;
    drawOrderImage(image)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setDrawn({ key, state: { kind: "ready", url, file: new File([blob], fileName, { type: "image/jpeg" }) } });
      })
      .catch(() => {
        if (active) setDrawn({ key, state: { kind: "error" } });
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
    // image は呼ぶ側が useMemo で固定する（確定した順が変わったときだけ描き直す）
  }, [image, key, fileName]);

  const state: ShareState = drawn !== null && drawn.key === key ? drawn.state : { kind: "drawing" };
  // 順が変わったら前の URL は使わない（別の順の絵を指すため）
  const link = useMemo<LinkState>(() => (linked !== null && linked.key === key ? linked.state : { kind: "none" }), [linked, key]);
  const file = state.kind === "ready" ? state.file : null;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const prepare = useCallback(async () => {
    if (file === null || meta === null || link.kind !== "none") return;
    setMessage(null);
    setLinked({ key, state: { kind: "uploading" } });
    const outcome = await shareRepo.create(file, meta);
    if (outcome.kind === "created") {
      setLinked({ key, state: { kind: "ready", url: outcome.share.url, expiresAt: outcome.share.expiresAt } });
      return;
    }
    setLinked({ key, state: { kind: "none" } });
    setMessage(createShareOutcomeLabel(outcome));
    if (outcome.kind === "unauthorized") {
      setLoginMessage(null);
      setNeedsPassphrase(true);
    }
  }, [file, meta, link.kind, key, shareRepo]);

  const login = useCallback(
    async (passphrase: string) => {
      if (loggingIn) return;
      setLoggingIn(true);
      try {
        const outcome = await photoRepo.login(passphrase);
        if (outcome === "ok") {
          setNeedsPassphrase(false);
          setLoginMessage(null);
          setMessage(null);
        } else {
          setLoginMessage(loginOutcomeLabel(outcome));
        }
      } finally {
        setLoggingIn(false);
      }
    },
    [photoRepo, loggingIn],
  );

  // 押した直後に同期で共有を呼ぶ（await を挟まない）
  const send = useCallback(() => {
    if (link.kind !== "ready") return;
    navigator.share(shareData(text, link.url)).then(
      () => setMessage(null),
      (e: unknown) => {
        // 自分で閉じたときは何も言わない
        if (e instanceof DOMException && e.name === "AbortError") return;
        setMessage("共有できませんでした。URL を写して送ってください");
      },
    );
  }, [link, text]);

  const copyUrl = useCallback(async () => {
    if (link.kind !== "ready") return;
    try {
      await navigator.clipboard.writeText(`${text}\n${link.url}`);
      setMessage("文と URL を写しました");
    } catch {
      setMessage("写せませんでした");
    }
  }, [link, text]);

  return { state, link, canShare, prepare, send, copyUrl, message, needsPassphrase, login, loginMessage, loggingIn };
}
