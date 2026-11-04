import { describe, expect, it } from "vitest";
import type { LoginOutcome } from "@/repositories/interfaces/i-photo-repository";
import { loginOutcomeLabel } from "./login-label";

describe("loginOutcomeLabel（合言葉で入った結果）", () => {
  it("入れたら言葉なし、それ以外は種類ごとの言葉（L0 からの文言のまま）", () => {
    const cases: [LoginOutcome, string | null][] = [
      ["ok", null],
      ["wrong", "合言葉が違います"],
      ["too-many", "何度も間違えたので、10分ほどおいてからもう一度"],
      ["network-error", "つながりませんでした。電波のよい所でもう一度"],
      ["error", "うまくいきませんでした。時間をおいてもう一度"],
    ];
    for (const [outcome, label] of cases) expect(loginOutcomeLabel(outcome)).toBe(label);
  });
});
