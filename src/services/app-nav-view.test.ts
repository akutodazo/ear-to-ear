import { describe, expect, it } from "vitest";
import { accountView, appNavHrefs } from "./app-nav-view";

describe("appNavHrefs（下の帯の 4 つ。選んだ畑を引き継ぐ、#194）", () => {
  it("選んでいる畑があれば、4 つとも同じ畑へ", () => {
    expect(appNavHrefs("A-03", "A-03")).toStrictEqual({
      map: "/#A-03",
      detail: "/fields/A-03",
      compare: "/fields/A-03#compare",
      order: "/order#A-03",
    });
  });

  it("選んでいなければ、地図と順番は畑を付けず、詳細と比較は代わりの畑（目安など）へ", () => {
    expect(appNavHrefs("A-03", null)).toStrictEqual({
      map: "/",
      detail: "/fields/A-03",
      compare: "/fields/A-03#compare",
      order: "/order",
    });
  });

  it("番号は URL に使える形にする", () => {
    expect(appNavHrefs("A 1", "A 1").detail).toBe("/fields/A%201");
  });
});

// 札は 1 文字の記号にせず、言葉にする（11-07 精査 6 回目 #4。REVIEW-BRIEF §5「文字を消すだけで改善したつもりにならない」）
describe("accountView（アカウント札とシートの言葉、#194）", () => {
  it("委員長", () => {
    expect(accountView("admin")).toStrictEqual({ chip: "委員長", line: "委員長として入っています", isAdmin: true, canSignInAsChair: false });
  });

  it("委員", () => {
    expect(accountView("member")).toStrictEqual({ chip: "委員", line: "委員として入っています", isAdmin: false, canSignInAsChair: true });
  });

  it("入っていない・まだ分からない（入っていないときは、押すと入れることを言う）", () => {
    expect(accountView(null)).toStrictEqual({ chip: "入る", line: "入っていません", isAdmin: false, canSignInAsChair: true });
    expect(accountView(undefined).chip).toBe("…");
  });
});
