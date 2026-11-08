/**
 * LINE から取った JPEG から、画像の復元に要るセグメントだけを残す（L9、K6、#172）。純粋関数。
 * Web の送る流れはブラウザで作り直した JPEG を受けるが、LINE からは端末で作られたバイト列がそのまま届く。
 * そこで「消すもの」を数えるのではなく「残すもの」を決める: DQT・DHT・DAC・DRI・SOF・SOS とスキャンの中身・EOI。
 * APP0〜15・COM・JPGn など、それ以外は中身を読まずに全部捨てる（最初のスキャンの後ろ、EOI の後ろも）。
 * JPEG として読めなければ null。例外は出さない。
 */

const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;
const DQT = 0xdb;
const DHT = 0xc4;
const DAC = 0xcc;
const DRI = 0xdd;

/** C0〜CF のうち C4（DHT）・C8（JPG）・CC（DAC）は SOF ではない */
function isSof(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== DHT && marker !== 0xc8 && marker !== DAC;
}

/** 残す長さ付きのセグメント */
function isKept(marker: number): boolean {
  return marker === DQT || marker === DHT || marker === DAC || marker === DRI || marker === SOS || isSof(marker);
}

/** 長さの欄を持たないマーカー（TEM・RST・SOI・EOI）。SOS の前・スキャンの間に出たら壊れた形 */
function isStandalone(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export function keepImageSegmentsOnly(bytes: Uint8Array): Uint8Array | null {
  const n = bytes.length;
  if (n < 4 || bytes[0] !== 0xff || bytes[1] !== SOI) return null;
  const kept: Uint8Array[] = [Uint8Array.of(0xff, SOI)];
  let sawSof = false;
  let sawSos = false;
  let offset = 2;
  while (offset < n) {
    if (bytes[offset] !== 0xff) return null;
    // マーカーの前の詰め物（FF FF …）は飛ばす
    while (offset < n && bytes[offset] === 0xff) offset++;
    if (offset >= n) return null;
    const marker = bytes[offset];
    if (marker === EOI) {
      if (!sawSof || !sawSos) return null;
      kept.push(Uint8Array.of(0xff, EOI));
      // EOI の後ろに付け足したものは捨てる
      return concat(kept);
    }
    if (isStandalone(marker) || marker === 0x00) return null;
    const start = offset + 1;
    if (start + 2 > n) return null;
    const length = (bytes[start] << 8) | bytes[start + 1];
    if (length < 2 || start + length > n) return null;
    const end = start + length;
    if (isKept(marker)) {
      kept.push(bytes.subarray(offset - 1, end));
      if (isSof(marker)) sawSof = true;
    }
    offset = end;
    if (marker !== SOS) continue;
    if (!sawSof) return null;
    sawSos = true;
    // スキャンの中身: 詰め物（FF 00）・RST（FF D0〜D7）・詰め物（FF FF）を含めて、次のマーカーの FF の手前まで残す
    const dataStart = offset;
    for (;;) {
      const ff = bytes.indexOf(0xff, offset);
      if (ff === -1 || ff + 1 >= n) return null;
      const next = bytes[ff + 1];
      if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) {
        offset = ff + 2;
      } else if (next === 0xff) {
        offset = ff + 1;
      } else {
        offset = ff;
        break;
      }
    }
    kept.push(bytes.subarray(dataStart, offset));
  }
  return null;
}
