/**
 * 要素の高さ（px）を測り続ける。地図の板の高さから、選んだ畑を隠さない余白を決めるため（精査 4 回目 #1）。
 * 要素が無いときは 0。ref はコールバックで渡す（板が出たり消えたりするため）
 */
"use client";

import { useCallback, useState } from "react";

export function useElementHeight<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [height, setHeight] = useState(0);
  const ref = useCallback((el: T | null) => {
    if (el === null) {
      setHeight(0);
      return;
    }
    setHeight(Math.round(el.getBoundingClientRect().height));
    const observer = new ResizeObserver(() => setHeight(Math.round(el.getBoundingClientRect().height)));
    observer.observe(el);
    return () => {
      observer.disconnect();
      setHeight(0);
    };
  }, []);
  return [ref, height];
}
