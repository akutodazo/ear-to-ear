import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/config";
import { UPLOAD_BODY_MAX_BYTES } from "@/services/upload-form";
import { handleRequest } from "./app";
import type { DbPort, Deps } from "./deps";
import { createTestBucket, type TestBucket } from "./test-bucket";
import { createTestDb, type TestDb } from "./test-db";
import {
  fakeDeps,
  multipartBody,
  multipartRequest,
  NOW_MS,
  repeatChunks,
  sessionToken,
  streamRequest,
  tinyJpeg,
  type MultipartPart,
} from "./test-helpers";

const ID = "00000000-0000-4000-8000-000000000001";
const HASH = "ab".repeat(32);
const NOW_ISO = new Date(NOW_MS).toISOString();

const META = {
  contentHash: HASH,
  takenAt: "2026-07-24",
  takenAtSource: "exif",
  candidateFieldIds: ["A-06", "A-05"],
  chosenFieldId: null,
};

interface Setup {
  deps: Deps;
  testDb: TestDb;
  bucket: TestBucket;
  prepare: ReturnType<typeof vi.fn<DbPort["prepare"]>>;
}

function setup(overrides: Partial<Deps> = {}, testDb: TestDb = createTestDb(), bucket = createTestBucket()): Setup {
  const prepare = vi.fn<DbPort["prepare"]>((sql) => testDb.db.prepare(sql));
  const db: DbPort = { prepare, batch: (statements) => testDb.db.batch(statements) };
  const deps = fakeDeps({ db, photos: bucket.photos, ...overrides });
  return { deps, testDb, bucket, prepare };
}

async function cookie(role: "member" | "admin" = "member"): Promise<string> {
  return `session=${await sessionToken(role)}`;
}

async function upload(
  deps: Deps,
  options: { image?: Uint8Array; meta?: unknown; extra?: MultipartPart[]; cookieValue?: string } = {},
): Promise<Response> {
  const parts: MultipartPart[] = [
    { name: "image", value: options.image ?? tinyJpeg() },
    { name: "meta", value: typeof options.meta === "string" ? options.meta : JSON.stringify(options.meta ?? META) },
    ...(options.extra ?? []),
  ];
  return handleRequest(multipartRequest(parts, { cookie: options.cookieValue ?? (await cookie()) }), deps);
}

function rows(testDb: TestDb) {
  return testDb.raw.prepare("SELECT * FROM uploaded_photos ORDER BY uploaded_at, id").all();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/uploads 保存できる", () => {
  it("201 { id } だけを返す（id は newId）", async () => {
    const { deps } = setup();
    const response = await upload(deps);
    expect(response.status).toBe(201);
    expect(await response.json()).toStrictEqual({ id: ID });
  });

  it("R2 に uploads/<id>.jpg を 1 つ、中身は送った画像そのまま、contentType は image/jpeg", async () => {
    const { deps, bucket } = setup();
    const image = tinyJpeg({ scanBytes: 500 });
    await upload(deps, { image });
    expect([...bucket.objects.keys()]).toEqual([`uploads/${ID}.jpg`]);
    expect(bucket.objects.get(`uploads/${ID}.jpg`)).toEqual({ bytes: image, contentType: "image/jpeg" });
  });

  it("D1 に未確定の 1 行（15 列すべて）", async () => {
    const { deps, testDb } = setup();
    const image = tinyJpeg({ width: 1600, height: 900, scanBytes: 100 });
    await upload(deps, { image });
    expect(rows(testDb)).toEqual([
      {
        id: ID,
        field_id: null,
        chosen_field_id: null,
        state: "unconfirmed",
        candidate_field_ids: '["A-06","A-05"]',
        taken_at: "2026-07-24",
        taken_at_source: "exif",
        content_hash: HASH,
        r2_key: `uploads/${ID}.jpg`,
        width: 1600,
        height: 900,
        bytes: image.byteLength,
        uploader_device: "dev-member",
        uploaded_at: NOW_ISO,
        updated_at: NOW_ISO,
      },
    ]);
  });

  it("委員が選んだ番号があっても unconfirmed で、field_id は null", async () => {
    const { deps, testDb } = setup();
    await upload(deps, { meta: { ...META, chosenFieldId: "A-05" } });
    expect(rows(testDb)).toEqual([
      expect.objectContaining({ chosen_field_id: "A-05", state: "unconfirmed", field_id: null }),
    ]);
  });

  it("日付不明・候補なしの写真も 201", async () => {
    const { deps, testDb } = setup();
    const response = await upload(deps, {
      meta: { ...META, takenAt: null, takenAtSource: "none", candidateFieldIds: [] },
    });
    expect(response.status).toBe(201);
    expect(rows(testDb)).toEqual([
      expect.objectContaining({ taken_at: null, taken_at_source: "none", candidate_field_ids: "[]" }),
    ]);
  });

  it("管理者も送れる（uploader_device は Cookie の端末 ID）", async () => {
    const { deps, testDb } = setup();
    expect((await upload(deps, { cookieValue: await cookie("admin") })).status).toBe(201);
    expect(rows(testDb)).toEqual([expect.objectContaining({ uploader_device: "dev-admin" })]);
  });

  it("画像がちょうど MAX_UPLOAD_BYTES でも、meta と境界を足して 201", async () => {
    const { deps } = setup();
    const base = tinyJpeg().byteLength;
    const image = tinyJpeg({ scanBytes: MAX_UPLOAD_BYTES - base + 2 });
    expect(image.byteLength).toBe(MAX_UPLOAD_BYTES);
    expect((await upload(deps, { image })).status).toBe(201);
  });

  it("画像がちょうど MAX_UPLOAD_BYTES で、本当の content-length が付いていても 201（ブラウザは付ける。人の確認で足した）", async () => {
    const { deps } = setup();
    const base = tinyJpeg().byteLength;
    const parts: MultipartPart[] = [
      { name: "image", value: tinyJpeg({ scanBytes: MAX_UPLOAD_BYTES - base + 2 }) },
      { name: "meta", value: JSON.stringify(META) },
    ];
    const length = multipartBody(parts).byteLength;
    expect(length).toBeGreaterThan(MAX_UPLOAD_BYTES);
    const req = multipartRequest(parts, { cookie: await cookie(), headers: { "content-length": String(length) } });
    expect(req.headers.get("content-length")).toBe(String(length));
    expect((await handleRequest(req, deps)).status).toBe(201);
  });

  it("ブラウザと同じ FormData の要求でも 201", async () => {
    const { deps } = setup();
    const form = new FormData();
    form.append("image", new Blob([tinyJpeg()], { type: "image/jpeg" }), "photo.jpg");
    form.append("meta", JSON.stringify(META));
    const req = new Request("https://example.test/api/uploads", {
      method: "POST",
      headers: { cookie: await cookie() },
      body: form,
    });
    expect((await handleRequest(req, deps)).status).toBe(201);
  });

  it("圃場の一覧は deps.knownFieldIds を使う", async () => {
    const { deps } = setup({ knownFieldIds: new Set(["B-01"]) });
    expect((await upload(deps, { meta: { ...META, candidateFieldIds: ["B-01"] } })).status).toBe(201);
    const second = setup({ knownFieldIds: new Set(["B-01"]) });
    expect((await upload(second.deps)).status).toBe(422);
  });

  it("成功のときも共通ヘッダが付き、console に何も出さず、R2 の get は呼ばない", async () => {
    const log = vi.spyOn(console, "log");
    const error = vi.spyOn(console, "error");
    const { deps, bucket } = setup();
    const response = await upload(deps);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(bucket.calls.filter((c) => c.op === "get")).toEqual([]);
  });

  it("newId は 1 回だけ", async () => {
    const newId = vi.fn(() => ID);
    const { deps } = setup({ newId });
    await upload(deps);
    expect(newId).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/uploads 二重", () => {
  it("同じハッシュの 2 回目は 409 { id }（最初の id）で、R2 に置かない", async () => {
    const ids = ["id-first", "id-second"];
    const { deps, bucket } = setup({ newId: () => ids.shift() ?? "id-x" });
    expect((await upload(deps)).status).toBe(201);
    const response = await upload(deps);
    expect(response.status).toBe(409);
    expect(await response.json()).toStrictEqual({ id: "id-first" });
    expect(bucket.calls.filter((c) => c.op === "put")).toHaveLength(1);
    expect([...bucket.objects.keys()]).toEqual(["uploads/id-first.jpg"]);
  });

  it("2 回目（二重）では newId を呼ばない（R2 の前に二重を見る）", async () => {
    const newId = vi.fn(() => ID);
    const { deps } = setup({ newId });
    await upload(deps);
    expect((await upload(deps)).status).toBe(409);
    expect(newId).toHaveBeenCalledTimes(1);
  });

  it("候補・選んだ番号・端末が違っても、同じハッシュなら 409（K7）", async () => {
    const ids = ["id-first", "id-second"];
    const { deps } = setup({ newId: () => ids.shift() ?? "id-x" });
    await upload(deps);
    const response = await upload(deps, {
      meta: { ...META, candidateFieldIds: ["A-01"], chosenFieldId: "A-01" },
      cookieValue: await cookie("admin"),
    });
    expect(response.status).toBe(409);
  });

  it("大文字のハッシュも同じ写真として 409", async () => {
    const ids = ["id-first", "id-second"];
    const { deps } = setup({ newId: () => ids.shift() ?? "id-x" });
    await upload(deps);
    expect((await upload(deps, { meta: { ...META, contentHash: HASH.toUpperCase() } })).status).toBe(409);
  });

  it("同時に 2 本来ても、201 と 409 で id は同じ。R2 と D1 には 1 つずつ", async () => {
    const ids = ["id-a", "id-b"];
    const { deps, bucket, testDb } = setup({ newId: () => ids.shift() ?? "id-x" });
    const responses = await Promise.all([upload(deps), upload(deps)]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const bodies = await Promise.all(responses.map((r) => r.json()));
    expect(bodies[0]).toStrictEqual(bodies[1]);
    expect(bucket.objects.size).toBe(1);
    expect(rows(testDb)).toHaveLength(1);
    expect(bucket.calls.filter((c) => c.op === "delete")).toHaveLength(1);
  });

  it("R2 に置いている間に同じハッシュが D1 に入ったら、置いた画像を消して 409 { id }（エラー文を見ない）", async () => {
    const testDb = createTestDb();
    const bucket = createTestBucket();
    const put = bucket.photos.put;
    bucket.photos.put = async (key, value, options) => {
      testDb.raw
        .prepare(
          "INSERT INTO uploaded_photos (id, field_id, chosen_field_id, state, candidate_field_ids, taken_at, taken_at_source, content_hash, r2_key, width, height, bytes, uploader_device, uploaded_at, updated_at) VALUES ('other', NULL, NULL, 'unconfirmed', '[]', NULL, 'none', ?, 'uploads/other.jpg', 1, 1, 1, 'd', 'x', 'x')",
        )
        .run(HASH);
      return put(key, value, options);
    };
    const { deps } = setup({}, testDb, bucket);
    const response = await upload(deps);
    expect(response.status).toBe(409);
    expect(await response.json()).toStrictEqual({ id: "other" });
    expect(bucket.objects.has(`uploads/${ID}.jpg`)).toBe(false);
  });
});

describe("POST /api/uploads 入口", () => {
  it("Cookie が無ければ 401 で、R2 も D1 も触らない", async () => {
    const { deps, bucket, prepare } = setup();
    const req = multipartRequest([
      { name: "image", value: tinyJpeg() },
      { name: "meta", value: JSON.stringify(META) },
    ]);
    expect((await handleRequest(req, deps)).status).toBe(401);
    expect(prepare).not.toHaveBeenCalled();
    expect(bucket.calls).toEqual([]);
  });

  // multipart でない形の網羅は upload-form.test.ts。ここは「415 に写す・本文も R2 も D1 も触らない」を 1 つで見る
  it.each([["JSON", "application/json"]])("Content-Type が %s なら 415 で、本文も R2 も D1 も触らない", async (_name, contentType) => {
    const { deps, bucket, prepare } = setup();
    const req = multipartRequest([{ name: "image", value: tinyJpeg() }], { contentType, cookie: await cookie() });
    const response = await handleRequest(req, deps);
    expect(response.status).toBe(415);
    expect(await response.json()).toStrictEqual({ error: "unsupported_media_type" });
    expect(req.bodyUsed).toBe(false);
    expect(prepare).not.toHaveBeenCalled();
    expect(bucket.calls).toEqual([]);
  });

  it("boundary の無い multipart は 415", async () => {
    const { deps } = setup();
    const req = multipartRequest([{ name: "image", value: tinyJpeg() }], {
      contentType: "multipart/form-data",
      cookie: await cookie(),
    });
    expect((await handleRequest(req, deps)).status).toBe(415);
  });

  it("壊れた multipart は 415", async () => {
    const { deps, bucket } = setup();
    const req = new Request("https://example.test/api/uploads", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=zzz", cookie: await cookie() },
      body: "this is not multipart",
    });
    expect((await handleRequest(req, deps)).status).toBe(415);
    expect(bucket.calls).toEqual([]);
  });

  it("content-length が上限を超えると、本文を読まずに 413", async () => {
    const { deps, bucket } = setup();
    const req = multipartRequest([{ name: "image", value: tinyJpeg() }], {
      cookie: await cookie(),
      headers: { "content-length": String(UPLOAD_BODY_MAX_BYTES + 1) },
    });
    expect(req.headers.get("content-length")).toBe(String(UPLOAD_BODY_MAX_BYTES + 1));
    const response = await handleRequest(req, deps);
    expect(response.status).toBe(413);
    expect(await response.json()).toStrictEqual({ error: "payload_too_large" });
    expect(req.bodyUsed).toBe(false);
    expect(bucket.calls).toEqual([]);
  });

  it("content-length が無く本文が大きいと、上限の近くで読むのをやめて 413", async () => {
    const { deps, bucket } = setup();
    const { req, pulled } = streamRequest("/api/uploads", repeatChunks(20 * 1024 * 1024, 64 * 1024), {
      "content-type": "multipart/form-data; boundary=x",
      cookie: await cookie(),
    });
    expect((await handleRequest(req, deps)).status).toBe(413);
    expect(pulled()).toBeLessThanOrEqual(UPLOAD_BODY_MAX_BYTES + 256 * 1024);
    expect(bucket.calls).toEqual([]);
  });
});

describe("POST /api/uploads 中身の検査（422 と 413）", () => {
  async function expect422(response: Response, reason: string) {
    expect(response.status).toBe(422);
    expect(await response.json()).toStrictEqual({ error: "unprocessable", reason });
  }

  it("余分な欄（lat）は 422 bad_form で、R2 も D1 も触らない", async () => {
    const { deps, bucket, testDb } = setup();
    await expect422(await upload(deps, { extra: [{ name: "lat", value: "41.8" }] }), "bad_form");
    expect(bucket.calls).toEqual([]);
    expect(rows(testDb)).toEqual([]);
  });

  it("meta がファイルなら 422 bad_form", async () => {
    const { deps } = setup();
    const req = multipartRequest(
      [
        { name: "image", value: tinyJpeg() },
        { name: "meta", value: JSON.stringify(META), filename: "meta.json", contentType: "application/json" },
      ],
      { cookie: await cookie() },
    );
    await expect422(await handleRequest(req, deps), "bad_form");
  });

  it("画像が MAX_UPLOAD_BYTES を 1 バイト超えると 413（本文は上限内）", async () => {
    const { deps, bucket } = setup();
    const base = tinyJpeg().byteLength;
    const image = tinyJpeg({ scanBytes: MAX_UPLOAD_BYTES - base + 3 });
    expect(image.byteLength).toBe(MAX_UPLOAD_BYTES + 1);
    const response = await upload(deps, { image });
    expect(response.status).toBe(413);
    expect(await response.json()).toStrictEqual({ error: "payload_too_large" });
    expect(bucket.calls).toEqual([]);
  });

  it("APP1（EXIF）付きは 422 metadata で、R2 にも D1 にも残らない（最後の関所）", async () => {
    const { deps, bucket, testDb } = setup();
    await expect422(await upload(deps, { image: tinyJpeg({ apps: [1] }) }), "metadata");
    expect(bucket.calls).toEqual([]);
    expect(rows(testDb)).toEqual([]);
  });

  it("meta に座標・距離の項目があれば 422 unknown_key で、R2 も D1 も触らない（K6）", async () => {
    const { deps, bucket, prepare } = setup();
    await expect422(await upload(deps, { meta: { ...META, lat: 41.8 } }), "unknown_key");
    await expect422(await upload(deps, { meta: { ...META, distance: 120 } }), "unknown_key");
    expect(bucket.calls).toEqual([]);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("meta が長すぎれば 413 でなく 422 too_long", async () => {
    const { deps } = setup();
    await expect422(await upload(deps, { meta: "x".repeat(1025) }), "too_long");
  });

  it("422 の本文に入力の値（番号・ハッシュ・欄の名前）を入れない", async () => {
    const { deps } = setup();
    const response = await upload(deps, { meta: { ...META, candidateFieldIds: ["Z-99"] }, extra: [] });
    expect(response.status).toBe(422);
    const text = await response.text();
    expect(text).not.toContain("Z-99");
    expect(text).not.toContain(HASH);
  });

  it("画像の検査は meta より先（APP1 付きで meta も壊れていれば metadata）", async () => {
    const { deps } = setup();
    await expect422(await upload(deps, { image: tinyJpeg({ apps: [1] }), meta: "not json" }), "metadata");
  });
});

describe("POST /api/uploads 保存の失敗", () => {
  it("D1 の INSERT が投げたら、置いた画像を消して 500（中身を漏らさない）", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const testDb = createTestDb();
    const bucket = createTestBucket();
    const { deps } = setup({}, testDb, bucket);
    const db: DbPort = {
      prepare: (sql) => {
        if (/^\s*INSERT/i.test(sql)) throw new Error("secret-detail");
        return testDb.db.prepare(sql);
      },
      batch: (s) => testDb.db.batch(s),
    };
    const response = await upload({ ...deps, db });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret-detail");
    expect(bucket.objects.size).toBe(0);
    expect(bucket.calls.map((c) => c.op)).toEqual(["put", "delete"]);
  });

  it("INSERT が UNIQUE の文言で投げても、エラー文を見ずに 500（二重は DO NOTHING で見分ける。攻撃役の指摘）", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const testDb = createTestDb();
    const bucket = createTestBucket();
    const put = bucket.photos.put;
    // R2 に置いている間に同じハッシュの行が入る。そのうえで INSERT は UNIQUE の文言で投げる
    bucket.photos.put = async (key, value, options) => {
      testDb.raw
        .prepare(
          "INSERT INTO uploaded_photos (id, field_id, chosen_field_id, state, candidate_field_ids, taken_at, taken_at_source, content_hash, r2_key, width, height, bytes, uploader_device, uploaded_at, updated_at) VALUES ('other', NULL, NULL, 'unconfirmed', '[]', NULL, 'none', ?, 'uploads/other.jpg', 1, 1, 1, 'd', 'x', 'x')",
        )
        .run(HASH);
      return put(key, value, options);
    };
    const { deps } = setup({}, testDb, bucket);
    const db: DbPort = {
      prepare: (sql) => {
        if (/^\s*INSERT/i.test(sql)) throw new Error("UNIQUE constraint failed: uploaded_photos.content_hash");
        return testDb.db.prepare(sql);
      },
      batch: (s) => testDb.db.batch(s),
    };
    expect((await upload({ ...deps, db })).status).toBe(500);
    expect(bucket.calls.map((c) => c.op)).toEqual(["put", "delete"]);
    expect(bucket.objects.has(`uploads/${ID}.jpg`)).toBe(false);
  });

  it("R2 の put が投げたら 500 で、D1 に行を残さず、delete も呼ばない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bucket = createTestBucket();
    let putCalled = false;
    bucket.photos.put = async () => {
      putCalled = true;
      throw new Error("r2-down");
    };
    const { deps, testDb } = setup({}, createTestDb(), bucket);
    expect((await upload(deps)).status).toBe(500);
    expect(putCalled).toBe(true);
    expect(rows(testDb)).toEqual([]);
    expect(bucket.calls.filter((c) => c.op === "delete")).toEqual([]);
  });

  it("片付けの delete も投げたら 500 のまま、console.error に R2 のキーを残す", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const testDb = createTestDb();
    const bucket = createTestBucket();
    bucket.photos.delete = async () => {
      throw new Error("r2-down");
    };
    const { deps } = setup({}, testDb, bucket);
    const db: DbPort = {
      prepare: (sql) => {
        if (/^\s*INSERT/i.test(sql)) throw new Error("d1-down");
        return testDb.db.prepare(sql);
      },
      batch: (s) => testDb.db.batch(s),
    };
    expect((await upload({ ...deps, db })).status).toBe(500);
    const logged = error.mock.calls.flat().map(String).join(" ");
    expect(logged).toContain(`uploads/${ID}.jpg`);
  });
});

