import { describe, expect, it } from "vitest";
import type { HandoverNote } from "@/types";
import type { CreateHandoverOutcome, HandoverOutcome } from "@/repositories/interfaces/i-handover-repository";
import { createHandoverOutcomeLabel, handoverOutcomeLabel } from "./handover-labels";

const note: HandoverNote = {
  fieldId: "A-06",
  season: "2026",
  records: [],
  blocks: [],
  model: "claude-sonnet-5-5",
  createdAt: "2026-07-22T00:00:00.000Z",
};

describe("handoverOutcomeLabel（読んだ結果）", () => {
  it("読めたら言葉なし、無ければ「まだ無い」、読めなければ「更新」を押す言葉", () => {
    const cases: [HandoverOutcome, string | null][] = [
      [{ kind: "ok", note }, null],
      [{ kind: "none" }, "まだ引き継ぎメモはありません"],
      [{ kind: "network-error" }, "引き継ぎメモを読めませんでした。電波のよい所で「更新」を押してください"],
      [{ kind: "error" }, "引き継ぎメモを読めませんでした。時間をおいて「更新」を押してください"],
    ];
    for (const [outcome, label] of cases) expect(handoverOutcomeLabel(outcome)).toBe(label);
  });
});

describe("createHandoverOutcomeLabel（作った結果）", () => {
  const all: CreateHandoverOutcome[] = [
    { kind: "created", note },
    { kind: "unauthorized" },
    { kind: "forbidden" },
    { kind: "not-found" },
    { kind: "no-records" },
    { kind: "usage-limit" },
    { kind: "upstream-error" },
    { kind: "disabled" },
    { kind: "network-error" },
    { kind: "error" },
  ];

  it("種類ごとの言葉", () => {
    const expected: Record<CreateHandoverOutcome["kind"], string> = {
      created: "引き継ぎメモを作りました",
      unauthorized: "メモを作るには合言葉が要ります",
      forbidden: "メモを作れるのは管理者だけです",
      "not-found": "この圃場は一覧にありません",
      "no-records": "判断や写真の記録がまだ無いので、メモを作れません",
      "usage-limit": "今日はもうメモを作れません（1日の回数の上限）。明日もう一度",
      "upstream-error": "Claude の返事を受け取れませんでした。時間をおいてもう一度",
      disabled: "いまは Claude を止めているので、メモを作れません。管理者に確かめてください",
      "network-error": "つながりませんでした。電波のよい所でもう一度",
      error: "メモを作れませんでした。時間をおいてもう一度",
    };
    for (const outcome of all) expect(createHandoverOutcomeLabel(outcome)).toBe(expected[outcome.kind]);
  });

  it("言葉は種類ごとに違い、空でない", () => {
    const labels = all.map(createHandoverOutcomeLabel);
    expect(new Set(labels).size).toBe(all.length);
    for (const label of labels) expect(label).not.toBe("");
  });
});
