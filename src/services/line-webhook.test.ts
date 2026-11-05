import { describe, expect, it } from "vitest";
import { joinedGroupIds } from "./line-webhook";

// 架空のグループ ID（C と 16 進 32 文字）
const GROUP_A = `C${"0123456789abcdef".repeat(2)}`;
const GROUP_B = `C${"fedcba9876543210".repeat(2)}`;

/** source を持つイベント */
function event(type: string, source: unknown): Record<string, unknown> {
  return { type, timestamp: 1, mode: "active", webhookEventId: "x", source };
}

function body(events: unknown): string {
  return JSON.stringify({ destination: "Uxxxx", events });
}

describe("joinedGroupIds", () => {
  it("グループの join から groupId を取り出す", () => {
    expect(joinedGroupIds(body([event("join", { type: "group", groupId: GROUP_A })]))).toStrictEqual([GROUP_A]);
  });

  it("複数の join は出てきた順に返す", () => {
    const text = body([
      event("join", { type: "group", groupId: GROUP_B }),
      event("join", { type: "group", groupId: GROUP_A }),
    ]);
    expect(joinedGroupIds(text)).toStrictEqual([GROUP_B, GROUP_A]);
  });

  it("同じ groupId は重ねない（最初の位置に 1 つだけ）", () => {
    const text = body([
      event("join", { type: "group", groupId: GROUP_A }),
      event("join", { type: "group", groupId: GROUP_B }),
      event("join", { type: "group", groupId: GROUP_A }),
    ]);
    expect(joinedGroupIds(text)).toStrictEqual([GROUP_A, GROUP_B]);
  });

  it("events が空なら空（LINE の接続確認）", () => {
    expect(joinedGroupIds(body([]))).toStrictEqual([]);
  });

  it.each([
    ["leave", event("leave", { type: "group", groupId: GROUP_A })],
    ["message", event("message", { type: "group", groupId: GROUP_A, userId: "Uxxxx" })],
    ["memberJoined", event("memberJoined", { type: "group", groupId: GROUP_A })],
    ["room の join", event("join", { type: "room", roomId: GROUP_A, groupId: GROUP_A })],
    ["user の join", event("join", { type: "user", userId: "Uxxxx", groupId: GROUP_A })],
  ])("%s は無視する", (_name, ev) => {
    expect(joinedGroupIds(body([ev]))).toStrictEqual([]);
  });

  it("無視するイベントが混ざっても join のグループだけ返す", () => {
    const text = body([
      event("message", { type: "group", groupId: GROUP_B }),
      event("join", { type: "group", groupId: GROUP_A }),
      event("leave", { type: "group", groupId: GROUP_B }),
    ]);
    expect(joinedGroupIds(text)).toStrictEqual([GROUP_A]);
  });

  it.each([
    ["大文字の 16 進", `C${"0123456789ABCDEF".repeat(2)}`],
    ["短い", `C${"0".repeat(31)}`],
    ["長い", `C${"0".repeat(33)}`],
    ["頭が C でない", `R${"0".repeat(32)}`],
    ["16 進でない文字", `C${"g".repeat(32)}`],
    ["前に空白", ` C${"0".repeat(32)}`],
    ["後ろに改行", `C${"0".repeat(32)}\n`],
    ["空", ""],
    ["数", 1],
    ["null", null],
  ])("groupId が %s なら捨てる", (_name, groupId) => {
    expect(joinedGroupIds(body([event("join", { type: "group", groupId })]))).toStrictEqual([]);
  });

  it("形の違う groupId は捨て、正しいものだけ残す", () => {
    const text = body([
      event("join", { type: "group", groupId: "Cxyz" }),
      event("join", { type: "group", groupId: GROUP_A }),
    ]);
    expect(joinedGroupIds(text)).toStrictEqual([GROUP_A]);
  });

  it.each([
    ["source が無い", { type: "join" }],
    ["source が null", event("join", null)],
    ["source が文字列", event("join", "group")],
    ["groupId が無い", event("join", { type: "group" })],
    ["イベントが null", null],
    ["イベントが文字列", "join"],
    ["イベントが配列", ["join"]],
  ])("%s のイベントは飛ばす", (_name, ev) => {
    const text = body([ev, event("join", { type: "group", groupId: GROUP_A })]);
    expect(joinedGroupIds(text)).toStrictEqual([GROUP_A]);
  });

  it.each([
    ["空", ""],
    ["壊れた JSON", '{"events":['],
    ["配列", "[]"],
    ["null", "null"],
    ["文字列", '"join"'],
    ["数", "1"],
    ["events が無い", "{}"],
    ["events がオブジェクト", '{"events":{}}'],
    ["events が null", '{"events":null}'],
    ["events が文字列", '{"events":"join"}'],
  ])("本文が %s なら空（例外を出さない）", (_name, text) => {
    expect(joinedGroupIds(text)).toStrictEqual([]);
  });

  it("__proto__ の events は見ない（自分のキーだけ）", () => {
    const text = `{"__proto__":{"events":[${JSON.stringify(event("join", { type: "group", groupId: GROUP_A }))}]}}`;
    expect(joinedGroupIds(text)).toStrictEqual([]);
  });
});
