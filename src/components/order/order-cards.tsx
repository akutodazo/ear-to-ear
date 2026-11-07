"use client";

/**
 * 刈る順番の一覧を、大きな写真のカードに（#196。西田 PM 11-07「Netflix・Amazon の動画一覧のように」「ドラッグを 1 つに」「タップ後に詳細」）。
 * 写真の上に重ねるのは 3 つだけ: 順位の丸（左上）・下の暗い帯に番号と名前と今の判断・右下の持ち手 ≡。
 * 並べ替えは持ち手だけ: 押した瞬間につかみ、指で動かすとほかのカードがよけ、離すとそこに入る。端に近づくと一覧を送る。
 * 持ち手を押すだけ（動かさない）なら、動かし方のシートを開く（ドラッグの代わり）。カードの本体を押すと詳細へ。
 * 順位なしの畑は同じ一覧の下に、細い線と「順位なし」で続ける（丸が無いだけ）。props だけで受け取る（自分で持つのはつかんでいる間の位置だけ）
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Field } from "@/types";
import { moveTo, type OrderDraft, type OrderRow } from "@/services/harvest-order";
import { IconCamera } from "@/components/icons";

interface Props {
  order: OrderDraft;
  rows: Record<string, OrderRow>;
  fieldsById: Record<string, Field>;
  photoIdByField: Record<string, string>;
  confirmed: boolean;
  selectedId: string | null;
  onMoveTo: (from: number, to: number) => void;
  /** 持ち手を押すだけで開く動かし方 */
  onOpenMove: (fieldId: string) => void;
}

const GAP_PX = 16;
const TAP_PX = 8;
const EDGE_PX = 72;

interface Drag {
  from: number;
  startY: number;
  dy: number;
  step: number;
  scrollStart: number;
}

type HandleProps = { label: string } & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onKeyDown" | "onClick">;

function Handle({ label, ...handlers }: HandleProps) {
  return (
    <button type="button" className="order-card-handle" aria-label={label} {...handlers}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

function CardBody({ id, rank, props }: { id: string; rank: number | null; props: Props }) {
  const row = props.rows[id];
  const field = props.fieldsById[id];
  const [broken, setBroken] = useState(false);
  if (!row || !field) return null;
  const photoId = props.photoIdByField[id];
  const showPhoto = photoId !== undefined && !broken;
  return (
    <Link className={showPhoto ? "order-card-link" : "order-card-link order-card-plain"} href={`/fields/${id}`} draggable={false}>
      {showPhoto ? (
        <Image className="order-card-photo" src={`/api/photo-files/${encodeURIComponent(photoId)}`} alt="" fill sizes="(max-width: 640px) 100vw, 600px" draggable={false} onError={() => setBroken(true)} />
      ) : (
        <span className="order-card-empty">
          <IconCamera />
          {photoId === undefined ? "写真はまだありません" : "写真を開けませんでした"}
        </span>
      )}
      {rank !== null && (
        <span className={props.confirmed ? "rank order-card-rank rank-confirmed" : "rank order-card-rank"} aria-label={`${rank} 番目`}>
          {rank}
        </span>
      )}
      <span className="order-card-band">
        <span className="order-card-title">
          <span className="order-card-id">{id}</span>
          <span className="order-card-name">{field.name}</span>
          {row.benchmark && (
            <span className="order-card-benchmark">
              <i aria-hidden="true" />
              目安
            </span>
          )}
        </span>
        <span className="order-card-status">
          {row.status !== "none" && <i className={`mark mark-${row.status}`} aria-hidden="true" />}
          {row.status !== "none" ? row.lines[0] : "判断はまだありません"}
        </span>
      </span>
    </Link>
  );
}

export function OrderCards(props: Props) {
  const { order } = props;
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const pointerY = useRef(0);
  const frame = useRef<number | null>(null);

  // つかんでいる間は一覧を指で送らない（端の自動送りだけ）
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, []);

  const count = order.ranked.length;
  const clamp = (i: number) => Math.min(count - 1, Math.max(0, i));
  const scroller = () => document.querySelector<HTMLElement>(".order-body");
  const offset = (d: Drag) => d.dy + ((scroller()?.scrollTop ?? 0) - d.scrollStart);
  const target = drag ? clamp(drag.from + Math.round(offset(drag) / drag.step)) : -1;
  const preview = drag ? moveTo(order.ranked, drag.from, target) : order.ranked;

  const tick = () => {
    const d = dragRef.current;
    const box = scroller();
    if (!d || !box) return;
    const r = box.getBoundingClientRect();
    const y = pointerY.current;
    const depth = y < r.top + EDGE_PX ? -(r.top + EDGE_PX - y) : y > r.bottom - EDGE_PX ? y - (r.bottom - EDGE_PX) : 0;
    if (depth !== 0) {
      box.scrollTop += Math.sign(depth) * 16 * Math.min(1, (Math.abs(depth) / EDGE_PX) ** 2);
      setDrag({ ...d });
    }
    frame.current = window.requestAnimationFrame(tick);
  };

  const start = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const card = e.currentTarget.closest<HTMLElement>(".order-card");
    if (!card) return;
    const d: Drag = { from: index, startY: e.clientY, dy: 0, step: card.getBoundingClientRect().height + GAP_PX, scrollStart: scroller()?.scrollTop ?? 0 };
    dragRef.current = d;
    pointerY.current = e.clientY;
    setDrag(d);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 指の情報が無い環境でも並べ替えは続ける */
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    frame.current = window.requestAnimationFrame(tick);
  };

  const move = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    pointerY.current = e.clientY;
    const next = { ...d, dy: e.clientY - d.startY };
    dragRef.current = next;
    setDrag(next);
  };

  const end = (id: string, commit: boolean) => {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    frame.current = null;
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d || !commit) return;
    const moved = offset(d);
    if (Math.abs(moved) < TAP_PX) {
      props.onOpenMove(id);
      return;
    }
    const to = clamp(d.from + Math.round(moved / d.step));
    if (to !== d.from) props.onMoveTo(d.from, to);
  };

  const shiftOf = (i: number): number => {
    if (!drag || i === drag.from) return 0;
    if (drag.from < target && i > drag.from && i <= target) return -drag.step;
    if (drag.from > target && i >= target && i < drag.from) return drag.step;
    return 0;
  };

  return (
    <div className="order-cards">
      {count === 0 && <p className="order-dropzone">順位を付けた畑はまだありません。畑の持ち手 ≡ か、詳細の「順位を付ける」で並べられます</p>}
      {count > 0 && (
        <ol className={drag ? "order-cards-list order-cards-dragging" : "order-cards-list"} aria-label="刈る順番（持ち手 ≡ で並べ替え）">
          {order.ranked.map((id, i) => {
            const lifted = drag?.from === i;
            const style = lifted && drag ? { transform: `translateY(${offset(drag)}px) scale(1.03)` } : drag ? { transform: `translateY(${shiftOf(i)}px)` } : undefined;
            return (
              <li key={id} data-field={id} className={`order-card${lifted ? " order-card-lifted" : ""}${props.selectedId === id ? " order-card-selected" : ""}`} style={style}>
                <CardBody id={id} rank={preview.indexOf(id) + 1} props={props} />
                <Handle
                  label={`${id} ${props.fieldsById[id]?.name ?? ""} を動かす（${i + 1} 番目）`}
                  onPointerDown={(e) => start(i, e)}
                  onPointerMove={move}
                  onPointerUp={() => end(id, true)}
                  onPointerCancel={() => end(id, false)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" && i > 0) {
                      e.preventDefault();
                      props.onMoveTo(i, i - 1);
                    } else if (e.key === "ArrowDown" && i < count - 1) {
                      e.preventDefault();
                      props.onMoveTo(i, i + 1);
                    }
                  }}
                />

              </li>
            );
          })}
        </ol>
      )}
      {order.unranked.length > 0 && (
        <>
          <div className="order-divider" role="separator">
            <span>順位なし</span>
          </div>
          <ul className="order-cards-list" aria-label="順位なしの畑">
            {order.unranked.map((id) => (
              <li key={id} data-field={id} className={`order-card${props.selectedId === id ? " order-card-selected" : ""}`}>
                <CardBody id={id} rank={null} props={props} />
                <Handle label={`${id} ${props.fieldsById[id]?.name ?? ""} の順位を付ける`} onClick={() => props.onOpenMove(id)} />
              </li>
            ))}
          </ul>
        </>
      )}
      {order.done.length > 0 && (
        <p className="order-done">
          <i className="mark mark-done" aria-hidden="true" /> 収穫済: {order.done.map((id) => `${id} ${props.fieldsById[id]?.name ?? ""}`).join("、")}
        </p>
      )}
    </div>
  );
}
