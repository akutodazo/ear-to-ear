/**
 * 公開リポジトリの安全検査の判定（docs/spec.md §10、T17）。純粋関数だけを置く。
 * ファイルの一覧・読み込み・JPEG の解析は呼ぶ側（scripts/check-safety.mjs）が行い、ここには値か関数で渡す。
 * 見つけたものの「値」は返さない（秘密を検査の出力に載せない）。
 */

/** 安全検査の対象の範囲（src/config.ts の FICTIONAL_AREA と同じ形） */
export interface Area {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

/** JPEG の見出しを読む関数（src/services/jpeg-segments.ts の inspectJpeg）。読めなければ例外 */
export type InspectJpeg = (bytes: Uint8Array) => { appSegments: number[] };

/** 秘密らしい文字列が見つかった行（1 始まり）と種類。値は持たない */
export interface SecretHit {
  line: number;
  kind: "anthropic-key" | "secret-assignment" | "private-key";
}

/**
 * ファイル名（git ls-files の形、区切りは /）だけで分かる危ないファイルなら理由を、問題なければ null。
 * JPEG は public/demo/ の下だけ許す（中身は checkDemoJpeg で見る）。HEIC・DNG はどこでも許さない。
 */
export function checkFileName(path: string): string | null {
  void path;
  throw new Error("not implemented");
}

/** public/demo/ の JPEG に APP1〜15（位置・日時などのメタデータ）が無ければ null、あれば理由 */
export function checkDemoJpeg(bytes: Uint8Array, inspect: InspectJpeg): string | null {
  void bytes;
  void inspect;
  throw new Error("not implemented");
}

/** 圃場の一覧（fields.json を JSON.parse したもの）の座標が範囲の外なら、圃場ごとに理由を返す */
export function checkFieldsArea(data: unknown, area: Area): string[] {
  void data;
  void area;
  throw new Error("not implemented");
}

/** 文字のファイルの中身から、秘密らしい文字列のある行を返す。値は返さない */
export function findSecretLikeLines(text: string): SecretHit[] {
  void text;
  throw new Error("not implemented");
}
