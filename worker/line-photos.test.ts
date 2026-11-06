// #172: L9 LINE から写真を受け取る。画像を LINE から取り、Web の送る流れと同じ検査をして「未確定」で入れる
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/config";
import { inspectJpeg } from "@/services/jpeg-segments";
import { LINE_PHOTO_DAILY_LIMIT, type LineImageMessage } from "@/services/line-image-event";
import { linePhotoCounterKey } from "@/services/usage-limit";
import type { BucketPort, LineContent, LinePort } from "./deps";
import { receiveLinePhoto } from "./line-photos";
import { createTestBucket, type TestBucket } from "./test-bucket";
import { createTestDb, type TestDb } from "./test-db";
import { fakeDeps, NOW_MS, tinyJpeg } from "./test-helpers";

const GROUP_A = "C" + "a".repeat(32);
const ORIGIN = "https://example.test";
const PHOTO_ID = "00000000-0000-4000-8000-000000000001";

const MESSAGE: LineImageMessage = { groupId: GROUP_A, messageId: "100001", replyToken: "reply-token-1", set: null };

interface Setup {
  testDb: TestDb;
  bucket: TestBucket;
  replies: { replyToken: string; text: string }[];
  contentCalls: { messageId: string; maxBytes: number }[];
  pushes: () => number;
  run: (message?: LineImageMessage) => ReturnType<typeof receiveLinePhoto>;
}

function setup(
  content: LineContent | (() => Promise<LineContent>),
  options: { line?: Partial<LinePort> | null; photos?: Partial<BucketPort> } = {},
): Setup {
  const testDb = createTestDb();
  const bucket = createTestBucket();
  const replies: Setup["replies"] = [];
  const contentCalls: Setup["contentCalls"] = [];
  let pushCount = 0;
  const line: LinePort | null =
    options.line === null
      ? null
      : {
          sign: async () => new Uint8Array(32),
          push: async () => {
            pushCount++;
            return 200;
          },
          getContent: async (messageId, maxBytes) => {
            contentCalls.push({ messageId, maxBytes });
            return typeof content === "function" ? content() : content;
          },
          reply: async (replyToken, text) => {
            replies.push({ replyToken, text });
            return 200;
          },
          ...options.line,
        };
  const deps = fakeDeps({ db: testDb.db, photos: { ...bucket.photos, ...options.photos }, line });
  return {
    testDb,
    bucket,
    replies,
    contentCalls,
    pushes: () => pushCount,
    run: (message = MESSAGE) => receiveLinePhoto(deps, message, ORIGIN),
  };
}

function ok(bytes: Uint8Array): LineContent {
  return { ok: true, bytes };
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function photoRows(testDb: TestDb): Record<string, unknown>[] {
  return testDb.raw.prepare("SELECT * FROM uploaded_photos").all() as Record<string, unknown>[];
}

function dailyCount(testDb: TestDb): number | null {
  const row = testDb.raw.prepare("SELECT count FROM usage_counters WHERE key = ?").get(linePhotoCounterKey(NOW_MS)) as
    | { count: number }
    | undefined;
  return row?.count ?? null;
}

describe("receiveLinePhoto 受け取れる（#172）", () => {
  it("JPEG を R2 と D1 に「未確定」（候補なし・撮影日なし・端末は line）で入れ、saved を返す", async () => {
    const original = tinyJpeg({ width: 1200, height: 900 });
    const s = setup(ok(original));
    expect(await s.run()).toBe("saved");

    expect(s.contentCalls).toStrictEqual([{ messageId: "100001", maxBytes: MAX_UPLOAD_BYTES }]);
    expect(photoRows(s.testDb)).toStrictEqual([
      {
        id: PHOTO_ID,
        field_id: null,
        chosen_field_id: null,
        state: "unconfirmed",
        candidate_field_ids: "[]",
        taken_at: null,
        taken_at_source: "none",
        content_hash: sha256(original),
        r2_key: `uploads/${PHOTO_ID}.jpg`,
        width: 1200,
        height: 900,
        bytes: original.byteLength,
        uploader_device: "line",
        uploaded_at: new Date(NOW_MS).toISOString(),
        updated_at: new Date(NOW_MS).toISOString(),
      },
    ]);
    const stored = s.bucket.objects.get(`uploads/${PHOTO_ID}.jpg`);
    expect(stored?.contentType).toBe("image/jpeg");
    expect(stored?.bytes).toStrictEqual(original);
  });

  it("APP1〜15（撮影位置・撮影日が入りうる）を消してから置く。ハッシュは取ってきたままのバイト列", async () => {
    const original = tinyJpeg({ width: 1200, height: 900, apps: [1, 2, 13] });
    const s = setup(ok(original));
    expect(await s.run()).toBe("saved");

    const stored = s.bucket.objects.get(`uploads/${PHOTO_ID}.jpg`)?.bytes;
    expect(stored).toBeDefined();
    expect(inspectJpeg(stored as Uint8Array).appSegments).toStrictEqual([]);
    expect(Buffer.from(stored as Uint8Array).includes(Buffer.from("Exif"))).toBe(false);
    const [row] = photoRows(s.testDb);
    expect(row.content_hash).toBe(sha256(original));
    expect(row.bytes).toBe((stored as Uint8Array).byteLength);
    expect(row.taken_at).toBeNull();
    expect(row.candidate_field_ids).toBe("[]");
  });

  it("受け取ったら reply で 1 回返す（push は使わない＝月の上限に数えない）", async () => {
    const s = setup(ok(tinyJpeg({ width: 1200, height: 900 })));
    await s.run();
    expect(s.replies).toHaveLength(1);
    expect(s.replies[0].replyToken).toBe("reply-token-1");
    expect(s.replies[0].text).toContain("未確定");
    expect(s.replies[0].text).toContain(`${ORIGIN}/recent`);
    expect(s.pushes()).toBe(0);
    const monthly = s.testDb.raw.prepare("SELECT COUNT(*) AS n FROM usage_counters WHERE key LIKE 'line:%'").get() as {
      n: number;
    };
    expect(monthly.n).toBe(0);
  });

  it("まとめて送られた画像（imageSet）の途中の 1 枚は、受け取れても返事をしない。最後の 1 枚だけ返す", async () => {
    const s = setup(ok(tinyJpeg({ width: 1200, height: 900 })));
    expect(await s.run({ ...MESSAGE, set: { index: 1, total: 2 } })).toBe("saved");
    expect(s.replies).toHaveLength(0);
  });

  it("長辺がちょうど 1600px なら受け取る", async () => {
    const s = setup(ok(tinyJpeg({ width: 1600, height: 1200 })));
    expect(await s.run()).toBe("saved");
  });

  it("1 日の枚数を 1 つ数える", async () => {
    const s = setup(ok(tinyJpeg({ width: 1200, height: 900 })));
    await s.run();
    expect(dailyCount(s.testDb)).toBe(1);
  });
});

describe("receiveLinePhoto 二重（#172、K7）", () => {
  it("同じバイト列を 2 回受けても 1 枚。2 回目は duplicate で R2 に置かない", async () => {
    const original = tinyJpeg({ width: 1200, height: 900, apps: [1] });
    const s = setup(ok(original));
    expect(await s.run()).toBe("saved");
    const putsAfterFirst = s.bucket.calls.filter((c) => c.op === "put").length;
    expect(await s.run({ ...MESSAGE, messageId: "100002", replyToken: "reply-token-2" })).toBe("duplicate");
    expect(photoRows(s.testDb)).toHaveLength(1);
    expect(s.bucket.calls.filter((c) => c.op === "put").length).toBe(putsAfterFirst);
    expect(s.replies.at(-1)?.text).toContain("もう届いています");
  });

  it("Web から送った写真と同じハッシュなら duplicate", async () => {
    const original = tinyJpeg({ width: 1200, height: 900 });
    const s = setup(ok(original));
    s.testDb.raw
      .prepare(
        "INSERT INTO uploaded_photos (id, field_id, chosen_field_id, state, candidate_field_ids, taken_at, taken_at_source, content_hash, r2_key, width, height, bytes, uploader_device, uploaded_at, updated_at) " +
          "VALUES ('web-1', NULL, NULL, 'unconfirmed', '[]', NULL, 'none', ?, 'uploads/web-1.jpg', 10, 10, 10, 'dev-member', 'x', 'x')",
      )
      .run(sha256(original));
    expect(await s.run()).toBe("duplicate");
    expect(s.bucket.objects.size).toBe(0);
  });

  it("置いている間に同じハッシュが入ったら、置いた画像を消して duplicate", async () => {
    const original = tinyJpeg({ width: 1200, height: 900 });
    let testDbRef: TestDb | null = null;
    const s = setup(ok(original), {
      photos: {
        put: async (key, value, options) => {
          // 先に別の要求が同じ写真を入れた
          testDbRef?.raw
            .prepare(
              "INSERT INTO uploaded_photos (id, field_id, chosen_field_id, state, candidate_field_ids, taken_at, taken_at_source, content_hash, r2_key, width, height, bytes, uploader_device, uploaded_at, updated_at) " +
                "VALUES ('winner', NULL, NULL, 'unconfirmed', '[]', NULL, 'none', ?, 'uploads/winner.jpg', 10, 10, 10, 'line', 'x', 'x')",
            )
            .run(sha256(original));
          return createTestBucket().photos.put(key, value, options);
        },
        delete: async (key) => {
          deleted.push(key);
        },
      },
    });
    const deleted: string[] = [];
    testDbRef = s.testDb;
    expect(await s.run()).toBe("duplicate");
    expect(deleted).toStrictEqual([`uploads/${PHOTO_ID}.jpg`]);
    expect(photoRows(s.testDb).map((r) => r.id)).toStrictEqual(["winner"]);
  });
});

describe("receiveLinePhoto 受け取れない（#172）", () => {
  it("3MB を超える（LINE の取得が too_large）なら保存せず、大きすぎると返す", async () => {
    const s = setup({ ok: false, reason: "too_large" });
    expect(await s.run()).toBe("too_large");
    expect(photoRows(s.testDb)).toHaveLength(0);
    expect(s.bucket.calls).toHaveLength(0);
    expect(s.replies[0].text).toContain("大きすぎ");
    expect(s.replies[0].text).toContain(`${ORIGIN}/upload`);
  });

  it("長辺が 1600px を超えるなら保存せず bad_dimensions", async () => {
    const s = setup(ok(tinyJpeg({ width: 1601, height: 1200 })));
    expect(await s.run()).toBe("bad_dimensions");
    expect(photoRows(s.testDb)).toHaveLength(0);
    expect(s.bucket.calls).toHaveLength(0);
    expect(s.replies[0].text).toContain("大きすぎ");
  });

  it("JPEG でない（PNG の頭・壊れた JPEG・EOI で終わらない）なら保存せず not_jpeg", async () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const truncated = tinyJpeg({ width: 1200, height: 900 }).subarray(0, 10);
    const noEoi = tinyJpeg({ width: 1200, height: 900, tail: [] });
    for (const bytes of [png, truncated, noEoi]) {
      const s = setup(ok(bytes));
      expect(await s.run()).toBe("not_jpeg");
      expect(photoRows(s.testDb)).toHaveLength(0);
      expect(s.bucket.calls).toHaveLength(0);
      expect(s.replies[0].text).toContain("受け取れませんでした");
    }
  });

  it("最初のスキャンの後ろに APP1〜15 を隠した JPEG は消しきれないので保存せず metadata", async () => {
    const hidden = tinyJpeg({ width: 1200, height: 900, tail: [0xff, 0xe1, 0x00, 0x04, 0x45, 0x78, 0xff, 0xd9] });
    const s = setup(ok(hidden));
    expect(await s.run()).toBe("metadata");
    expect(photoRows(s.testDb)).toHaveLength(0);
    expect(s.bucket.calls).toHaveLength(0);
  });

  it("LINE からの取得に失敗したら保存せず fetch_failed（例外を出さない）", async () => {
    const s = setup({ ok: false, reason: "failed" });
    expect(await s.run()).toBe("fetch_failed");
    expect(photoRows(s.testDb)).toHaveLength(0);
    expect(s.replies[0].text).toContain("受け取れませんでした");
  });

  it("取得が例外を投げても外に出さず fetch_failed", async () => {
    const s = setup(async () => {
      throw new Error("network");
    });
    expect(await s.run()).toBe("fetch_failed");
  });

  it("R2 に置けなければ error（行を入れない・例外を出さない）", async () => {
    const s = setup(ok(tinyJpeg({ width: 1200, height: 900 })), {
      photos: {
        put: async () => {
          throw new Error("r2 down");
        },
      },
    });
    expect(await s.run()).toBe("error");
    expect(photoRows(s.testDb)).toHaveLength(0);
    expect(s.replies[0].text).toContain("受け取れませんでした");
  });

  it("返事に失敗しても結果は変わらない（例外を出さない）", async () => {
    const s = setup(ok(tinyJpeg({ width: 1200, height: 900 })), {
      line: {
        reply: async () => {
          throw new Error("reply down");
        },
      },
    });
    expect(await s.run()).toBe("saved");
    expect(photoRows(s.testDb)).toHaveLength(1);
  });

  it("LINE の口が無ければ何もしない（null）", async () => {
    const s = setup(ok(tinyJpeg()), { line: null });
    expect(await s.run()).toBeNull();
    expect(photoRows(s.testDb)).toHaveLength(0);
  });
});

describe("receiveLinePhoto 1 日の上限（#172）", () => {
  it(`1 日 ${LINE_PHOTO_DAILY_LIMIT} 枚まで。超えたら LINE から取りに行かずに limit と返す`, async () => {
    const s = setup(ok(tinyJpeg({ width: 1200, height: 900 })));
    s.testDb.raw
      .prepare("INSERT INTO usage_counters (key, count, expires_at) VALUES (?, ?, ?)")
      .run(linePhotoCounterKey(NOW_MS), LINE_PHOTO_DAILY_LIMIT, "2099-01-01T00:00:00.000Z");
    expect(await s.run()).toBe("limit");
    expect(s.contentCalls).toHaveLength(0);
    expect(photoRows(s.testDb)).toHaveLength(0);
    expect(dailyCount(s.testDb)).toBe(LINE_PHOTO_DAILY_LIMIT);
    expect(s.replies[0].text).toContain(`${LINE_PHOTO_DAILY_LIMIT} 枚`);
  });

  it("上限の 1 つ手前なら受け取る", async () => {
    const s = setup(ok(tinyJpeg({ width: 1200, height: 900 })));
    s.testDb.raw
      .prepare("INSERT INTO usage_counters (key, count, expires_at) VALUES (?, ?, ?)")
      .run(linePhotoCounterKey(NOW_MS), LINE_PHOTO_DAILY_LIMIT - 1, "2099-01-01T00:00:00.000Z");
    expect(await s.run()).toBe("saved");
    expect(dailyCount(s.testDb)).toBe(LINE_PHOTO_DAILY_LIMIT);
  });

  it("受け取れなかったもの（取得の失敗）も数える（取りに行く前に数える）", async () => {
    const s = setup({ ok: false, reason: "failed" });
    await s.run();
    expect(dailyCount(s.testDb)).toBe(1);
  });
});
