import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";

// D1 は SQLite なので、Node に標準の node:sqlite に流して確かめる（依存を増やさない）。
// node:sqlite の外部キーは既定で有効で、D1 と同じ
const SQL = readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8");

let db: DatabaseSync;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(SQL);
});

interface Column {
  name: string;
  notnull: number;
  pk: number;
}

function columns(table: string): Column[] {
  // table_xinfo は生成列も返す。table_info だと隠れる
  return db.prepare(`PRAGMA table_xinfo(${table})`).all() as unknown as Column[];
}

function tables(): string[] {
  // NOT LIKE 'sqlite_%' は _ が任意の 1 文字に当たり、sqlitex_… の表が検査をすり抜ける（穴を突く実装の指摘）。
  // AUTOINCREMENT が作る sqlite_sequence だけを名前で除く
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name <> 'sqlite_sequence'")
    .all() as unknown as { name: string }[];
  return rows.map((r) => r.name).sort();
}

describe("表", () => {
  it("L0〜L1 の 4 つの表がある", () => {
    expect(tables()).toEqual([
      "field_status_events",
      "photo_assignments",
      "uploaded_photos",
      "usage_counters",
    ]);
  });
});

describe("列", () => {
  it.each([
    [
      "uploaded_photos",
      [
        "id", "field_id", "state", "candidate_field_ids", "taken_at", "taken_at_source",
        "content_hash", "r2_key", "width", "height", "bytes", "uploader_device",
        "uploaded_at", "updated_at",
      ],
    ],
    ["photo_assignments", ["id", "photo_id", "from_field_id", "to_field_id", "actor_device", "at"]],
    [
      "field_status_events",
      ["id", "field_id", "status", "reasons", "note", "ref_photo_ids", "actor_device", "at", "revoked_at"],
    ],
    ["usage_counters", ["key", "count", "expires_at"]],
  ])("%s の列が仕様どおり", (table, expected) => {
    expect(columns(table).map((c) => c.name)).toEqual(expected);
  });

  it.each([
    ["uploaded_photos", ["field_id", "taken_at"]],
    ["photo_assignments", ["from_field_id"]],
    ["field_status_events", ["note", "revoked_at"]],
    ["usage_counters", []],
  ])("%s で NULL を許すのは決まった列だけ", (table, nullable) => {
    const actual = columns(table)
      .filter((c) => c.notnull === 0 && c.pk === 0)
      .map((c) => c.name);
    expect(actual).toEqual(nullable);
  });
});

describe("持ってはいけない列", () => {
  it.each([
    ["撮影位置（K6）", /(^|_)(lat|lng|lon|latitude|longitude|gps|distance|dist|coord|coords|location)(_|$)/],
    ["水分（K16）", /(^|_)(moisture|water)(_|$)/],
  ])("%s の列が無い", (_name, pattern) => {
    const names = tables().flatMap((t) => columns(t).map((c) => c.name));
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((n) => pattern.test(n))).toEqual([]);
  });
});

const NOW = "2026-11-03T00:00:00.000Z";

function insertPhoto(overrides: Record<string, string | number | null> = {}): void {
  const row: Record<string, string | number | null> = {
    id: "photo-1",
    field_id: null,
    state: "unconfirmed",
    candidate_field_ids: '["A-01"]',
    taken_at: null,
    taken_at_source: "none",
    content_hash: "a".repeat(64),
    r2_key: "uploads/photo-1.jpg",
    width: 1600,
    height: 1200,
    bytes: 1000,
    uploader_device: "dev-0001",
    uploaded_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
  const names = Object.keys(row);
  db.prepare(
    `INSERT INTO uploaded_photos (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
  ).run(...Object.values(row));
}

function countPhotos(): unknown {
  return db.prepare("SELECT count(*) AS n FROM uploaded_photos").get();
}

describe("uploaded_photos の値", () => {
  it("番号なし・日付なしの未確定の写真が入る", () => {
    insertPhoto();
    expect(countPhotos()).toEqual({ n: 1 });
  });

  it.each([
    ["confirmed", { state: "confirmed", field_id: "A-01" }],
    ["xmp", { taken_at_source: "xmp", taken_at: "2026-07-21" }],
    ["exif", { taken_at_source: "exif", taken_at: "2026-07-21" }],
  ])("%s が入る", (_name, overrides) => {
    insertPhoto(overrides);
    expect(countPhotos()).toEqual({ n: 1 });
  });

  it.each([
    ["state", { state: "deleted" }],
    ["taken_at_source", { taken_at_source: "gps" }],
  ])("%s が不正なら拒否", (_name, overrides) => {
    expect(() => insertPhoto(overrides)).toThrow(/CHECK constraint failed/);
  });
});

describe("二重登録（K7）", () => {
  it("同じ content_hash は拒否", () => {
    insertPhoto();
    expect(() => insertPhoto({ id: "photo-2" })).toThrow(
      /UNIQUE constraint failed: uploaded_photos.content_hash/,
    );
  });

  it("番号が違っても同じ content_hash は拒否（圃場に依存させない）", () => {
    insertPhoto({ field_id: "A-01", state: "confirmed" });
    expect(() => insertPhoto({ id: "photo-2", field_id: "A-02", state: "confirmed" })).toThrow(
      /UNIQUE constraint failed: uploaded_photos.content_hash/,
    );
  });

  it("content_hash が違えば入る", () => {
    insertPhoto();
    insertPhoto({ id: "photo-2", content_hash: "b".repeat(64) });
    expect(countPhotos()).toEqual({ n: 2 });
  });

  it("同じ id は拒否", () => {
    insertPhoto();
    expect(() => insertPhoto({ content_hash: "b".repeat(64) })).toThrow(
      /UNIQUE constraint failed: uploaded_photos.id/,
    );
  });
});

function insertAssignment(photoId: string): void {
  db.prepare(
    "INSERT INTO photo_assignments (photo_id, from_field_id, to_field_id, actor_device, at) VALUES (?, NULL, 'A-01', 'dev-0002', ?)",
  ).run(photoId, NOW);
}

describe("番号の履歴", () => {
  it("写真への履歴が入る", () => {
    insertPhoto();
    insertAssignment("photo-1");
    expect(db.prepare("SELECT from_field_id, to_field_id FROM photo_assignments").get()).toEqual({
      from_field_id: null,
      to_field_id: "A-01",
    });
  });

  it("無い写真への履歴は拒否", () => {
    expect(() => insertAssignment("no-such-photo")).toThrow(/FOREIGN KEY constraint failed/);
  });

  it("履歴のある写真は消せない", () => {
    insertPhoto();
    insertAssignment("photo-1");
    expect(() => db.exec("DELETE FROM uploaded_photos")).toThrow(/FOREIGN KEY constraint failed/);
  });

  it("履歴の id は消しても再利用しない（AUTOINCREMENT）", () => {
    insertPhoto();
    insertAssignment("photo-1");
    db.exec("DELETE FROM photo_assignments");
    insertAssignment("photo-1");
    expect(db.prepare("SELECT id FROM photo_assignments").get()).toEqual({ id: 2 });
  });
});

function insertStatus(status: string): void {
  db.prepare(
    "INSERT INTO field_status_events (field_id, status, actor_device, at) VALUES ('A-01', ?, 'dev-0001', ?)",
  ).run(status, NOW);
}

describe("判断", () => {
  it.each(["ready", "done"])("%s が入り、理由と根拠は空の配列で始まる", (status) => {
    insertStatus(status);
    expect(
      db.prepare("SELECT status, reasons, ref_photo_ids, note, revoked_at FROM field_status_events").get(),
    ).toEqual({ status, reasons: "[]", ref_photo_ids: "[]", note: null, revoked_at: null });
  });

  it("不正な status は拒否", () => {
    expect(() => insertStatus("maybe")).toThrow(/CHECK constraint failed/);
  });

  it("判断の id は消しても再利用しない（AUTOINCREMENT）", () => {
    insertStatus("ready");
    db.exec("DELETE FROM field_status_events");
    insertStatus("ready");
    expect(db.prepare("SELECT id FROM field_status_events").get()).toEqual({ id: 2 });
  });
});

describe("回数の上限", () => {
  it("同じ key は 1 行だけ（UPSERT で数える）", () => {
    const up = db.prepare(
      "INSERT INTO usage_counters (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1",
    );
    up.run("login:abc:2026-11-03T00:10", NOW);
    up.run("login:abc:2026-11-03T00:10", NOW);
    expect(db.prepare("SELECT count FROM usage_counters").all()).toEqual([{ count: 2 }]);
  });
});

function indexColumns(name: string): string[] {
  const rows = db.prepare(`PRAGMA index_info(${name})`).all() as unknown as { name: string }[];
  return rows.map((r) => r.name);
}

describe("索引", () => {
  it.each([
    ["idx_photos_field", ["field_id", "taken_at"]],
    ["idx_photos_uploaded", ["uploaded_at"]],
  ])("%s の列が仕様どおり", (name, expected) => {
    expect(indexColumns(name)).toEqual(expected);
  });
});

describe("主キー（穴を突く実装の指摘）", () => {
  it.each([
    ["uploaded_photos", "id"],
    ["photo_assignments", "id"],
    ["field_status_events", "id"],
    ["usage_counters", "key"],
  ])("%s の主キーは %s", (table, column) => {
    expect(columns(table).filter((c) => c.pk > 0).map((c) => c.name)).toEqual([column]);
  });
});

describe("動きを変える仕組み（穴を突く実装の指摘）", () => {
  it("トリガーとビューが無い", () => {
    const rows = db
      .prepare("SELECT type, name FROM sqlite_master WHERE type IN ('trigger', 'view')")
      .all();
    expect(rows).toEqual([]);
  });
});

function createSql(table: string): string {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE name = ?").get(table) as { sql: string };
  return row.sql.replace(/\s+/g, " ");
}

describe("CHECK の許す値（穴を突く実装の指摘）", () => {
  it.each([
    ["uploaded_photos", "CHECK (state IN ('unconfirmed','confirmed'))"],
    ["uploaded_photos", "CHECK (taken_at_source IN ('xmp','exif','none'))"],
    ["field_status_events", "CHECK (status IN ('ready','done'))"],
  ])("%s に %s がある", (table, check) => {
    expect(createSql(table)).toContain(check);
  });

  it("写真の表の CHECK は 2 つだけ", () => {
    expect(createSql("uploaded_photos").match(/CHECK/g)).toHaveLength(2);
  });

  it("判断の表の CHECK は 1 つだけ", () => {
    expect(createSql("field_status_events").match(/CHECK/g)).toHaveLength(1);
  });
});

describe("一意の範囲（穴を突く実装の指摘）", () => {
  it("別の端末からでも同じ content_hash は拒否", () => {
    insertPhoto();
    expect(() => insertPhoto({ id: "photo-2", uploader_device: "dev-0002" })).toThrow(
      /UNIQUE constraint failed: uploaded_photos.content_hash/,
    );
  });

  it("主キーのほかの一意の索引は content_hash の 1 列だけ", () => {
    const list = db.prepare("PRAGMA index_list(uploaded_photos)").all() as unknown as {
      name: string;
      unique: number;
      origin: string;
    }[];
    const unique = list.filter((i) => i.unique === 1 && i.origin !== "pk");
    expect(unique.map((i) => indexColumns(i.name))).toEqual([["content_hash"]]);
  });
});

describe("外部キーの形（穴を突く実装の指摘）", () => {
  it("photo_assignments の外部キーは photo_id → uploaded_photos.id だけで、遅延しない", () => {
    const list = db.prepare("PRAGMA foreign_key_list(photo_assignments)").all() as unknown as {
      table: string;
      from: string;
      to: string;
    }[];
    expect(list.map(({ table, from, to }) => ({ table, from, to }))).toEqual([
      { table: "uploaded_photos", from: "photo_id", to: "id" },
    ]);
    expect(createSql("photo_assignments")).not.toMatch(/DEFERRABLE/);
  });
});

/** コメントと空白の違いを無視して比べる */
function normalizeSql(sql: string): string {
  return sql.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim();
}

describe("spec との一致（穴を突く実装の指摘）", () => {
  // COLLATE・部分索引・TEMP の表のように、個別のテストでは追い切れない足し算をまとめて止める
  it("0001_init.sql は docs/spec.md の SQL と同じ", () => {
    const spec = readFileSync(new URL("../docs/spec.md", import.meta.url), "utf8");
    const block = spec.split("-- 0001_init.sql")[1].split("-- 0002_handover.sql")[0];
    expect(normalizeSql(SQL)).toBe(normalizeSql(block.slice(block.indexOf("\n"))));
  });
});
