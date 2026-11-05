"use client";

/**
 * 刈る順番の一覧（11-05、3 段目）。順位の丸・写真・番号と名前・記録の文・足りない記録。
 * 並べ替えは持ち手を指で上下に動かすか、▲▼ のボタン（持ち手なしでも並べ替えられる）。
 * 順位なしの畑は「順位を付ける」で順位の最後へ。props だけで受け取る（自分で持つのは指で動かしている間の位置だけ）
 */
import Image from "next/image";
import { useRef, useState } from "react";
import type { Field } from "@/types";
import type { OrderDraft, OrderRow } from "@/services/harvest-order";
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

function Row({
  fieldId,
  rank,
  props,
  dragging,
  handle,
}: {
  fieldId: string;
  rank: number | null;
  props: Props;
  dragging?: { dy: number } | null;
  handle?: React.ReactNode;
}) {
  const row = props.rows[fieldId];
  const field = props.fieldsById[fieldId];
  if (!row || !field) return null;
  const photoId = props.photoIdByField[fieldId];
  const selected = props.selectedId === fieldId;
  const index = rank === null ? -1 : rank - 1;
  return (
    <li
      className={`order-row${selected ? " order-row-selected" : ""}${dragging ? " order-row-dragging" : ""}`}
      style={dragging ? { transform: `translateY(${dragging.dy}px)` } : undefined}
      data-field={fieldId}
    >
      <button type="button" className="order-row-main" onClick={() => props.onSelect(fieldId)} aria-label={`${fieldId} ${field.name}を地図で示す`}>
        {rank !== null ? (
          <span className={props.confirmed ? "rank rank-confirmed" : "rank"} aria-label={`${rank} 番目`}>
            {rank}
          </span>
        ) : (
          <span className="rank rank-none" aria-hidden="true" />
        )}
        <span className="order-thumb">
          {photoId ? <Image src={`/api/photo-files/${encodeURIComponent(photoId)}`} alt="" fill sizes="56px" /> : <IconPhoto />}
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
      </button>
      <span className={rank !== null ? "order-controls" : "order-controls order-controls-single"}>
        {rank !== null ? (
          <>
            <button type="button" className="order-step" aria-label={`${fieldId} を 1 つ上へ`} disabled={index === 0} onClick={() => props.onMove(index, -1)}>
              ▲
            </button>
            {handle}
            <button type="button" className="order-step" aria-label={`${fieldId} を 1 つ下へ`} disabled={index === props.order.ranked.length - 1} onClick={() => props.onMove(index, 1)}>
              ▼
            </button>
            <button type="button" className="order-unrank" aria-label={`${fieldId} の順位を外す`} onClick={() => props.onToggle(fieldId)}>
              外す
            </button>
          </>
        ) : (
          <button type="button" className="order-rank-button" onClick={() => props.onToggle(fieldId)}>
            順位を付ける
          </button>
        )}
      </span>
    </li>
  );
}

export function OrderList(props: Props) {
  const { order } = props;
  const listRef = useRef<HTMLOListElement>(null);
  const [drag, setDrag] = useState<{ from: number; startY: number; dy: number; rowHeight: number } | null>(null);

  const targetOf = (d: { from: number; dy: number; rowHeight: number }) => d.from + Math.round(d.dy / Math.max(1, d.rowHeight));

  const handleFor = (index: number) => (
    <span
      className="order-handle"
      role="button"
      tabIndex={-1}
      aria-label="指で上下に動かして並べ替える"
      onPointerDown={(e) => {
        const li = (e.currentTarget as HTMLElement).closest("li");
        const rowHeight = li?.getBoundingClientRect().height ?? 72;
        setDrag({ from: index, startY: e.clientY, dy: 0, rowHeight });
        // 指が持ち手の外に出ても追う。取れない環境（指の情報が無い）でも並べ替えは続ける
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* 取れなくても動く */
        }
      }}
      onPointerMove={(e) => {
        if (drag && drag.from === index) setDrag({ ...drag, dy: e.clientY - drag.startY });
      }}
      onPointerUp={() => {
        if (drag && drag.from === index) {
          const to = targetOf(drag);
          if (to !== drag.from) props.onMoveTo(drag.from, to);
        }
        setDrag(null);
      }}
      onPointerCancel={() => setDrag(null)}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M5 8h14M5 12h14M5 16h14" />
      </svg>
    </span>
  );

  return (
    <div className="order-list">
      {order.ranked.length === 0 ? (
        <p className="order-empty">順位を付けられる記録がまだありません。下の畑の「順位を付ける」で並べられます</p>
      ) : (
        <ol ref={listRef} className="order-group" aria-label="刈る順番">
          {order.ranked.map((id, i) => (
            <Row key={id} fieldId={id} rank={i + 1} props={props} dragging={drag && drag.from === i ? { dy: drag.dy } : null} handle={handleFor(i)} />
          ))}
        </ol>
      )}
      {order.unranked.length > 0 && (
        <section aria-label="順位を付けていない畑">
          <h2 className="order-group-title">順位を付けていない畑</h2>
          <ul className="order-group">
            {order.unranked.map((id) => (
              <Row key={id} fieldId={id} rank={null} props={props} />
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
