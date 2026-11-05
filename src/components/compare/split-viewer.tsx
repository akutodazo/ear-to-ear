"use client";

/**
 * 2 枚の写真を上下に重ね、境目を指で動かして見比べる（11-05。field-share の「境目を指でずらす」考え方を参考に、自分で書く）。
 * 上の写真は境目より上だけ見え、下の写真は境目より下だけ見える。番号・名前・撮影日の帯は上下それぞれに。
 * 自分で持つのは境目の位置だけ。props だけで受け取る
 */
import Image from "next/image";
import { useRef, useState } from "react";
import { takenAtLabel } from "@/services/photo-labels";

export interface SlotPhoto {
  photoId: string;
  fieldId: string;
  fieldName: string;
  takenAt: string | null;
  benchmark: boolean;
}

interface Props {
  top: SlotPhoto;
  bottom: SlotPhoto;
}

const MIN = 12;
const MAX = 88;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

function Caption({ slot, place }: { slot: SlotPhoto; place: "top" | "bottom" }) {
  return (
    <span className={`split-caption split-caption-${place}`}>
      {slot.benchmark && <i className="mark mark-benchmark" aria-hidden="true" />}
      <span className="split-caption-title">
        {slot.benchmark && "目安 "}
        <span className="dock-id">{slot.fieldId}</span> {slot.fieldName}
      </span>
      <span className="split-caption-date">{takenAtLabel(slot.takenAt)}</span>
    </span>
  );
}

export function SplitViewer({ top, bottom }: Props) {
  const [split, setSplit] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const moveTo = (clientY: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return;
    setSplit(clamp(((clientY - rect.top) / rect.height) * 100));
  };
  const src = (id: string) => `/api/photo-files/${encodeURIComponent(id)}`;

  return (
    <div ref={frameRef} className="split" aria-label="2 枚の写真を上下に重ねて見比べる">
      <div className="split-layer">
        <Image src={src(bottom.photoId)} alt={`${bottom.fieldId} ${takenAtLabel(bottom.takenAt)}の写真`} fill sizes="100vw" />
        <Caption slot={bottom} place="bottom" />
      </div>
      <div className="split-layer" style={{ clipPath: `inset(0 0 ${100 - split}% 0)` }}>
        <Image src={src(top.photoId)} alt={`${top.fieldId} ${takenAtLabel(top.takenAt)}の写真`} fill sizes="100vw" priority />
        <Caption slot={top} place="top" />
      </div>
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
    </div>
  );
}
