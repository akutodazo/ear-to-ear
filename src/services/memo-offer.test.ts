import { describe, expect, it } from "vitest";
import { memoOfferLabel } from "./memo-offer";

// 判断を残した直後に、引き継ぎメモを作るボタンを出す（11-06 本人の指示: メモを作る所が分かりにくい）。純粋関数
describe("memoOfferLabel（判断を記録した直後の、メモを作る誘い）", () => {
  it("記録した直後で、まだ押していなければ出す。メモが無ければ「作る」", () => {
    expect(memoOfferLabel({ recorded: true, asked: false, hasMemo: false })).toBe("この判断で引き継ぎメモを作る（管理者）");
  });

  it("メモがもうあれば「作り直す」", () => {
    expect(memoOfferLabel({ recorded: true, asked: false, hasMemo: true })).toBe("この判断で引き継ぎメモを作り直す（管理者）");
  });

  it("記録していない・一度押した後は出さない（null）", () => {
    expect(memoOfferLabel({ recorded: false, asked: false, hasMemo: false })).toBeNull();
    expect(memoOfferLabel({ recorded: false, asked: false, hasMemo: true })).toBeNull();
    expect(memoOfferLabel({ recorded: true, asked: true, hasMemo: false })).toBeNull();
    expect(memoOfferLabel({ recorded: true, asked: true, hasMemo: true })).toBeNull();
  });
});
