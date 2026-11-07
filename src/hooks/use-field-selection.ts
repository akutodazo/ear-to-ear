/**
 * 地図で選んでいる圃場（L1）。地図・板・下の帯で同じ 1 つの値を使い、URL の `#A-03` に写す
 * （再読み込みや圃場ページからの「地図に戻る」で同じ圃場に戻る。docs/design/design-system.md §7-1）。
 */
"use client";

import { useCallback, useSyncExternalStore } from "react";
import fieldsData from "@/data/fields.json";
import type { Field } from "@/types";

const fields: Field[] = fieldsData;

function fromHash(): string | null {
  const id = window.location.hash.replace(/^#/, "");
  return fields.some((f) => f.id === id) ? id : null;
}

/** URL のハッシュを外の状態として購読する（静的書き出しの事前描画では null） */
function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useFieldSelection() {
  const selectedId = useSyncExternalStore(subscribe, fromHash, () => null);

  const select = useCallback((id: string | null) => {
    const next = id === null ? window.location.pathname + window.location.search : `#${id}`;
    try {
      // replaceState は hashchange を起こさないので、自分で知らせる
      window.history.replaceState(null, "", next);
    } catch {
      window.location.hash = id ?? "";
    }
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);

  const selected = selectedId === null ? null : (fields.find((f) => f.id === selectedId) ?? null);
  return { selectedId, selected, select };
}
