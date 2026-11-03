/**
 * 合成写真（T10）のための、依存なしの JPEG の書き出し（ベースライン、4:4:4、標準のハフマン表）。純粋関数。
 * メタデータ（APP0〜15）は書かない。位置や日時は呼ぶ側（fixture-catalog.ts）が APP1・APP2 を差し込む。
 * 速さより読みやすさを優先（DCT は定義どおりの分離した計算）。4000×3000 で数秒。
 */

/** 左上から行ごとの RGB（1画素3バイト） */
export interface RgbImage {
  width: number;
  height: number;
  data: Uint8Array;
}

/** ハフマン表（JPEG の DHT の形: 長さごとの個数 16 個と、値の並び） */
export interface HuffmanSpec {
  bits: number[];
  values: number[];
}

/** 標準のハフマン表（ITU-T T.81 付属書 K.3） */
export const STANDARD_TABLES: Record<"dcLuma" | "acLuma" | "dcChroma" | "acChroma", HuffmanSpec> = {
  dcLuma: {
    bits: [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  dcChroma: {
    bits: [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  acLuma: {
    bits: [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d],
    values: [
      0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71,
      0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
      0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37,
      0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
      0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83,
      0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
      0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3,
      0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
      0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
    ],
  },
  acChroma: {
    bits: [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77],
    values: [
      0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71, 0x13, 0x22,
      0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0, 0x15, 0x62, 0x72, 0xd1,
      0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x35, 0x36,
      0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58,
      0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a,
      0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a,
      0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba,
      0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda,
      0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
    ],
  },
};

/** 標準の量子化表（付属書 K.1）。ふつうの並び（行ごと） */
const LUMA_QUANT = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51,
  87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
];
const CHROMA_QUANT = [
  17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99,
  99, 99, 99, ...new Array<number>(32).fill(99),
];

/** ジグザグの順番の i 番目が、ふつうの並びの何番目か */
const ZIGZAG = [
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28,
  35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47,
  55, 62, 63,
];

/** cos((2x+1)uπ/16) × C(u)/2。COS[u*8+x] */
const COS = (() => {
  const table = new Float64Array(64);
  for (let u = 0; u < 8; u++) {
    const c = u === 0 ? Math.SQRT1_2 : 1;
    for (let x = 0; x < 8; x++) table[u * 8 + x] = (c / 2) * Math.cos(((2 * x + 1) * u * Math.PI) / 16);
  }
  return table;
})();

/** libjpeg と同じ倍率で量子化表を作る（1〜255） */
function scaleQuant(base: number[], quality: number): number[] {
  const scale = quality < 50 ? 5000 / quality : 200 - quality * 2;
  return base.map((q) => Math.min(255, Math.max(1, Math.floor((q * scale + 50) / 100))));
}

/** 値 → [符号, 長さ]（付属書 C の手順） */
function huffmanCodes(spec: HuffmanSpec): Map<number, [number, number]> {
  const codes = new Map<number, [number, number]>();
  let code = 0;
  let k = 0;
  for (let length = 1; length <= 16; length++) {
    for (let i = 0; i < spec.bits[length - 1]; i++) codes.set(spec.values[k++], [code++, length]);
    code <<= 1;
  }
  return codes;
}

class BitWriter {
  private readonly bytes: number[] = [];
  private buffer = 0;
  private count = 0;

  write(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) {
      this.buffer = (this.buffer << 1) | ((value >> i) & 1);
      if (++this.count === 8) this.flushByte();
    }
  }

  /** 残りを 1 で埋めて終える */
  finish(): number[] {
    if (this.count > 0) this.write((1 << (8 - this.count)) - 1, 8 - this.count);
    return this.bytes;
  }

  private flushByte(): void {
    this.bytes.push(this.buffer);
    // 0xFF はマーカーと見分けるため後ろに 0x00 を入れる
    if (this.buffer === 0xff) this.bytes.push(0);
    this.buffer = 0;
    this.count = 0;
  }
}

/** 差・係数の大きさの分類（ビット数）と、その分類での書き方 */
function category(value: number): [number, number] {
  const abs = Math.abs(value);
  let size = 0;
  while (abs >> size) size++;
  const bits = value >= 0 ? value : value + (1 << size) - 1;
  return [size, bits];
}

function segment(marker: number, body: number[]): number[] {
  const length = body.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...body];
}

function dht(tableClass: number, id: number, spec: HuffmanSpec): number[] {
  return [(tableClass << 4) | id, ...spec.bits, ...spec.values];
}

/** 品質 1〜100（libjpeg と同じ倍率）で、ベースラインの JPEG にする */
export function encodeJpeg(image: RgbImage, quality = 85): Uint8Array {
  const { width, height, data } = image;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 65535 || height > 65535) {
    throw new RangeError("幅と高さは 1〜65535 の整数");
  }
  if (data.length !== width * height * 3) throw new RangeError("中身の長さが 幅×高さ×3 と合わない");
  if (!(quality >= 1 && quality <= 100)) throw new RangeError("品質は 1〜100");

  const quants = [scaleQuant(LUMA_QUANT, quality), scaleQuant(CHROMA_QUANT, quality)];
  const dcCodes = [huffmanCodes(STANDARD_TABLES.dcLuma), huffmanCodes(STANDARD_TABLES.dcChroma)];
  const acCodes = [huffmanCodes(STANDARD_TABLES.acLuma), huffmanCodes(STANDARD_TABLES.acChroma)];

  const writer = new BitWriter();
  const previousDc = [0, 0, 0];
  const block = [new Float64Array(64), new Float64Array(64), new Float64Array(64)];
  const temp = new Float64Array(64);
  const coefficients = new Int32Array(64);

  const put = (code: [number, number] | undefined) => {
    if (!code) throw new Error("ハフマン表に無い値");
    writer.write(code[0], code[1]);
  };

  for (let by = 0; by < height; by += 8) {
    for (let bx = 0; bx < width; bx += 8) {
      // 8×8 を YCbCr にする（端は最後の画素をくり返す）
      for (let y = 0; y < 8; y++) {
        const row = Math.min(by + y, height - 1) * width;
        for (let x = 0; x < 8; x++) {
          const at = (row + Math.min(bx + x, width - 1)) * 3;
          const r = data[at];
          const g = data[at + 1];
          const b = data[at + 2];
          block[0][y * 8 + x] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
          block[1][y * 8 + x] = -0.168736 * r - 0.331264 * g + 0.5 * b;
          block[2][y * 8 + x] = 0.5 * r - 0.418688 * g - 0.081312 * b;
        }
      }

      for (let c = 0; c < 3; c++) {
        const table = c === 0 ? 0 : 1;
        const input = block[c];
        // 横の DCT
        for (let y = 0; y < 8; y++) {
          for (let u = 0; u < 8; u++) {
            let sum = 0;
            for (let x = 0; x < 8; x++) sum += input[y * 8 + x] * COS[u * 8 + x];
            temp[y * 8 + u] = sum;
          }
        }
        // 縦の DCT と量子化
        for (let v = 0; v < 8; v++) {
          for (let u = 0; u < 8; u++) {
            let sum = 0;
            for (let y = 0; y < 8; y++) sum += temp[y * 8 + u] * COS[v * 8 + y];
            coefficients[v * 8 + u] = Math.round(sum / quants[table][v * 8 + u]);
          }
        }

        // DC は前のブロックとの差
        const dc = coefficients[0];
        const [dcSize, dcBits] = category(dc - previousDc[c]);
        previousDc[c] = dc;
        put(dcCodes[table].get(dcSize));
        if (dcSize > 0) writer.write(dcBits, dcSize);

        // AC はジグザグの順に、0 の続きの長さと値
        let run = 0;
        for (let k = 1; k < 64; k++) {
          const value = coefficients[ZIGZAG[k]];
          if (value === 0) {
            run++;
            continue;
          }
          while (run > 15) {
            put(acCodes[table].get(0xf0));
            run -= 16;
          }
          const [size, bits] = category(value);
          put(acCodes[table].get((run << 4) | size));
          writer.write(bits, size);
          run = 0;
        }
        if (run > 0) put(acCodes[table].get(0x00));
      }
    }
  }

  const dqt = [0, ...ZIGZAG.map((i) => quants[0][i]), 1, ...ZIGZAG.map((i) => quants[1][i])];
  const sof = [8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3, 1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1];
  const huffman = [
    ...dht(0, 0, STANDARD_TABLES.dcLuma),
    ...dht(1, 0, STANDARD_TABLES.acLuma),
    ...dht(0, 1, STANDARD_TABLES.dcChroma),
    ...dht(1, 1, STANDARD_TABLES.acChroma),
  ];
  const sos = [3, 1, 0x00, 2, 0x11, 3, 0x11, 0, 63, 0];
  const header = [
    0xff,
    0xd8,
    ...segment(0xdb, dqt),
    ...segment(0xc0, sof),
    ...segment(0xc4, huffman),
    ...segment(0xda, sos),
  ];
  const scan = writer.finish();
  const out = new Uint8Array(header.length + scan.length + 2);
  out.set(header, 0);
  out.set(scan, header.length);
  out.set([0xff, 0xd9], header.length + scan.length);
  return out;
}
