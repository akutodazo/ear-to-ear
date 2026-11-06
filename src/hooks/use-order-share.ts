/**
 * LINE に 1 枚（11-05、4 段目）の Presenter。確定した順から、地図 1 枚の絵（src/lib/order-image）と文（order-message）を作り、
 * 端末の共有（Web Share。LINE を選べば絵と文がまとめて届く）に渡す。共有で絵を渡せない端末では、絵の保存と文の送り先を出す。
 * ボットが自動で送る形（L8 のサーバー側。トークンは Worker の秘密）はまだ無い
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { drawOrderImage, type OrderImageInput } from "@/lib/order-image";

export type ShareState = { kind: "drawing" } | { kind: "ready"; url: string; file: File } | { kind: "error" };

interface Drawn {
  key: string;
  state: ShareState;
}

/** image は呼ぶ側で useMemo して渡す（参照が変わるたびに描き直すため） */
export function useOrderShare(image: OrderImageInput | null, text: string, fileName: string) {
  const key = image === null ? "" : `${image.title}|${image.parcels.map((p) => `${p.fieldId}:${p.rank ?? "-"}:${p.fill}`).join(",")}`;
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
  const file = state.kind === "ready" ? state.file : null;
  const canShareFile = typeof navigator !== "undefined" && file !== null && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  const share = useCallback(async () => {
    if (file === null) return;
    try {
      await navigator.share({ files: [file], text });
      setMessage(null);
    } catch (e) {
      // 自分で閉じたときは何も言わない
      if (e instanceof DOMException && e.name === "AbortError") return;
      setMessage("共有できませんでした。絵を保存して、文と一緒に送ってください");
    }
  }, [file, text]);

  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("文を写しました");
    } catch {
      setMessage("写せませんでした");
    }
  }, [text]);

  return { state, canShareFile, share, copyText, message };
}
