-- LINE に 1 枚の共有（#159）。確定した順の絵（R2 の shares/<id>.jpg）と、その文を作る材料（番号の並び）だけ。
-- 座標・候補までの距離は持たない（K6）。期限（60 日、11-06 先輩決定）を過ぎた行は POST /api/shares のたびに消す。
CREATE TABLE order_shares (
  id TEXT PRIMARY KEY NOT NULL,
  season TEXT NOT NULL,
  district TEXT NOT NULL,
  ranked TEXT NOT NULL,              -- JSON 配列（番号だけ）
  benchmark_id TEXT,                 -- 目安の畑（無ければ NULL）
  confirmed_at TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  actor_device TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_order_shares_expires ON order_shares(expires_at);
