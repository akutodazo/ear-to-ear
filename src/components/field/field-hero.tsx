/**
 * 詳細の主役の写真（#195）。最新の確定済みの写真を全幅 4:3 で出し、下の暗い帯に番号・名前・撮影日と枚数を乗せる。
 * 読み込み中・写真が無い・読めないでも枠の大きさは変えない（段が跳ねない）。props だけで受け取る
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { IconCamera, IconPhoto } from "@/components/icons";

interface Props {
  fieldId: string;
  fieldName: string;
  benchmark: boolean;
  /** 最新の写真。無ければ null */
  photoId: string | null;
  meta: string | null;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}

export function FieldHero({ fieldId, fieldName, benchmark, photoId, meta, loading, failed, onRetry }: Props) {
  const [broken, setBroken] = useState<string | null>(null);
  const src = photoId === null ? null : `/api/photo-files/${encodeURIComponent(photoId)}`;
  const showPhoto = src !== null && broken !== photoId;
  return (
    <section className={showPhoto ? "hero" : "hero hero-plain"} aria-label={`${fieldId} ${fieldName}`}>
      {showPhoto && (
        <a className="hero-photo" href={src}>
          <Image src={src} alt={`${fieldId} ${fieldName}の最新の写真`} fill sizes="(max-width: 640px) 100vw, 640px" priority onError={() => setBroken(photoId)} />
        </a>
      )}
      {!showPhoto && (
        <div className="hero-empty">
          {loading ? null : failed ? (
            <>
              <IconPhoto />
              <span className="hero-empty-strong">写真を読み込めませんでした</span>
              <button type="button" className="button button-small" onClick={onRetry}>
                もう一度読み込む
              </button>
            </>
          ) : src !== null ? (
            <>
              <IconPhoto />
              <span>写真を開けませんでした</span>
            </>
          ) : (
            <>
              <IconCamera />
              <span>まだ写真がありません</span>
              <Link className="button button-small" href={`/upload#${fieldId}`}>
                この畑の写真を送る
              </Link>
            </>
          )}
        </div>
      )}
      <div className="hero-band">
        <div className="hero-title">
          <span className="hero-id">
            {fieldId}
            {benchmark && (
              <span className="hero-benchmark">
                <i aria-hidden="true" />
                目安の畑
              </span>
            )}
          </span>
          <h1 className="hero-name">{fieldName}</h1>
        </div>
        {showPhoto && meta && <span className="hero-meta">{meta}</span>}
      </div>
    </section>
  );
}
