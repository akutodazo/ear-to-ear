/**
 * 線のアイコン（11-05: 文字だけの場所に、見て分かる印を添える。文字は消さない）。
 * 24px の枠、線は 2px、色は文字色（currentColor）。絵文字・色つきの絵は使わない（design-system §1-2）。
 * 意味は隣の文字が担うので、アイコン自体は読み上げない（aria-hidden）
 */
import type { SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "children">;

function Svg({ className, ...rest }: Props & { children: React.ReactNode }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}

/** 地図（折った紙） */
export function IconMap(props: Props) {
  return (
    <Svg {...props}>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </Svg>
  );
}

/** 見比べる（並んだ 2 枚の写真） */
export function IconCompare(props: Props) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="8" height="14" rx="1.5" />
      <rect x="13" y="5" width="8" height="14" rx="1.5" />
      <path d="M3 15l3-3 5 4M13 15l3-3 5 4" />
    </Svg>
  );
}

/** 刈る順番（番号つきの一覧） */
export function IconOrder(props: Props) {
  return (
    <Svg {...props}>
      <path d="M10 6h11M10 12h11M10 18h11" />
      <path d="M4 5h1.5v3M3.5 11.5c0-.8.7-1.5 1.5-1.5s1.5.6 1.5 1.4c0 1.1-3 1.6-3 2.6h3M3.5 16h2.2a1.3 1.3 0 010 2.5H5a1.3 1.3 0 010 2.5H3.5" />
    </Svg>
  );
}

/** 写真を送る（カメラ） */
export function IconCamera(props: Props) {
  return (
    <Svg {...props}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </Svg>
  );
}

/** 写真（1 枚） */
export function IconPhoto(props: Props) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5-8 8" />
    </Svg>
  );
}

/** 閉じる */
export function IconClose(props: Props) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
