import { describe, expect, it } from "vitest";
import type { FieldSummary, StatusEvent } from "@/types";
import { STATUS_NOTE_MAX_CHARS, STATUS_REASONS, STATUS_REF_PHOTOS_MAX } from "@/config";
import type { StatusInputReason } from "./status-reason";
import type { PostStatusOutcome, RevokeOutcome } from "@/repositories/interfaces/i-field-status-repository";
import {
  canSubmitStatus,
  inputErrorLabel,
  jstDateTimeLabel,
  noteCountLabel,
  pinState,
  postOutcomeLabel,
  reasonsLabel,
  refRequiredNote,
  revokeOutcomeLabel,
  statusLabel,
  toggleRefPhoto,
  withLocalChanges,
  withStatusEvent,
  type LocalStatusChange,
} from "./status-view";

function event(change: Partial<StatusEvent> = {}): StatusEvent {
  return {
    id: 1,
    fieldId: "A-06",
    status: "ready",
    reasons: [],
    note: null,
    refPhotoIds: [],
    actorDevice: "d1",
    at: "2026-07-21T01:00:00.000Z",
    revokedAt: null,
    ...change,
  };
}

describe("statusLabel・reasonsLabel（L1）", () => {
  it("ready は収穫可能、done は収穫済", () => {
    expect(statusLabel("ready")).toBe("収穫可能");
    expect(statusLabel("done")).toBe("収穫済");
  });

  it("理由は選択肢の言葉を「・」でつなぐ（入力の順のまま）", () => {
    expect(reasonsLabel(["yellow_ratio", "ear_color"])).toBe("黄色い穂の割合・穂の色");
    for (const reason of STATUS_REASONS) expect(reasonsLabel([reason.code])).toBe(reason.label);
  });

  it("理由が 0 個なら「理由の記録なし」", () => {
    expect(reasonsLabel([])).toBe("理由の記録なし");
  });

  it("知らないコードは隠さずにそのまま出す（選択肢を変えた後の古い記録）", () => {
    expect(reasonsLabel(["ear_color", "grain_hardness"])).toBe("穂の色・grain_hardness");
  });
});

describe("inputErrorLabel（送る前の確かめ）", () => {
  const all: StatusInputReason[] = [
    "not_object",
    "unknown_key",
    "bad_status",
    "bad_reasons",
    "unknown_reason",
    "duplicate_reason",
    "bad_note",
    "note_too_long",
    "bad_ref_photos",
    "too_many_ref_photos",
    "duplicate_ref_photo",
    "ref_photo_not_in_field",
  ];

  it("どの理由にも空でない言葉がある", () => {
    for (const reason of all) expect(inputErrorLabel(reason)).not.toBe("");
  });

  it("人が直せる誤りは、何を直すかが分かる言葉（上限は config の値）", () => {
    expect(inputErrorLabel("bad_status")).toContain("収穫可能");
    expect(inputErrorLabel("note_too_long")).toContain(`${STATUS_NOTE_MAX_CHARS}字`);
    expect(inputErrorLabel("too_many_ref_photos")).toContain(`${STATUS_REF_PHOTOS_MAX}枚`);
    expect(inputErrorLabel("ref_photo_not_in_field")).toContain("この圃場");
  });

  it("人が直せる 4 つの言葉はそれぞれ違う", () => {
    const labels = (["bad_status", "note_too_long", "too_many_ref_photos", "ref_photo_not_in_field"] as const).map(
      inputErrorLabel,
    );
    expect(new Set(labels).size).toBe(4);
  });
});

describe("postOutcomeLabel・revokeOutcomeLabel", () => {
  it("送った結果の言葉", () => {
    expect(postOutcomeLabel({ kind: "created", event: event() })).toBe("記録しました");
    expect(postOutcomeLabel({ kind: "unauthorized" })).toBe("記録するには合言葉が要ります");
    expect(postOutcomeLabel({ kind: "rejected", reason: "ref_photo_not_in_field" })).toBe(
      "記録できませんでした。選んだ内容を確かめてください",
    );
    expect(postOutcomeLabel({ kind: "network-error" })).toBe("つながりませんでした。電波のよい所でもう一度");
    expect(postOutcomeLabel({ kind: "error" })).toBe("記録できませんでした。時間をおいてもう一度");
  });

  it("取り消した結果の言葉。無い・取り消し済みは「もう取り消されています」", () => {
    const outcomes: [RevokeOutcome, string][] = [
      [{ kind: "ok", event: event({ revokedAt: "2026-07-22T00:00:00.000Z" }) }, "取り消しました"],
      [{ kind: "unauthorized" }, "取り消すには合言葉が要ります"],
      [{ kind: "not-found" }, "もう取り消されています"],
      [{ kind: "network-error" }, "つながりませんでした。電波のよい所でもう一度"],
      [{ kind: "error" }, "取り消せませんでした。時間をおいてもう一度"],
    ];
    for (const [outcome, label] of outcomes) expect(revokeOutcomeLabel(outcome)).toBe(label);
  });

  it("送った結果の言葉は種類ごとに違う", () => {
    const outcomes: PostStatusOutcome[] = [
      { kind: "created", event: event() },
      { kind: "unauthorized" },
      { kind: "rejected", reason: null },
      { kind: "network-error" },
      { kind: "error" },
    ];
    expect(new Set(outcomes.map(postOutcomeLabel)).size).toBe(outcomes.length);
  });
});

describe("toggleRefPhoto（根拠の写真の選び方）", () => {
  it("選んでいなければ末尾に足し、選んでいれば外す", () => {
    expect(toggleRefPhoto(["p1"], "p2", 5)).toStrictEqual({ selected: ["p1", "p2"], limited: false });
    expect(toggleRefPhoto(["p1", "p2", "p3"], "p2", 5)).toStrictEqual({ selected: ["p1", "p3"], limited: false });
  });

  it("上限ちょうどまで足せ、上限に達していたら足さずに limited", () => {
    expect(toggleRefPhoto(["a", "b", "c", "d"], "e", 5)).toStrictEqual({
      selected: ["a", "b", "c", "d", "e"],
      limited: false,
    });
    expect(toggleRefPhoto(["a", "b", "c", "d", "e"], "f", 5)).toStrictEqual({
      selected: ["a", "b", "c", "d", "e"],
      limited: true,
    });
  });

  it("上限に達していても、選んだものは外せる", () => {
    expect(toggleRefPhoto(["a", "b"], "a", 2)).toStrictEqual({ selected: ["b"], limited: false });
  });

  it("上限は引数に従う", () => {
    expect(toggleRefPhoto(["a", "b"], "c", 2).limited).toBe(true);
    expect(toggleRefPhoto(["a", "b"], "c", 3).limited).toBe(false);
  });

  it("元の配列を変えない（上限で足せなかったときも写しを返す）", () => {
    const selected = ["p1"];
    const result = toggleRefPhoto(selected, "p2", 5);
    expect(selected).toStrictEqual(["p1"]);
    expect(result.selected).not.toBe(selected);
    const full = ["a", "b"];
    expect(toggleRefPhoto(full, "c", 2).selected).not.toBe(full);
  });
});

describe("withStatusEvent（履歴に入れる）", () => {
  it("新しい判断を、at の新しい順の正しい位置に入れる", () => {
    const history = [event({ id: 3, at: "2026-07-23T00:00:00.000Z" }), event({ id: 1, at: "2026-07-20T00:00:00.000Z" })];
    const added = withStatusEvent(history, event({ id: 2, at: "2026-07-21T00:00:00.000Z" }));
    expect(added.map((e) => e.id)).toStrictEqual([3, 2, 1]);
  });

  it("同じ at なら id の大きい順", () => {
    const at = "2026-07-21T00:00:00.000Z";
    const added = withStatusEvent([event({ id: 4, at }), event({ id: 2, at })], event({ id: 3, at }));
    expect(added.map((e) => e.id)).toStrictEqual([4, 3, 2]);
  });

  it("同じ id は置き換える（取り消した判断が返ってきたとき）", () => {
    const revoked = event({ id: 1, revokedAt: "2026-07-22T00:00:00.000Z" });
    const result = withStatusEvent([event({ id: 2, at: "2026-07-25T00:00:00.000Z" }), event({ id: 1 })], revoked);
    expect(result).toHaveLength(2);
    expect(result[1]).toBe(revoked);
  });

  it("元の配列を変えない", () => {
    const history = [event({ id: 1 })];
    const result = withStatusEvent(history, event({ id: 2, at: "2026-08-01T00:00:00.000Z" }));
    expect(history.map((e) => e.id)).toStrictEqual([1]);
    expect(result).not.toBe(history);
  });
});

describe("withLocalChanges（遅れて届いた履歴に、手元の変更を重ねる）", () => {
  const at1 = "2026-07-20T00:00:00.000Z";
  const at2 = "2026-07-21T00:00:00.000Z";
  const at3 = "2026-07-22T00:00:00.000Z";
  const server = [event({ id: 2, at: at2 }), event({ id: 1, at: at1 })];
  const change = (stamp: number, e: StatusEvent): LocalStatusChange => ({ stamp, event: e });

  it("手元の変更が無ければ、読んだ履歴のまま", () => {
    expect(withLocalChanges(server, [], 0)).toStrictEqual(server);
  });

  it("読み込みの後に送った判断は、読んだ履歴に無くても入る（正しい位置に）", () => {
    const sent = event({ id: 3, at: at3 });
    expect(withLocalChanges(server, [change(1, sent)], 0).map((e) => e.id)).toStrictEqual([3, 2, 1]);
  });

  it("読み込みの後に取り消した判断は、取り消した形に置き換わる", () => {
    const revoked = event({ id: 1, at: at1, revokedAt: at3 });
    const result = withLocalChanges(server, [change(5, revoked)], 4);
    expect(result).toHaveLength(2);
    expect(result[1]).toBe(revoked);
  });

  it("読み込みを始める前（stamp が since 以下）の変更は重ねない（読んだ履歴が新しい）", () => {
    const old = event({ id: 1, at: at1, note: "古い" });
    const sent = event({ id: 9, at: at3 });
    expect(withLocalChanges(server, [change(3, old), change(4, sent)], 4)).toStrictEqual(server);
    expect(withLocalChanges(server, [change(3, old)], 2)[1].note).toBe("古い");
  });

  it("同じ判断の変更が続いたら、stamp の大きい方が残る（配列の順によらない）", () => {
    const sent = event({ id: 3, at: at3 });
    const revoked = event({ id: 3, at: at3, revokedAt: "2026-07-23T00:00:00.000Z" });
    for (const changes of [
      [change(1, sent), change(2, revoked)],
      [change(2, revoked), change(1, sent)],
    ]) {
      const result = withLocalChanges(server, changes, 0);
      expect(result.map((e) => e.id)).toStrictEqual([3, 2, 1]);
      expect(result[0]).toBe(revoked);
    }
  });

  it("読んだ履歴で取り消し済みなら、手元の取り消し前の形で戻さない（取り消しは戻らない）", () => {
    // 読み込みを始める → 手元で送る → 別の端末が取り消す → サーバーが答える、の順
    const sent = event({ id: 3, at: at3 });
    const revokedOnServer = event({ id: 3, at: at3, revokedAt: "2026-07-23T00:00:00.000Z" });
    const result = withLocalChanges([revokedOnServer, ...server], [change(1, sent)], 0);
    expect(result.map((e) => e.id)).toStrictEqual([3, 2, 1]);
    expect(result[0]).toBe(revokedOnServer);
  });

  it("どちらも取り消し済みなら手元の形、手元だけ取り消し済みなら手元の形", () => {
    const serverRevoked = event({ id: 1, at: at1, revokedAt: "2026-07-23T00:00:00.000Z" });
    const localRevoked = event({ id: 1, at: at1, revokedAt: "2026-07-24T00:00:00.000Z" });
    expect(withLocalChanges([serverRevoked], [change(1, localRevoked)], 0)[0]).toBe(localRevoked);
    expect(withLocalChanges([event({ id: 1, at: at1 })], [change(1, localRevoked)], 0)[0]).toBe(localRevoked);
  });

  it("取り消し済み同士でも、stamp の大きい方が残る（配列の順によらない）", () => {
    const first = event({ id: 1, at: at1, revokedAt: "2026-07-23T00:00:00.000Z" });
    const second = event({ id: 1, at: at1, revokedAt: "2026-07-24T00:00:00.000Z" });
    for (const changes of [
      [change(1, first), change(2, second)],
      [change(2, second), change(1, first)],
    ]) {
      expect(withLocalChanges(server, changes, 0)[1]).toBe(second);
    }
  });

  it("読んだ履歴が空でも、手元の変更は入る", () => {
    const sent = event({ id: 3, at: at3 });
    expect(withLocalChanges([], [change(1, sent)], 0)).toStrictEqual([sent]);
  });

  it("元の配列を変えない", () => {
    const events = [...server];
    const changes = [change(2, event({ id: 3, at: at3 })), change(1, event({ id: 4, at: at3 }))];
    const changesCopy = [...changes];
    const result = withLocalChanges(events, changes, 0);
    expect(events).toStrictEqual(server);
    expect(changes).toStrictEqual(changesCopy);
    expect(withLocalChanges(events, [], 0)).not.toBe(events);
    expect(result).not.toBe(events);
  });
});

describe("jstDateTimeLabel（判断の時刻）", () => {
  it("日本時間の「月/日 時:分」。月・日・時に 0 を付けず、分は 2 桁", () => {
    expect(jstDateTimeLabel("2026-07-21T01:05:00.000Z")).toBe("7/21 10:05");
    expect(jstDateTimeLabel("2026-11-03T14:59:00.000Z")).toBe("11/3 23:59");
  });

  it("日本時間で日付が変わる時刻は次の日の 0 時", () => {
    expect(jstDateTimeLabel("2026-07-20T15:30:00.000Z")).toBe("7/21 0:30");
    expect(jstDateTimeLabel("2026-12-31T15:00:00.000Z")).toBe("1/1 0:00");
  });

  it("読めない時刻は「日時不明」", () => {
    expect(jstDateTimeLabel("")).toBe("日時不明");
    expect(jstDateTimeLabel("きのう")).toBe("日時不明");
  });
});

describe("noteCountLabel（メモの字数）", () => {
  it("前後の空白を除いた文字の数と上限（config の値）", () => {
    expect(noteCountLabel("")).toBe(`0/${STATUS_NOTE_MAX_CHARS}字`);
    expect(noteCountLabel("  穂が黄色い　")).toBe(`5/${STATUS_NOTE_MAX_CHARS}字`);
  });

  it("絵文字などは 1 字に数える（送る前の確かめと同じ）", () => {
    expect(noteCountLabel("🌾🌾a")).toBe(`3/${STATUS_NOTE_MAX_CHARS}字`);
  });
});

describe("pinState（地図のピン）", () => {
  const summary = (change: Partial<FieldSummary> = {}): FieldSummary => ({
    fieldId: "A-06",
    latest: null,
    hasUnconfirmed: false,
    ...change,
  });

  it("判断が無ければ none、あれば最新の判断の状態", () => {
    expect(pinState(summary())).toStrictEqual({ status: "none", unconfirmed: false });
    expect(pinState(summary({ latest: event({ status: "ready" }) })).status).toBe("ready");
    expect(pinState(summary({ latest: event({ status: "done" }) })).status).toBe("done");
  });

  it("未確定の写真の印はまとめのとおり", () => {
    expect(pinState(summary({ hasUnconfirmed: true }))).toStrictEqual({ status: "none", unconfirmed: true });
    expect(pinState(summary({ latest: event({ status: "done" }), hasUnconfirmed: true }))).toStrictEqual({
      status: "done",
      unconfirmed: true,
    });
  });
});

/**
 * 「記録する」を押せる条件（Issue #182）。判断を選んでいて、根拠の写真が 1 枚以上。
 * ただしこの畑に確定済みの写真が 1 枚も無いときは選べないので、根拠なしで押せる（写真が無い畑にも判断を残せるように）
 */
describe("canSubmitStatus（記録するを押せるか）", () => {
  it("判断を選んでいなければ押せない", () => {
    expect(canSubmitStatus({ status: null, refCount: 2, selectablePhotoCount: 3 })).toBe(false);
  });

  it("写真があるのに根拠が 0 枚なら押せない", () => {
    expect(canSubmitStatus({ status: "ready", refCount: 0, selectablePhotoCount: 3 })).toBe(false);
    expect(canSubmitStatus({ status: "done", refCount: 0, selectablePhotoCount: 1 })).toBe(false);
  });

  it("根拠を 1 枚でも選べば押せる", () => {
    expect(canSubmitStatus({ status: "ready", refCount: 1, selectablePhotoCount: 3 })).toBe(true);
    expect(canSubmitStatus({ status: "done", refCount: STATUS_REF_PHOTOS_MAX, selectablePhotoCount: 9 })).toBe(true);
  });

  it("確定済みの写真が 1 枚も無い畑は、根拠なしで押せる", () => {
    expect(canSubmitStatus({ status: "ready", refCount: 0, selectablePhotoCount: 0 })).toBe(true);
  });

  it("写真が無い畑でも、判断を選んでいなければ押せない", () => {
    expect(canSubmitStatus({ status: null, refCount: 0, selectablePhotoCount: 0 })).toBe(false);
  });
});

describe("refRequiredNote（押せない理由）", () => {
  it("判断を選んだのに根拠が無く、選べる写真があるときだけ、理由を出す", () => {
    expect(refRequiredNote({ status: "ready", refCount: 0, selectablePhotoCount: 3 })).toBe(
      "根拠の写真を 1 枚以上、下の写真から選んでください",
    );
  });

  it.each([
    [{ status: null, refCount: 0, selectablePhotoCount: 3 }],
    [{ status: "ready" as const, refCount: 1, selectablePhotoCount: 3 }],
    [{ status: "ready" as const, refCount: 0, selectablePhotoCount: 0 }],
  ])("それ以外は出さない（%j）", (input) => {
    expect(refRequiredNote(input)).toBeNull();
  });
});
