"use client";

/**
 * 刈る順番の一覧（11-05、3 段目）。順位の丸・写真・番号と名前・記録の文・足りない記録。
 * 並べ替えは音楽のプレイリストのように: 行を長押しするとつかめ、指で動かすとほかの行がよけて隙間が空き、離すとそこに入る
 * （持ち手からはすぐつかめる）。つかんでいる間は順位の丸も入る先の番号に変わる。指で動かせない人のために ▲▼ も残す。
 * 順位なしの畑は「順位を付ける」で順位の最後へ。props だけで受け取る（自分で持つのは、つかんでいる間の位置だけ）
 */
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Field } from "@/types";
import { moveTo, type OrderDraft, type OrderRow } from "@/services/harvest-order";
import { monthDay } from "@/services/last-season";
import { IconPhoto } from "@/components/icons";

interface Props {
  order: OrderDraft;
  rows: Record<string, OrderRow>;
  fieldsById: Record<string, Field>;
  /** 畑ごとの最新の写真の id（無ければ無い） */
  photoIdByField: Record<string, string>;
  /** 確定した順を見ているか（丸を実線に） */
  confirmed: boolean;
  selectedId: string | null;
  onSelect: (fieldId: string) => void;
  onMove: (index: number, delta: number) => void;
  onMoveTo: (from: number, to: number) => void;
  onToggle: (fieldId: string) => void;
}

const MISSING_LABEL = { judgment: "判断", photo: "今年の写真" } as const;
/** 長押しと見なす時間（ms）。これより前に指が動いたら、つかまずに一覧を送る */
const LONG_PRESS_MS = 350;
const MOVE_TOLERANCE_PX = 8;
/** 行と行の間（CSS の .order-group の gap と同じ） */
const ROW_GAP_PX = 6;

interface Drag {
  from: number;
  startY: number;
  dy: number;
  /** 行の高さ＋間。1 行分動いたかの目安 */
  step: number;
}

interface Press {
  timer: number;
  index: number;
  startY: number;
  el: HTMLElement;
  pointerId: number;
}

function RowBody({ fieldId, rank, props }: { fieldId: string; rank: number | null; props: Props }) {
  const row = props.rows[fieldId];
  const field = props.fieldsById[fieldId];
  if (!row || !field) return null;
  const photoId = props.photoIdByField[fieldId];
  return (
    <>
      {rank !== null ? (
        <span className={props.confirmed ? "rank rank-confirmed" : "rank"} aria-label={`${rank} 番目`}>
          {rank}
        </span>
      ) : (
        <span className="rank rank-none" aria-hidden="true" />
      )}
      <span className="order-thumb">
        {photoId ? <Image src={`/api/photo-files/${encodeURIComponent(photoId)}`} alt="" fill sizes="56px" draggable={false} /> : <IconPhoto />}
      </span>
      <span className="order-text">
        <span className="order-title">
          <span className="dock-id">{fieldId}</span> {field.name}
          {row.benchmark && (
            <span className="order-benchmark">
              <i className="mark mark-benchmark" aria-hidden="true" />
              目安
            </span>
          )}
        </span>
        {row.lines.map((line, i) => (
          <span key={line} className="order-lines">
            {i === 0 && row.status !== "none" && <i className={`mark mark-${row.status}`} aria-hidden="true" />}
            {line}
          </span>
        ))}
        {row.missing.length > 0 && <span className="order-missing">足りない記録: {row.missing.map((m) => MISSING_LABEL[m]).join("・")}</span>}
        {row.latestPhotoAt && !row.missing.includes("photo") && row.status === "none" && <span className="order-missing">最新の写真 {monthDay(row.latestPhotoAt)}</span>}
      </span>
    </>
  );
}

export function OrderList(props: Props) {
  const { order } = props;
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const pressRef = useRef<Press | null>(null);
  /** つかんで離した直後の「押した」を、地図で示す操作として扱わない */
  const suppressClickRef = useRef(false);

  // つかんでいる間は一覧を送らない（指の動きを並べ替えだけに使う）。passive: false でないと止められない
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, []);

  const count = order.ranked.length;
  const clampIndex = (i: number) => Math.min(count - 1, Math.max(0, i));
  const target = drag ? clampIndex(drag.from + Math.round(drag.dy / drag.step)) : -1;
  // つかんでいる間の並び（丸の番号を入る先に合わせる）
  const preview = drag ? moveTo(order.ranked, drag.from, target) : order.ranked;

  const cancelPress = () => {
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  };

  const startDrag = (index: number, el: HTMLElement, pointerId: number, startY: number) => {
    cancelPress();
    const d: Drag = { from: index, startY, dy: 0, step: el.getBoundingClientRect().height + ROW_GAP_PX };
    dragRef.current = d;
    setDrag(d);
    try {
      el.setPointerCapture(pointerId);
    } catch {
      /* 指の情報が無い環境でも並べ替えは続ける */
    }
    // つかめたことを指に知らせる（対応する端末だけ）
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
  };

  const endDrag = (commit: boolean) => {
    cancelPress();
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d) return;
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    if (commit) {
      const to = clampIndex(d.from + Math.round(d.dy / d.step));
      if (to !== d.from) props.onMoveTo(d.from, to);
    }
  };

  const shiftOf = (i: number): number => {
    if (!drag || i === drag.from) return 0;
    if (drag.from < target && i > drag.from && i <= target) return -drag.step;
    if (drag.from > target && i >= target && i < drag.from) return drag.step;
    return 0;
  };

  return (
    <div className="order-list">
      {count === 0 ? (
        <p className="order-empty">順位を付けられる記録がまだありません。下の畑の「順位を付ける」で並べられます</p>
      ) : (
        <ol className={drag ? "order-group order-group-dragging" : "order-group"} aria-label="刈る順番（行を長押しして動かすと並べ替えられます）">
          {order.ranked.map((id, i) => {
            const field = props.fieldsById[id];
            const isDragged = drag?.from === i;
            const style = isDragged ? { transform: `translateY(${drag.dy}px) scale(1.02)` } : drag ? { transform: `translateY(${shiftOf(i)}px)` } : undefined;
            return (
              <li
                key={id}
                data-field={id}
                className={`order-row${props.selectedId === id ? " order-row-selected" : ""}${isDragged ? " order-row-dragging" : ""}`}
                style={style}
                onPointerDown={(e) => {
                  if (e.button !== 0 || dragRef.current) return;
                  // ▲▼・外す を押したときはつかまない
                  if ((e.target as HTMLElement).closest(".order-controls button")) return;
                  const el = e.currentTarget;
                  const { pointerId, clientY } = e;
                  cancelPress();
                  pressRef.current = { timer: window.setTimeout(() => startDrag(i, el, pointerId, clientY), LONG_PRESS_MS), index: i, startY: clientY, el, pointerId };
                }}
                onPointerMove={(e) => {
                  const d = dragRef.current;
                  if (d) {
                    const next = { ...d, dy: e.clientY - d.startY };
                    dragRef.current = next;
                    setDrag(next);
                  } else if (pressRef.current && Math.abs(e.clientY - pressRef.current.startY) > MOVE_TOLERANCE_PX) {
                    cancelPress();
                  }
                }}
                onPointerUp={() => endDrag(true)}
                onPointerCancel={() => endDrag(false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <button
                  type="button"
                  className="order-row-main"
                  onClick={() => {
                    if (!suppressClickRef.current) props.onSelect(id);
                  }}
                  aria-label={`${id} ${field?.name ?? ""}を地図で示す`}
                >
                  <RowBody fieldId={id} rank={preview.indexOf(id) + 1} props={props} />
                </button>
                <span className="order-controls">
                  <button type="button" className="order-step" aria-label={`${id} を 1 つ上へ`} disabled={i === 0} onClick={() => props.onMove(i, -1)}>
                    ▲
                  </button>
                  <span
                    className="order-handle"
                    aria-hidden="true"
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      const li = e.currentTarget.closest("li");
                      if (li) startDrag(i, li, e.pointerId, e.clientY);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M5 8h14M5 12h14M5 16h14" />
                    </svg>
                  </span>
                  <button type="button" className="order-step" aria-label={`${id} を 1 つ下へ`} disabled={i === count - 1} onClick={() => props.onMove(i, 1)}>
                    ▼
                  </button>
                  <button type="button" className="order-unrank" aria-label={`${id} の順位を外す`} onClick={() => props.onToggle(id)}>
                    外す
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {order.unranked.length > 0 && (
        <section aria-label="順位を付けていない畑">
          <h2 className="order-group-title">順位を付けていない畑</h2>
          <ul className="order-group">
            {order.unranked.map((id) => (
              <li key={id} data-field={id} className={`order-row${props.selectedId === id ? " order-row-selected" : ""}`}>
                <button type="button" className="order-row-main" onClick={() => props.onSelect(id)} aria-label={`${id} ${props.fieldsById[id]?.name ?? ""}を地図で示す`}>
                  <RowBody fieldId={id} rank={null} props={props} />
                </button>
                <span className="order-controls order-controls-single">
                  <button type="button" className="order-rank-button" onClick={() => props.onToggle(id)}>
                    順位を付ける
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {order.done.length > 0 && (
        <section aria-label="収穫済">
          <h2 className="order-group-title">
            <i className="mark mark-done" aria-hidden="true" /> 収穫済
          </h2>
          <p className="order-done">{order.done.map((id) => `${id} ${props.fieldsById[id]?.name ?? ""}`).join("、")}</p>
        </section>
      )}
    </div>
  );
}
