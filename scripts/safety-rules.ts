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

/** 名前で止めるもの。上から順に見て、最初に当たった理由を返す */
const NAME_RULES: { test: (path: string) => boolean; why: string }[] = [
  { test: (p) => /(^|\/)\.dev\.vars(\.|$)/.test(p), why: "開発用の秘密（.dev.vars）" },
  { test: (p) => /(^|\/)\.env(\.|$)/.test(p), why: "環境変数ファイル（.env*）" },
  { test: (p) => p.endsWith(".csv"), why: "CSV（番号対応表などの実データの疑い）" },
  { test: (p) => p.startsWith("private/"), why: "/private/ の中身" },
  { test: (p) => /\.(heic|dng)$/.test(p), why: "HEIC・DNG の写真（メタデータを確かめられない）" },
  {
    test: (p) => /\.jpe?g$/.test(p) && !p.startsWith("public/demo/"),
    why: "public/demo/ の外の JPEG（画像は public/demo/ にだけ置く）",
  },
];

/**
 * ファイル名（git ls-files の形、区切りは /）だけで分かる危ないファイルなら理由を、問題なければ null。
 * JPEG は public/demo/ の下だけ許す（中身は checkDemoJpeg で見る）。HEIC・DNG はどこでも許さない。
 */
export function checkFileName(path: string): string | null {
  const lower = path.toLowerCase();
  return NAME_RULES.find((rule) => rule.test(lower))?.why ?? null;
}

/** public/demo/ の JPEG に APP1〜15（位置・日時などのメタデータ）が無ければ null、あれば理由 */
export function checkDemoJpeg(bytes: Uint8Array, inspect: InspectJpeg): string | null {
  let apps: number[];
  try {
    apps = inspect(bytes).appSegments;
  } catch {
    // 見られないものは通さない
    return "JPEG として読めない";
  }
  if (apps.length === 0) return null;
  return `メタデータ（${apps.map((n) => `APP${n}`).join("・")}）がある`;
}

/** 圃場の一覧（fields.json を JSON.parse したもの）の座標が範囲の外なら、圃場ごとに理由を返す */
export function checkFieldsArea(data: unknown, area: Area): string[] {
  if (!Array.isArray(data)) return ["圃場の一覧が配列ではない"];
  const reasons: string[] = [];
  for (const item of data) {
    const { id, lat, lng } = (item ?? {}) as { id?: unknown; lat?: unknown; lng?: unknown };
    const label = typeof id === "string" ? id : "番号不明";
    if (typeof lat !== "number" || typeof lng !== "number") {
      reasons.push(`${label}: 座標が数ではない`);
      continue;
    }
    // 端を含む。NaN はどの比較も false になるので外として扱われる
    const inside = lat >= area.latMin && lat <= area.latMax && lng >= area.lngMin && lng <= area.lngMax;
    if (!inside) reasons.push(`${label}: 座標が架空の範囲（P15）の外`);
  }
  return reasons;
}

/** 先頭が FF D8 FF（JPEG の始まり）なら true。拡張子によらず中身で見分ける */
export function looksLikeJpeg(bytes: Uint8Array): boolean {
  void bytes;
  throw new Error("not implemented");
}

/** 文字のファイルとして読む（UTF-8、BOM 付きの UTF-16LE・BE）。BOM が無く NUL を含めば文字ではないとして null */
export function decodeText(bytes: Uint8Array): string | null {
  void bytes;
  throw new Error("not implemented");
}

/** 秘密の値を入れる名前（docs/spec.md §6・§11 の Secret） */
const SECRET_NAMES = "(?:MEMBER_PASSPHRASE|ADMIN_PASSPHRASE|SESSION_SECRET|ANTHROPIC_API_KEY)";
/** `名前=値`（.dev.vars の形）。値は8文字以上で、空白・引用符・<>（見本の印）を含まない */
const ASSIGN_EQUALS = new RegExp(`${SECRET_NAMES}\\s*=\\s*["']?[^\\s"'<>]{8,}`);
/** `名前: "値"`（オブジェクトの形）。型の宣言（`名前: string;`）は引用符が無いので当たらない */
const ASSIGN_COLON = new RegExp(`${SECRET_NAMES}\\s*:\\s*["'][^"']{8,}["']`);
const ANTHROPIC_KEY = /sk-ant-[A-Za-z0-9_-]{20,}/;
const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;

/** 文字のファイルの中身から、秘密らしい文字列のある行を返す。値は返さない */
export function findSecretLikeLines(text: string): SecretHit[] {
  const hits: SecretHit[] = [];
  text.split(/\r?\n/).forEach((content, index) => {
    const line = index + 1;
    if (ANTHROPIC_KEY.test(content)) hits.push({ line, kind: "anthropic-key" });
    else if (ASSIGN_EQUALS.test(content) || ASSIGN_COLON.test(content)) hits.push({ line, kind: "secret-assignment" });
    else if (PRIVATE_KEY.test(content)) hits.push({ line, kind: "private-key" });
  });
  return hits;
}
