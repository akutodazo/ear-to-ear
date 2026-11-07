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

/**
 * 来年の引き継ぎ（5 段目、11-05 本人決定）: 昨年のメモを出すのは、昨年の判断の日（収穫可能、無ければ収穫済）の月日の前後この日数だけ（端を含む）。
 * 「同じ週に出る」の幅。日数の差は画面に出さない
 */
export const LAST_SEASON_HANDOVER_DAYS = 7;

/** 架空の圃場番号の形（例 A-01）。実在の番号体系と重ねない（K10） */
export const FIELD_ID_PATTERN = /^[A-Z]-\d{2}$/;

/**
 * 架空の圃場を置く範囲（P15。11-04 夜の本人決定で書き換え）。端を含む。
 * 北海道の空知の公開の農地の上、約 1.7km × 1.6km。本人の実家とは無関係の場所で、区画（src/data/parcels.json）の形は
 * この中に限り空中写真の畑の境目からなぞってよい（11-07 本人決定。番号・名前・判断は架空）。圃場の一覧（src/data/fields.json）の座標はすべてこの中に置く（K10）。
 * 地図の下地は地理院タイル（MAP_TILES）で、デモも本番も同じ仕組み。
 */
export const FICTIONAL_AREA = { latMin: 43.235, latMax: 43.25, lngMin: 141.74, lngMax: 141.76 } as const;

/**
 * 地図の下地（11-04 夜の本人決定: デモも地理院タイルの空中写真）。
 * 出典表記（「地理院タイル」とリンク）は必須。タイルは実行時にブラウザが読み、リポジトリには入れない。
 */
export const MAP_TILES = {
  url: "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
  attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>',
  /** 全圃場が入る倍率〜1 圃場が画面の半分になる倍率 */
  minZoom: 14,
  maxZoom: 18,
} as const;

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
