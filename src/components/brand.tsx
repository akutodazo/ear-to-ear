/**
 * ロゴ（11-06 本人決定、I–1「畑を集めると、穂になる」）: マーク（形の違う小さな圃場を集めた麦の穂）と、線で描いた「ear-to-ear」の横組み。
 * 「ear」を「耳」と読ませないため、文字の前に穂を置く。色は文字色（currentColor）。アプリのアイコンは src/app/icon.svg
 */

/** 穂の粒（圃場の形）と、のぎ・茎 */
function EarShape() {
  return (
    <g fill="currentColor" transform="translate(33 95) rotate(24) scale(1.06 .94)">
      <path d="M-4 -6L-17 -17L-19 -34L-5 -26Z" />
      <path d="M1 -11L14 -17L19 -36L3 -29Z" />
      <path d="M-5 -31L-18 -39L-20 -55L-7 -49Z" />
      <path d="M1 -34L16 -42L18 -58L2 -52Z" />
      <path d="M-6 -54L-16 -61L-17 -74L-6 -68Z" />
      <path d="M-1 -58L11 -64L13 -79L1 -72Z" />
      <path d="M-4 -73L-9 -84L-5 -96L0 -84Z" />
      <path d="M-19 -54L-23 -67 M-17 -73L-20 -83 M13 -78L16 -91" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M-5 0L-4 -16L0 -12L-1 0Z" />
    </g>
  );
}

/** 「ear-to-ear」の文字の線（1 文字ずつの位置） */
const LETTERS: { x: number; d: string }[] = [
  { x: 0, d: "M4 17L23 15C23 8 19 5 14 5C6 5 3 12 4 19C5 28 15 31 22 25" },
  { x: 28, d: "M23 6V28 M22 12C18 2 6 4 4 15C2 28 15 34 22 23" },
  { x: 57, d: "M4 28V6 M5 16Q8 4 18 6" },
  { x: 77, d: "M2 19H12" },
  { x: 94, d: "M9 0V21Q9 30 18 27 M3 8H17" },
  { x: 116, d: "M14 5C1 5 0 28 13 28C26 29 28 5 14 5Z" },
  { x: 145, d: "M2 19H12" },
  { x: 162, d: "M4 17L23 15C23 8 19 5 14 5C6 5 3 12 4 19C5 28 15 31 22 25" },
  { x: 190, d: "M23 6V28 M22 12C18 2 6 4 4 15C2 28 15 34 22 23" },
  { x: 219, d: "M4 28V6 M5 16Q8 4 18 6" },
];

/** 上の帯の左に置く、マーク＋ロゴタイプ。読み上げは「ear-to-ear」 */
export function Brand({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 318 98" role="img" aria-label="ear-to-ear" focusable="false">
      <g transform="translate(0 7) scale(.82)">
        <EarShape />
      </g>
      <g transform="translate(90 27) scale(.91)" fill="none" stroke="currentColor" strokeWidth="3.9" strokeLinecap="round" strokeLinejoin="round">
        {LETTERS.map((l, i) => (
          <path key={i} d={l.d} transform={`translate(${l.x} 0)`} />
        ))}
      </g>
    </svg>
  );
}
