import { describe, expect, it } from "vitest";
import { STATUS_REASONS } from "@/config";
import type { HandoverRecord, StatusEvent, UploadedPhoto } from "@/types";
import { buildHandoverRecords, handoverContent } from "./handover-document";

/** A-06・収穫可能・理由なしの判断。change で上書きする */
function event(id: number, at: string, change: Partial<StatusEvent> = {}): StatusEvent {
  return {
    id,
    fieldId: "A-06",
    status: "ready",
    reasons: [],
    note: null,
    refPhotoIds: [],
    actorDevice: "dev-actor-secret",
    at,
    revokedAt: null,
    ...change,
  };
}

/** A-06 に確定済みの写真。change で上書きする */
function photo(id: string, takenAt: string | null, change: Partial<UploadedPhoto> = {}): UploadedPhoto {
  return {
    id,
    fieldId: "A-06",
    chosenFieldId: null,
    state: "confirmed",
    candidateFieldIds: ["A-06"],
    takenAt,
    takenAtSource: takenAt === null ? "none" : "xmp",
    width: 1601,
    height: 1203,
    uploadedAt: "2026-07-25T03:00:00.000Z",
    uploaderDevice: "dev-uploader-secret",
    ...change,
  };
}

const order = (records: HandoverRecord[]) => records.map((r) => `${r.kind}:${r.id}`);

describe("buildHandoverRecords: 判断の文（T27）", () => {
  it("理由・メモ・根拠の写真の数を、決めた書き方の 1 文にする", () => {
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [
        event(3, "2026-07-21T02:00:00.000Z", {
          reasons: ["ear_color", "yellow_ratio"],
          note: "北側はまだ青い",
          refPhotoIds: ["p1", "p2"],
        }),
      ],
      [],
    );
    expect(records).toStrictEqual([
      {
        kind: "status",
        id: "3",
        text: "[判断 3] 2026-07-21 収穫可能。理由: 穂の色・黄色い穂の割合。メモ: 北側はまだ青い。根拠の写真: 2 枚。",
      },
    ]);
  });

  it("収穫済は「収穫済」、理由が空は「理由の記録なし」、メモと根拠の写真が無ければその節を書かない", () => {
    const [record] = buildHandoverRecords("A-06", "2026", [event(7, "2026-08-02T01:00:00.000Z", { status: "done" })], []);
    expect(record.text).toBe("[判断 7] 2026-08-02 収穫済。理由の記録なし。");
  });

  it("農協の判定の理由はラベルで書く（コードを出さない）", () => {
    const [record] = buildHandoverRecords(
      "A-06",
      "2026",
      [event(4, "2026-07-22T01:00:00.000Z", { reasons: ["ja_stop_moisture", "ja_stop_damage", "other"] })],
      [],
    );
    expect(record.text).toBe(
      "[判断 4] 2026-07-22 収穫可能。理由: 農協の判定で中止（水分超過）・農協の判定で中止（砕けなどの傷）・その他。",
    );
    expect(record.text).not.toMatch(/ja_stop|other/);
  });

  // 攻撃役（T27 の 1 回目）: テストに出る 5 つのコードだけの表を手で書いても通った
  it("理由のラベルは設定の STATUS_REASONS のとおり（全部のコード）", () => {
    for (const { code, label } of STATUS_REASONS) {
      const [record] = buildHandoverRecords("A-06", "2026", [event(1, "2026-07-21T01:00:00.000Z", { reasons: [code] })], []);
      expect(record.text).toBe(`[判断 1] 2026-07-21 収穫可能。理由: ${label}。`);
    }
  });

  it("取り消した判断は末尾に取り消した日を書く（日本時間）", () => {
    const [record] = buildHandoverRecords(
      "A-06",
      "2026",
      [event(5, "2026-07-21T02:00:00.000Z", { revokedAt: "2026-07-22T15:30:00.000Z" })],
      [],
    );
    expect(record.text).toBe("[判断 5] 2026-07-21 収穫可能。理由の記録なし。（2026-07-23 に取り消し）");
  });

  it("日付は日本時間（UTC の 15 時以降は次の日）", () => {
    const [record] = buildHandoverRecords("A-06", "2026", [event(8, "2026-07-20T15:00:00.000Z")], []);
    expect(record.text).toBe("[判断 8] 2026-07-21 収穫可能。理由の記録なし。");
  });

  it("一覧に無い理由のコードは例外（黙って捨てない）", () => {
    expect(() =>
      buildHandoverRecords("A-06", "2026", [event(9, "2026-07-21T02:00:00.000Z", { reasons: ["moisture_23"] })], []),
    ).toThrow(/理由のコード/);
  });
});

describe("buildHandoverRecords: 写真の文（T27）", () => {
  it("撮影日と、どの判断が根拠にしたかを書く（判断の番号の小さい順）", () => {
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [
        event(12, "2026-07-22T01:00:00.000Z", { refPhotoIds: ["p-a"] }),
        event(3, "2026-07-21T01:00:00.000Z", { refPhotoIds: ["p-a", "p-b"] }),
      ],
      [photo("p-a", "2026-07-20"), photo("p-b", "2026-07-20", { uploadedAt: "2026-07-25T04:00:00.000Z" })],
    );
    expect(records.filter((r) => r.kind === "photo")).toStrictEqual([
      { kind: "photo", id: "p-a", text: "[写真] 2026-07-20 撮影。判断 3・12 の根拠。" },
      { kind: "photo", id: "p-b", text: "[写真] 2026-07-20 撮影。判断 3 の根拠。" },
    ]);
  });

  // 攻撃役（T27 の 1 回目）: 取り消した判断を根拠に数えるかを決めていなかった
  it("取り消した判断も根拠に数える（判断の要素にも取り消しとして残るので、たどれるように）", () => {
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [event(4, "2026-07-21T01:00:00.000Z", { refPhotoIds: ["p-a"], revokedAt: "2026-07-21T05:00:00.000Z" })],
      [photo("p-a", "2026-07-20")],
    );
    expect(records[0]).toStrictEqual({ kind: "photo", id: "p-a", text: "[写真] 2026-07-20 撮影。判断 4 の根拠。" });
  });

  it("どの判断の根拠でもない写真は撮影日だけ", () => {
    const [record] = buildHandoverRecords("A-06", "2026", [], [photo("p-c", "2026-07-19")]);
    expect(record).toStrictEqual({ kind: "photo", id: "p-c", text: "[写真] 2026-07-19 撮影。" });
  });

  it("撮影日不明の写真は「撮影日不明」と送った日（日本時間）を書く", () => {
    const [record] = buildHandoverRecords(
      "A-06",
      "2026",
      [],
      [photo("p-d", null, { uploadedAt: "2026-07-23T16:00:00.000Z" })],
    );
    expect(record.text).toBe("[写真] 撮影日不明（2026-07-24 に送信）。");
  });

  // 人の確認（T27 の GREEN の後）: 撮影日不明の写真では根拠の節が抜けても通った
  it("撮影日不明の写真も、どの判断が根拠にしたかを書く", () => {
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [event(5, "2026-07-21T01:00:00.000Z", { refPhotoIds: ["p-u"] })],
      [photo("p-u", null, { uploadedAt: "2026-07-23T16:00:00.000Z" })],
    );
    expect(records[1]).toStrictEqual({
      kind: "photo",
      id: "p-u",
      text: "[写真] 撮影日不明（2026-07-24 に送信）。判断 5 の根拠。",
    });
  });
});

describe("buildHandoverRecords: 並び（T27）", () => {
  it("日付の古い順。同じ日は写真が先、写真どうしは送った順、判断どうしは時刻順。撮影日不明の写真は最後", () => {
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [
        event(20, "2026-07-22T05:00:00.000Z"),
        event(21, "2026-07-21T09:00:00.000Z"),
        event(2, "2026-07-21T03:00:00.000Z"),
      ],
      [
        photo("undated", null, { uploadedAt: "2026-07-01T00:00:00.000Z" }),
        photo("p-late-upload", "2026-07-21", { uploadedAt: "2026-07-26T00:00:00.000Z" }),
        photo("p-0722", "2026-07-22"),
        photo("p-early-upload", "2026-07-21", { uploadedAt: "2026-07-24T00:00:00.000Z" }),
      ],
    );
    expect(order(records)).toStrictEqual([
      "photo:p-early-upload",
      "photo:p-late-upload",
      "status:2",
      "status:21",
      "photo:p-0722",
      "status:20",
      "photo:undated",
    ]);
  });

  it("同じ時刻の判断は id の小さい順、同じ日・同じ送った時刻の写真は id の順", () => {
    const at = "2026-07-21T03:00:00.000Z";
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [event(11, at), event(9, at), event(10, at)],
      [photo("p-z", "2026-07-21"), photo("p-m", "2026-07-21")],
    );
    expect(order(records)).toStrictEqual(["photo:p-m", "photo:p-z", "status:9", "status:10", "status:11"]);
  });

  // 攻撃役（T27 の 2 回目）: 撮影日不明が 1 枚の場合しか無かった
  it("撮影日不明の写真どうしは送った順、同じなら id の順（撮影日のある記録の後）", () => {
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [event(1, "2026-12-30T01:00:00.000Z")],
      [
        photo("u-b", null, { uploadedAt: "2026-07-02T00:00:00.000Z" }),
        photo("u-c", null, { uploadedAt: "2026-07-01T00:00:00.000Z" }),
        photo("u-a", null, { uploadedAt: "2026-07-02T00:00:00.000Z" }),
      ],
    );
    expect(order(records)).toStrictEqual(["status:1", "photo:u-c", "photo:u-a", "photo:u-b"]);
  });

  // 攻撃役（T27 の 1 回目）: id を決めた桁の文字列にして並べても通った
  it("同じ時刻の判断の id は数として比べる（桁が違っても）", () => {
    const at = "2026-07-21T03:00:00.000Z";
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [event(10_000_000_000_000, at), event(99, at), event(9_999_999_999_999, at), event(100, at)],
      [],
    );
    expect(order(records)).toStrictEqual([
      "status:99",
      "status:100",
      "status:9999999999999",
      "status:10000000000000",
    ]);
  });

  it("並びは日本時間の日付で決まる（UTC の日付ではない）", () => {
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [event(1, "2026-07-20T16:00:00.000Z")],
      [photo("p-0721", "2026-07-21")],
    );
    expect(order(records)).toStrictEqual(["photo:p-0721", "status:1"]);
  });

  it("渡した配列を書き換えない", () => {
    const events = [event(2, "2026-07-22T01:00:00.000Z"), event(1, "2026-07-21T01:00:00.000Z")];
    const photos = [photo("p-2", "2026-07-22"), photo("p-1", "2026-07-21")];
    buildHandoverRecords("A-06", "2026", events, photos);
    expect(events.map((e) => e.id)).toStrictEqual([2, 1]);
    expect(photos.map((p) => p.id)).toStrictEqual(["p-2", "p-1"]);
  });
});

describe("buildHandoverRecords: シーズン（日本時間の年）で絞る（T27）", () => {
  it("判断は at の、写真は撮影日の、撮影日不明の写真は送った日の日本時間の年で絞る", () => {
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [
        event(1, "2025-12-31T14:59:59.000Z"),
        event(2, "2025-12-31T15:00:00.000Z"),
        event(3, "2026-12-31T15:00:00.000Z"),
      ],
      [
        photo("p-2025", "2025-08-01"),
        photo("p-2026", "2026-01-01"),
        photo("undated-2025", null, { uploadedAt: "2025-12-31T14:00:00.000Z" }),
        photo("undated-2026", null, { uploadedAt: "2025-12-31T15:00:00.000Z" }),
      ],
    );
    expect(order(records)).toStrictEqual(["photo:p-2026", "status:2", "photo:undated-2026"]);
  });

  it("記録が無ければ空", () => {
    expect(buildHandoverRecords("A-06", "2026", [], [])).toStrictEqual([]);
  });

  it("前の年の判断が根拠にした写真でも、文に書くのはそのシーズンの判断だけ", () => {
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [event(1, "2025-08-01T01:00:00.000Z", { refPhotoIds: ["p-x"] }), event(2, "2026-07-21T01:00:00.000Z", { refPhotoIds: ["p-x"] })],
      [photo("p-x", "2026-07-20")],
    );
    expect(records[0]).toStrictEqual({ kind: "photo", id: "p-x", text: "[写真] 2026-07-20 撮影。判断 2 の根拠。" });
  });
});

describe("buildHandoverRecords: 送らないもの・混ざった記録（T27）", () => {
  it("端末 ID・写真の id・大きさ・圃場の候補はどの文にも入らない", () => {
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [event(3, "2026-07-21T01:00:00.000Z", { refPhotoIds: ["p-secret-id"], note: "見回り" })],
      [photo("p-secret-id", "2026-07-20", { candidateFieldIds: ["A-06", "A-09"] })],
    );
    const all = records.map((r) => r.text).join("\n");
    expect(all).not.toContain("dev-actor-secret");
    expect(all).not.toContain("dev-uploader-secret");
    expect(all).not.toContain("p-secret-id");
    expect(all).not.toContain("1601");
    expect(all).not.toContain("1203");
    expect(all).not.toContain("A-09");
  });

  it("他の圃場の判断が混ざっていたら例外", () => {
    expect(() =>
      buildHandoverRecords("A-06", "2026", [event(1, "2026-07-21T01:00:00.000Z", { fieldId: "A-07" })], []),
    ).toThrow(/他の圃場/);
  });

  it("他の圃場の写真が混ざっていたら例外", () => {
    expect(() => buildHandoverRecords("A-06", "2026", [], [photo("p-1", "2026-07-21", { fieldId: "A-07" })])).toThrow(
      /他の圃場/,
    );
  });

  it("確定していない写真が混ざっていたら例外", () => {
    expect(() =>
      buildHandoverRecords("A-06", "2026", [], [photo("p-1", "2026-07-21", { state: "unconfirmed" })]),
    ).toThrow(/確定していない/);
  });

  it("混ざった記録はシーズンの外でも例外（絞る前に確かめる）", () => {
    expect(() =>
      buildHandoverRecords("A-06", "2026", [event(1, "2024-07-21T01:00:00.000Z", { fieldId: "A-07" })], []),
    ).toThrow(/他の圃場/);
  });
});

describe("handoverContent（T27）", () => {
  it("records を同じ順・同じ数の text の要素にする", () => {
    const records: HandoverRecord[] = [
      { kind: "photo", id: "p-1", text: "[写真] 2026-07-20 撮影。" },
      { kind: "status", id: "3", text: "[判断 3] 2026-07-21 収穫可能。理由の記録なし。" },
    ];
    expect(handoverContent(records)).toStrictEqual([
      { type: "text", text: "[写真] 2026-07-20 撮影。" },
      { type: "text", text: "[判断 3] 2026-07-21 収穫可能。理由の記録なし。" },
    ]);
  });

  it("空なら空", () => {
    expect(handoverContent([])).toStrictEqual([]);
  });

  it("buildHandoverRecords の結果をそのまま要素にできる（番号＝添字）", () => {
    const records = buildHandoverRecords(
      "A-06",
      "2026",
      [event(3, "2026-07-21T01:00:00.000Z")],
      [photo("p-1", "2026-07-20")],
    );
    const content = handoverContent(records);
    expect(content.map((c) => c.text)).toStrictEqual(records.map((r) => r.text));
  });
});
