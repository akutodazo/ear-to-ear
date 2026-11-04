-- L6 の引き継ぎメモ（docs/spec.md §5、T29 #106）。圃場×シーズンで 1 件。作り直すと上書き（T30）。
-- body は HandoverNote の records と blocks の JSON。settings の表は L8 のときに足す
CREATE TABLE handover_notes (
  field_id TEXT NOT NULL,
  season TEXT NOT NULL,                       -- 日本時間の年 '2026'
  body TEXT NOT NULL CHECK (json_valid(body)),
  model TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (field_id, season)
);
