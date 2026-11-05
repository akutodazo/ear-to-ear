-- L8 の設定（docs/spec.md §5、#139）。いまは LINE の webhook の join で受けたグループ ID（'line_group_id'）だけ。
-- 値は 1 つの key に 1 つ。join を受け直したら上書きする
CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
