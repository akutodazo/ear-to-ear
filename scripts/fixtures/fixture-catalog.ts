/**
 * 合成写真（T10、docs/spec.md §10）の一覧と組み立て。純粋関数。書き出しは scripts/make-fixtures.mjs。
 * 種類: XMP 位置あり／EXIF 位置あり／位置が 0/0／位置なし／日時なし／APP2 付き／壊れた画像／同じ内容の重複。
 * 位置はすべて架空の範囲（P15）の中。実写真・実在の座標は使わない（K10）。出力はコミットしない（/private/fixtures/）。
 */
import type { RgbImage } from "./jpeg-encoder";

/** 端末で送ったときに出るはずのもの */
export interface FixtureExpectation {
  /** 一番近い候補の圃場。位置が取れないときは null */
  nearestFieldId: string | null;
  /** 撮影日（日本時間）。不明は null */
  takenAt: string | null;
  takenAtSource: "xmp" | "exif" | "none";
  /** 壊れていて送れない */
  broken: boolean;
}

export interface Fixture {
  /** ファイル名（例 01-xmp-A06.jpg） */
  name: string;
  /** 何を確かめる写真か（README に出す） */
  purpose: string;
  expect: FixtureExpectation;
  bytes: Uint8Array;
}

export interface DmsPosition {
  lat: number;
  lng: number;
}

/** DJI の XMP（drone-dji:GpsLatitude など）の APP1 の中身（"http://ns.adobe.com/xap/1.0/\0" から） */
export function xmpPayload(options: { position?: DmsPosition; createDate?: string }): Uint8Array {
  void options;
  throw new Error("not implemented");
}

/** EXIF（TIFF、リトルエンディアン）の APP1 の中身（"Exif\0\0" から）。位置は度分秒の有理数で書く */
export function exifPayload(options: {
  /** "erased" は 0/0（Android の Chrome が消した形） */
  position?: DmsPosition | "erased";
  dateTimeOriginal?: string;
  offsetTimeOriginal?: string;
}): Uint8Array {
  void options;
  throw new Error("not implemented");
}

/** 色の情報（ICC）の APP2 の中身。Chrome の再エンコードが付けるものに似せた、中身の無い形だけのもの */
export function iccPayload(): Uint8Array {
  throw new Error("not implemented");
}

/** SOI の直後に APP のセグメントを差し込む */
export function withAppSegments(jpeg: Uint8Array, segments: { marker: number; payload: Uint8Array }[]): Uint8Array {
  void jpeg;
  void segments;
  throw new Error("not implemented");
}

/** 上から見た麦畑ふうの絵。左上に番号（label の数字）を大きく描く */
export function drawField(width: number, height: number, label: string): RgbImage {
  void width;
  void height;
  void label;
  throw new Error("not implemented");
}

/** 合成写真の一覧。JPEG の書き出しは引数で受け取る（scripts/ の TS は互いを import しない） */
export function buildFixtures(encode: (image: RgbImage) => Uint8Array): Fixture[] {
  void encode;
  throw new Error("not implemented");
}
