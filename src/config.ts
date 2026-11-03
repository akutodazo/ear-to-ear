/**
 * 定数はここに1回だけ書く（AGENTS.md 層の決まり）。
 * 変えるときは本人と先輩の両方が承認する（共有ファイル）。
 * 出どころは docs/spec.md の各節。
 */

/** 候補の圃場は近い順に最大3つ。距離は送らない（K6） */
export const MAX_CANDIDATES = 3;

/** ブラウザで縮小するときの長辺（px）。再エンコードでメタデータは全部消える */
export const THUMBNAIL_LONG_EDGE_PX = 1600;

/** POST /api/uploads が受け取る JPEG の上限（バイト） */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

/** 合言葉の Cookie の有効期間（日） */
export const SESSION_DAYS = 30;

/** 合言葉の失敗回数の上限（IP のハッシュごと、10分の枠で5回） */
export const LOGIN_WINDOW_MINUTES = 10;
export const LOGIN_MAX_ATTEMPTS_PER_WINDOW = 5;

/** 新着の一覧（GET /api/photos/recent）の件数。limit が無い・不正なら既定、超えれば上限に丸める（T21） */
export const RECENT_LIMIT_DEFAULT = 50;
export const RECENT_LIMIT_MAX = 200;

/** 判断のメモの上限（文字。見た目の 1 文字＝コードポイント 1 つで数える） */
export const STATUS_NOTE_MAX_CHARS = 200;

/** 判断の根拠に付けられる写真の上限（11-03 本人決定） */
export const STATUS_REF_PHOTOS_MAX = 5;

/** 架空の圃場番号の形（例 A-01）。実在の番号体系と重ねない（K10） */
export const FIELD_ID_PATTERN = /^[A-Z]-\d{2}$/;

/**
 * 架空の圃場を置く範囲（P15。北海道の沖合の海の上、約 1.7km 四方）。端を含む。
 * 実在の農地と結び付けないため、圃場の一覧（src/data/fields.json）の座標はすべてこの中に置く（K10）。
 */
export const FICTIONAL_AREA = { latMin: 41.8, latMax: 41.815, lngMin: 144.5, lngMax: 144.52 } as const;

/**
 * 判断の理由の選択肢（L1）。画面にはこの順で出す。
 * 何を見て「刈れる」とするかは父の答え（P21、11-03）。農協の判定の2つは必ず入れる（K16）。11-03 本人確定
 */
export const STATUS_REASONS = [
  { code: "ear_color", label: "穂の色" },
  { code: "yellow_ratio", label: "黄色い穂の割合" },
  { code: "ja_stop_moisture", label: "農協の判定で中止（水分超過）" },
  { code: "ja_stop_damage", label: "農協の判定で中止（砕けなどの傷）" },
  { code: "other", label: "その他" },
] as const;

export type StatusReasonCode = (typeof STATUS_REASONS)[number]["code"];

/** Claude の呼び出し（L6・L5）。管理者だけが呼べる。上限は環境全体で掛ける */
export const CLAUDE_MODEL = "claude-sonnet-5-5";
export const CLAUDE_DAILY_LIMIT = 50;
export const CLAUDE_MAX_TOKENS = 1024;
export const CLAUDE_TIMEOUT_MS = 30_000;
export const CLAUDE_MAX_IMAGES_PER_CALL = 4;

/** LINE のお知らせ（L8）。無料枠は月200通、手前で止める（K15） */
export const LINE_MONTHLY_LIMIT = 200;
export const LINE_STOP_AT = 180;
