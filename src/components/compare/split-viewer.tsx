"use client";

/**
 * 2 枚の写真を上下に並べ、境目を指で動かして見比べる（11-05。field-share の「境目を指でずらす」考え方を参考に、自分で書く）。
 * - overlay（この畑の前の日と）: 同じ畑・同じ立ち位置の 2 枚を重ね、境目より上に上の写真を見せる
 * - stack（同じ日の別の畑と）: 立ち位置が違うので重ねず、上下 2 つの窓にそれぞれの写真の真ん中を出し、境目で窓の高さを配分する（精査 3 回目 #4）
 * 上の写真の帯を押すと相手を選べる（stack のとき。精査 3 回目 #2）。自分で持つのは境目の位置と、相手の一覧を開いているかだけ
 */
import Image from "next/image";
import { useRef, useState } from "react";
import { takenAtLabel } from "@/services/photo-labels";
import type { CompareSlot, PartnerChoice } from "@/services/photo-compare";
import { IconChevron, IconClose } from "@/components/icons";

export interface PartnerPicker {
  /** 例「7/19 に撮った畑」（その日に撮った畑だけを並べる。精査 3 回目 #5） */
  title: string;
  options: PartnerChoice[];
  currentId: string;
  onPick: (fieldId: string) => void;
}

interface Props {
  kind: "overlay" | "stack";
  top: CompareSlot;
  bottom: CompareSlot;
  /** 上の帯の頭に添える印（例「前の日」） */
  topTag?: string;
  picker?: PartnerPicker;
}

const MIN = 15;
const MAX = 85;
/** 見えている部分がこれより狭い写真の帯は隠す（持ち手と重ねない。精査 3 回目 #9） */
const CAPTION_MIN = 24;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));
const src = (id: string) => `/api/photo-files/${encodeURIComponent(id)}`;

function CaptionBody({ slot, tag }: { slot: CompareSlot; tag?: string }) {
  return (
    <>
      {tag && <span className="split-tag">{tag}</span>}
      {slot.benchmark && <i className="mark mark-benchmark" aria-hidden="true" />}
      <span className="split-caption-title">
        {slot.benchmark && "目安 "}
        <span className="dock-id">{slot.fieldId}</span> {slot.fieldName}
      </span>
      <span className="split-caption-date">{takenAtLabel(slot.takenAt)}</span>
    </>
  );
}

export function SplitViewer({ kind, top, bottom, topTag, picker }: Props) {
  const [split, setSplit] = useState(50);
  const [picking, setPicking] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const moveTo = (clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return;
    setSplit(clamp(((clientY - rect.top) / rect.height) * 100));
  };

  const topCaption = picker ? (
    <button type="button" className="split-caption split-caption-top split-caption-button" aria-haspopup="dialog" aria-expanded={picking} onClick={() => setPicking(true)}>
      <CaptionBody slot={top} tag={topTag} />
      <IconChevron className="split-caption-chevron" />
      <span className="sr-only">（押すと比べる畑を選べます）</span>
    </button>
  ) : (
    <span className="split-caption split-caption-top">
      <CaptionBody slot={top} tag={topTag} />
    </span>
  );
  const bottomCaption = (
    <span className="split-caption split-caption-bottom split-caption-self">
      <CaptionBody slot={bottom} />
    </span>
  );
  const topAlt = `${top.fieldId} ${takenAtLabel(top.takenAt)}の写真`;
  const bottomAlt = `${bottom.fieldId} ${takenAtLabel(bottom.takenAt)}の写真`;

  return (
    <div ref={frameRef} className={`split split-${kind}`} aria-label="2 枚の写真を上下に並べて見比べる">
      {kind === "overlay" ? (
        <>
          <div className="split-layer">
            <Image src={src(bottom.photoId)} alt={bottomAlt} fill sizes="100vw" />
          </div>
          <div className="split-layer" style={{ clipPath: `inset(0 0 ${100 - split}% 0)` }}>
            <Image src={src(top.photoId)} alt={topAlt} fill sizes="100vw" priority />
          </div>
        </>
      ) : (
        <>
          <div className="split-window" style={{ top: 0, height: `${split}%` }}>
            <Image src={src(top.photoId)} alt={topAlt} fill sizes="100vw" priority />
          </div>
          <div className="split-window" style={{ top: `${split}%`, height: `${100 - split}%` }}>
            <Image src={src(bottom.photoId)} alt={bottomAlt} fill sizes="100vw" />
          </div>
        </>
      )}
      {split >= CAPTION_MIN && topCaption}
      {100 - split >= CAPTION_MIN && bottomCaption}
      <div
        className="split-handle"
        role="slider"
        tabIndex={0}
        aria-label="境目"
        aria-orientation="vertical"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={Math.round(split)}
        style={{ top: `${split}%` }}
        onPointerDown={(e) => {
          draggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          moveTo(e.clientY);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) moveTo(e.clientY);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") setSplit((v) => clamp(v - 5));
          if (e.key === "ArrowDown") setSplit((v) => clamp(v + 5));
        }}
      >
        <span className="split-handle-line" aria-hidden="true" />
        <span className="split-handle-grip" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 9l5-5 5 5M7 15l5 5 5-5" />
          </svg>
        </span>
      </div>
      {picker && picking && (
        <div
          className="split-picker"
          role="dialog"
          aria-label={picker.title}
          onKeyDown={(e) => {
            if (e.key === "Escape") setPicking(false);
          }}
        >
          <div className="split-picker-head">
            <span className="split-picker-title">{picker.title}</span>
            <button type="button" className="split-picker-close" aria-label="閉じる" onClick={() => setPicking(false)}>
              <IconClose />
            </button>
          </div>
          <ul className="split-picker-list">
            {picker.options.map((o) => (
              <li key={o.fieldId}>
                <button
                  type="button"
                  className={o.fieldId === picker.currentId ? "split-picker-item split-picker-current" : "split-picker-item"}
                  aria-pressed={o.fieldId === picker.currentId}
                  onClick={() => {
                    setPicking(false);
                    picker.onPick(o.fieldId);
                  }}
                >
                  {o.benchmark && <i className="mark mark-benchmark" aria-hidden="true" />}
                  {o.label}
                  {o.benchmark && <span className="split-picker-note">目安</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
