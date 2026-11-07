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

/** 注意（三角に !。違う・できなかったを色だけでなく形でも伝える、#214） */
export function IconAlert(props: Props) {
  return (
    <Svg {...props}>
      <path d="M10.3 4.2L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z" />
      <path d="M12 9.5v4" />
      <path d="M12 17h.01" />
    </Svg>
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

/** 押している（切り替えが on。#190） */
export function IconCheck(props: Props) {
  return (
    <Svg {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  );
}

/** 判断を残す（鉛筆） */
export function IconPen(props: Props) {
  return (
    <Svg {...props}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17z" />
      <path d="M13.5 6.5l3 3" />
    </Svg>
  );
}

/** 同じ日の別の畑と（並んだ 2 つの区画） */
export function IconFields(props: Props) {
  return (
    <Svg {...props}>
      <path d="M3 8l5-3 4 2v11l-4-2-5 3z" />
      <path d="M12 7l4-2 5 3v11l-5-3-4 2" />
    </Svg>
  );
}

/** この畑の前の日と（暦） */
export function IconCalendar(props: Props) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8 15h3M13 15h3" />
    </Svg>
  );
}

/** 一覧を開く（下向きの山） */
export function IconChevron(props: Props) {
  return (
    <Svg {...props}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

/** 送る（共有） */
export function IconShare(props: Props) {
  return (
    <Svg {...props}>
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6" />
    </Svg>
  );
}

/** 詳細（写真 1 枚と下の 2 行。畑の詳細、#194） */
export function IconDetail(props: Props) {
  return (
    <Svg {...props}>
      <rect x="4" y="3" width="16" height="11" rx="2" />
      <path d="M4 18h16M4 21h10" />
    </Svg>
  );
}
