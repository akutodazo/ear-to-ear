/**
 * データ契約（docs/spec.md §データ契約）。
 * 共有ファイル: 変えるときは本人と先輩の両方が承認する。
 * 水分は扱わない（K16）。撮影位置の座標・候補までの距離は持たない（K6）。
 */

export type TakenAtSource = "xmp" | "exif" | "none";
export type AssignmentState = "unconfirmed" | "confirmed";
export type Role = "member" | "admin";

/** 架空の圃場。番号は A-01 形式、座標は本人が決めた範囲（P15） */
export interface Field {
  id: string;
  name: string;
  lat: number;
  lng: number;
  district: string;
}

export interface UploadedPhoto {
  /** UUID v4。写真の一生を通じて変えない */
  id: string;
  /** 確定済みの番号。未確定は null */
  fieldId: string | null;
  state: AssignmentState;
  /** 近い順、最大3。距離は持たない（K6） */
  candidateFieldIds: string[];
  /** 'YYYY-MM-DD'（日本時間）。不明は null（推測しない） */
  takenAt: string | null;
  takenAtSource: TakenAtSource;
  width: number;
  height: number;
  /** サーバー時刻 ISO 8601 */
  uploadedAt: string;
  uploaderDevice: string;
}

/** 番号の確定・訂正の履歴（L0） */
export interface AssignmentEvent {
  photoId: string;
  fromFieldId: string | null;
  toFieldId: string;
  actorDevice: string;
  at: string;
}

/** 判断と、その理由・根拠（L1） */
export interface StatusEvent {
  id: number;
  fieldId: string;
  status: "ready" | "done";
  /** 理由の選択肢のコード（src/config.ts の STATUS_REASONS）。空なら「記録なし」 */
  reasons: string[];
  /** 短いメモ（200字まで、任意） */
  note: string | null;
  /** 根拠にした写真（その圃場の確定済みのもの） */
  refPhotoIds: string[];
  actorDevice: string;
  at: string;
  revokedAt: string | null;
}

/** L6。Claude に渡す記録1件＝カスタムコンテンツの1要素 */
export interface HandoverRecord {
  kind: "status" | "photo";
  /** 元の記録（判断の履歴・写真）の id */
  id: string;
  /** 例「[判断] 2026-07-21 収穫可能。理由: 穂の色・農協の判定で中止（水分超過）。メモ: …」 */
  text: string;
}

/** L6。引用つきのまとめ */
export interface HandoverNote {
  fieldId: string;
  /** 例 '2026' */
  season: string;
  /** 渡した順＝要素の番号（0 始まり） */
  records: HandoverRecord[];
  /** Claude の返事の text ブロックごと */
  blocks: {
    text: string;
    /** 要素の番号の範囲（end は含まない）。空なら「根拠なし」 */
    cites: { start: number; end: number; citedText: string }[];
  }[];
  model: string;
  createdAt: string;
}
