// #172: L9 LINE から写真を受け取る。webhook の本文から画像のメッセージを取り出し、返事の文を決める
import { describe, expect, it } from "vitest";
import {
  groupImageMessages,
  LINE_PHOTO_DAILY_LIMIT,
  LINE_PHOTOS_PER_WEBHOOK,
  linePhotoOverflowReply,
  linePhotoReply,
  type LineImageMessage,
  type LinePhotoOutcome,
} from "./line-image-event";

/** 架空のグループ ID（C と 16 進 32 文字） */
const GROUP_A = "C" + "a".repeat(32);
const GROUP_B = "C" + "b".repeat(32);
const ORIGIN = "https://example.test";

function imageEvent(overrides: Record<string, unknown> = {}, message: Record<string, unknown> = {}): unknown {
  return {
    type: "message",
    mode: "active",
    timestamp: 1_793_000_000_000,
    replyToken: "reply-token-1",
    source: { type: "group", groupId: GROUP_A, userId: "U" + "d".repeat(32) },
    message: { type: "image", id: "100001", contentProvider: { type: "line" }, ...message },
    ...overrides,
  };
}

function body(events: unknown[]): string {
  return JSON.stringify({ destination: "U" + "0".repeat(32), events });
}

describe("groupImageMessages（#172）", () => {
  it("グループの画像のメッセージから groupId・messageId・replyToken を取り出す（imageSet が無ければ set は null）", () => {
    expect(groupImageMessages(body([imageEvent()]))).toStrictEqual<LineImageMessage[]>([
      { groupId: GROUP_A, messageId: "100001", replyToken: "reply-token-1", set: null },
    ]);
  });

  it("LINE の個人 ID（userId）は返す値に入れない", () => {
    const text = JSON.stringify(groupImageMessages(body([imageEvent()])));
    expect(text).not.toContain("U" + "d".repeat(32));
  });

  it("まとめて送られた画像（imageSet）の index と total を返す", () => {
    const events = [
      imageEvent({}, { id: "200001", imageSet: { id: "set-1", index: 1, total: 2 } }),
      imageEvent({ replyToken: "reply-token-2" }, { id: "200002", imageSet: { id: "set-1", index: 2, total: 2 } }),
    ];
    expect(groupImageMessages(body(events))).toStrictEqual<LineImageMessage[]>([
      { groupId: GROUP_A, messageId: "200001", replyToken: "reply-token-1", set: { index: 1, total: 2 } },
      { groupId: GROUP_A, messageId: "200002", replyToken: "reply-token-2", set: { index: 2, total: 2 } },
    ]);
  });

  it("imageSet の index・total が崩れていれば set は null（1 枚として扱う）", () => {
    const broken = [
      { index: 0, total: 2 },
      { index: 3, total: 2 },
      { index: 1.5, total: 2 },
      { index: "1", total: 2 },
      { index: 1 },
      "set",
    ];
    for (const imageSet of broken) {
      const [message] = groupImageMessages(body([imageEvent({}, { imageSet })]));
      expect(message.set).toBeNull();
    }
  });

  it("違うグループの画像も groupId 付きで返す（どのグループを受けるかは呼ぶ側が決める）", () => {
    const messages = groupImageMessages(body([imageEvent({ source: { type: "group", groupId: GROUP_B } })]));
    expect(messages.map((m) => m.groupId)).toStrictEqual([GROUP_B]);
  });

  it("1 対 1 のトーク（user）・複数人のトーク（room）の画像は無視する", () => {
    const events = [
      imageEvent({ source: { type: "user", userId: "U" + "d".repeat(32) } }),
      imageEvent({ source: { type: "room", roomId: "R" + "c".repeat(32) } }),
    ];
    expect(groupImageMessages(body(events))).toStrictEqual([]);
  });

  it("画像以外のメッセージ（文字・動画）と、ほかのイベント（join・leave）は無視する", () => {
    const events = [
      imageEvent({}, { type: "text", text: "こんにちは" }),
      imageEvent({}, { type: "video" }),
      { type: "join", source: { type: "group", groupId: GROUP_A } },
      { type: "leave", source: { type: "group", groupId: GROUP_A } },
    ];
    expect(groupImageMessages(body(events))).toStrictEqual([]);
  });

  it("外部の URL を指す画像（contentProvider が external）は取りに行かないので無視する", () => {
    const events = [
      imageEvent({}, { contentProvider: { type: "external", originalContentUrl: "https://example.com/a.jpg" } }),
      imageEvent({}, { contentProvider: undefined }),
    ];
    expect(groupImageMessages(body(events))).toStrictEqual([]);
  });

  it("待機中のチャネル（mode が standby）のイベントは無視する", () => {
    expect(groupImageMessages(body([imageEvent({ mode: "standby" })]))).toStrictEqual([]);
  });

  it("message の id が数字でない・長すぎるものは無視する（URL のパスに入れるため）", () => {
    for (const id of ["", "12a", "../1", "1/2", "1".repeat(33), 100001]) {
      expect(groupImageMessages(body([imageEvent({}, { id })]))).toStrictEqual([]);
    }
  });

  it("replyToken が無い・空・空白を含むものは無視する", () => {
    for (const replyToken of [undefined, "", "a b", 123, "x".repeat(257)]) {
      expect(groupImageMessages(body([imageEvent({ replyToken })]))).toStrictEqual([]);
    }
  });

  it("groupId の形が違うものは無視する", () => {
    for (const groupId of ["C" + "a".repeat(31), "X" + "a".repeat(32), "C" + "A".repeat(32), 1]) {
      expect(groupImageMessages(body([imageEvent({ source: { type: "group", groupId } })]))).toStrictEqual([]);
    }
  });

  it("同じ messageId が 2 回あれば 1 つにする（最初のもの）", () => {
    const events = [imageEvent(), imageEvent({ replyToken: "reply-token-2" })];
    expect(groupImageMessages(body(events)).map((m) => m.replyToken)).toStrictEqual(["reply-token-1"]);
  });

  it("JSON でない・events が配列でない・形の崩れたイベントは [] か無視（例外を出さない）", () => {
    expect(groupImageMessages("not json")).toStrictEqual([]);
    expect(groupImageMessages("null")).toStrictEqual([]);
    expect(groupImageMessages(JSON.stringify({ events: {} }))).toStrictEqual([]);
    expect(groupImageMessages(JSON.stringify({ ["__proto__"]: { events: [imageEvent()] } }))).toStrictEqual([]);
    expect(groupImageMessages(body([null, 1, "x", [], { type: "message" }, imageEvent()]))).toHaveLength(1);
  });
});

describe("linePhotoReply（#172）", () => {
  it("受け取れたら「未確定」と新着の URL を返す", () => {
    const text = linePhotoReply("saved", ORIGIN, null);
    expect(text).toContain("受け取りました");
    expect(text).toContain("未確定");
    expect(text).toContain(`${ORIGIN}/recent`);
  });

  it("二重なら「もう届いています」と新着の URL を返す", () => {
    const text = linePhotoReply("duplicate", ORIGIN, null);
    expect(text).toContain("もう届いています");
    expect(text).toContain(`${ORIGIN}/recent`);
  });

  it("大きすぎる（バイト・長辺）なら、大きすぎることと Web の「写真を送る」の URL を返す", () => {
    for (const outcome of ["too_large", "bad_dimensions"] as const) {
      const text = linePhotoReply(outcome, ORIGIN, null);
      expect(text).toContain("大きすぎ");
      expect(text).toContain(`${ORIGIN}/upload`);
    }
  });

  it("JPEG でない・取得の失敗・保存の失敗なら、受け取れなかったことと Web の「写真を送る」の URL を返す", () => {
    for (const outcome of ["not_jpeg", "metadata", "fetch_failed", "error"] as const) {
      const text = linePhotoReply(outcome, ORIGIN, null);
      expect(text).toContain("受け取れませんでした");
      expect(text).toContain(`${ORIGIN}/upload`);
    }
  });

  it("1 日の上限なら、上限の枚数と Web の「写真を送る」の URL を返す", () => {
    const text = linePhotoReply("limit", ORIGIN, null);
    expect(text).toContain(`${LINE_PHOTO_DAILY_LIMIT} 枚`);
    expect(text).toContain(`${ORIGIN}/upload`);
  });

  it("まとめて送られた画像は、受け取れたときの返事を最後の 1 枚にだけ付ける", () => {
    for (const outcome of ["saved", "duplicate"] as const) {
      expect(linePhotoReply(outcome, ORIGIN, { index: 1, total: 3 })).toBeNull();
      expect(linePhotoReply(outcome, ORIGIN, { index: 2, total: 3 })).toBeNull();
      expect(linePhotoReply(outcome, ORIGIN, { index: 3, total: 3 })).not.toBeNull();
    }
  });

  it("まとめて送られた画像でも、受け取れなかったときは 1 枚ごとに返す", () => {
    const failures: LinePhotoOutcome[] = ["too_large", "bad_dimensions", "not_jpeg", "metadata", "fetch_failed", "error", "limit"];
    for (const outcome of failures) {
      expect(linePhotoReply(outcome, ORIGIN, { index: 1, total: 3 })).not.toBeNull();
    }
  });

  it("返事は LINE の文字の上限（5000 文字）より十分短い", () => {
    const outcomes: LinePhotoOutcome[] = ["saved", "duplicate", "too_large", "bad_dimensions", "not_jpeg", "metadata", "fetch_failed", "error", "limit"];
    for (const outcome of outcomes) {
      expect((linePhotoReply(outcome, ORIGIN, null) ?? "").length).toBeLessThan(300);
    }
  });
});

describe("まとめて送られた画像の最後の 1 枚が受け取れなかったとき（#172、レビューの指摘）", () => {
  it("失敗の返事に、ほかの写真は受け取れているかもしれないことと新着の URL を足す", () => {
    const failures: LinePhotoOutcome[] = ["too_large", "bad_dimensions", "not_jpeg", "metadata", "fetch_failed", "error", "limit"];
    for (const outcome of failures) {
      const text = linePhotoReply(outcome, ORIGIN, { index: 2, total: 2 }) ?? "";
      expect(text).toContain("ほかの写真");
      expect(text).toContain(`${ORIGIN}/recent`);
      expect(text).toContain(`${ORIGIN}/upload`);
    }
  });

  it("1 枚だけ送られたときの失敗の返事には足さない", () => {
    const text = linePhotoReply("fetch_failed", ORIGIN, null) ?? "";
    expect(text).not.toContain("ほかの写真");
    expect(text).not.toContain(`${ORIGIN}/recent`);
  });
});

describe("1 回の webhook で受け取る枚数（#172、レビューの指摘）", () => {
  it("1 回の webhook で受け取るのは 10 枚まで", () => {
    expect(LINE_PHOTOS_PER_WEBHOOK).toBe(10);
  });

  it("超えた分の返事は、受け取らなかった枚数・上限の枚数・Web の「写真を送る」の URL", () => {
    const text = linePhotoOverflowReply(ORIGIN, 3);
    expect(text).toContain("3 枚");
    expect(text).toContain(`${LINE_PHOTOS_PER_WEBHOOK} 枚`);
    expect(text).toContain(`${ORIGIN}/upload`);
  });
});

describe("LINE_PHOTO_DAILY_LIMIT（#172）", () => {
  it("1 日 30 枚（docs/decisions.md 11-06）", () => {
    expect(LINE_PHOTO_DAILY_LIMIT).toBe(30);
  });
});
