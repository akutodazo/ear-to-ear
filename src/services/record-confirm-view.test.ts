// みっきぃ 6（#219）: 「記録する」の前に確かめるシート。LINE に送られるのと同じ内容を見せる（純粋関数）
import { describe, expect, it } from "vitest";
import type { StatusEvent } from "@/types";
import { lineNoticeText } from "./line-notice";
import { RECORD_CONFIRM_URL_NOTE, recordConfirmView } from "./record-confirm-view";

const NOW_MS = Date.parse("2026-07-21T01:00:00.000Z");
const DRAFT = { status: "ready" as const, reasons: ["ear_color" as const], note: "南側が先に黄色い", refPhotoIds: ["p-1", "p-2"] };

function asEvent(draft: typeof DRAFT): StatusEvent {
  return {
    id: 1,
    fieldId: "A-03",
    status: draft.status,
    reasons: draft.reasons,
    note: draft.note,
    refPhotoIds: draft.refPhotoIds,
    actorDevice: "x",
    at: new Date(NOW_MS).toISOString(),
    revokedAt: null,
  };
}

describe("recordConfirmView", () => {
  it("はじめの 3 行は LINE の本文と同じ（番号と状態・理由・日時）", () => {
    const view = recordConfirmView({ fieldId: "A-03", draft: DRAFT, nowMs: NOW_MS });
    const line = lineNoticeText(asEvent(DRAFT), "recorded", "URL").split("\n");
    expect(view?.lines).toStrictEqual(line.slice(0, 3));
    expect(view?.lines[0]).toBe("A-03 収穫可能");
    expect(view?.lines[2]).toBe("7/21 10:00");
  });

  it("URL は記録の後に決まるので、代わりの一言", () => {
    const view = recordConfirmView({ fieldId: "A-03", draft: DRAFT, nowMs: NOW_MS });
    expect(view?.urlNote).toBe(RECORD_CONFIRM_URL_NOTE);
  });

  it("理由が無ければ「理由: 記録なし」", () => {
    const view = recordConfirmView({ fieldId: "A-03", draft: { ...DRAFT, reasons: [] }, nowMs: NOW_MS });
    expect(view?.lines[1]).toBe("理由: 記録なし");
  });

  it("メモは載せない（LINE に出ないので）", () => {
    const view = recordConfirmView({ fieldId: "A-03", draft: DRAFT, nowMs: NOW_MS });
    expect(view?.lines.join("\n")).not.toContain("南側");
  });

  it("サムネイルは根拠の写真の 1 枚目。無ければ null", () => {
    expect(recordConfirmView({ fieldId: "A-03", draft: DRAFT, nowMs: NOW_MS })?.thumbnailPhotoId).toBe("p-1");
    expect(recordConfirmView({ fieldId: "A-03", draft: { ...DRAFT, refPhotoIds: [] }, nowMs: NOW_MS })?.thumbnailPhotoId).toBeNull();
  });

  it("判断を選んでいなければ null（シートを出さない）", () => {
    expect(recordConfirmView({ fieldId: "A-03", draft: { ...DRAFT, status: null }, nowMs: NOW_MS })).toBeNull();
  });
});
