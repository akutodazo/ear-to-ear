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
  /** 委員が選んだ番号。確定ではない。選ばなければ null */
  chosenFieldId: string | null;
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

/** POST /api/uploads の meta（docs/spec.md §6）。距離・座標は持たない（K6） */
export interface UploadMeta {
  /** 元ファイルの SHA-256（小文字の16進64桁） */
  contentHash: string;
  /** 'YYYY-MM-DD'（日本時間）。不明は null */
  takenAt: string | null;
  takenAtSource: TakenAtSource;
  /** 近い順、最大3。距離は持たない（K6） */
  candidateFieldIds: string[];
  /** 委員が選んだ番号。選ばなければ null。あっても state は unconfirmed */
  chosenFieldId: string | null;
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

/**
 * GET /api/fields/summary の 1 圃場（L1、地図。本文は { fields: FieldSummary[] }、圃場の一覧の順）。
 * 11-04 本人承認（#90）
 */
export interface FieldSummary {
  fieldId: string;
  /** 取り消していない判断のうち at が新しいもの（同じなら id の大きい方）。無ければ null */
  latest: StatusEvent | null;
  /** 未確定の写真の候補（最大3）か委員が選んだ番号に、この圃場が含まれるか */
  hasUnconfirmed: boolean;
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

/**
 * 圃場の輪郭（L1 の地図、11-04 夜の本人決定）。架空の形で、座標はすべて FICTIONAL_AREA の中（K10）。
 * polygon は [lat, lng] の並び（3 点以上、最後の点で閉じない）。実在の畑の境界をなぞらない
 */
export interface Parcel {
  fieldId: string;
  polygon: [number, number][];
}

/** 年・地区ごとの目安の畑（早く育つ畑。委員会が指定する。11-04 夜の本人決定）。指定の無い地区があってよい */
export interface Benchmark {
  /** 例 '2026' */
  season: string;
  district: string;
  fieldId: string;
}
