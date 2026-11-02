-- D1 の表（docs/spec.md 5章）。L0〜L1
CREATE TABLE uploaded_photos (
  id TEXT PRIMARY KEY NOT NULL,              -- SQLite の TEXT の主キーは NOT NULL を書かないと NULL が入る
  field_id TEXT,
  state TEXT NOT NULL CHECK (state IN ('unconfirmed','confirmed')),
  candidate_field_ids TEXT NOT NULL,          -- JSON 配列（番号だけ。距離は持たない）
  taken_at TEXT,
  taken_at_source TEXT NOT NULL CHECK (taken_at_source IN ('xmp','exif','none')),
  content_hash TEXT NOT NULL UNIQUE,
  r2_key TEXT NOT NULL,
  width INTEGER NOT NULL, height INTEGER NOT NULL, bytes INTEGER NOT NULL,
  uploader_device TEXT NOT NULL,
  uploaded_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX idx_photos_field ON uploaded_photos(field_id, taken_at);
CREATE INDEX idx_photos_uploaded ON uploaded_photos(uploaded_at);
CREATE TABLE photo_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id TEXT NOT NULL REFERENCES uploaded_photos(id),
  from_field_id TEXT, to_field_id TEXT NOT NULL,
  actor_device TEXT NOT NULL, at TEXT NOT NULL
);
