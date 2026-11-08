import { describe, expect, it } from "vitest";
import { accountView, appNavHrefs, fieldDetailHref, navCurrent } from "./app-nav-view";

// みっきぃ 3（#216）: 詳細は下の帯から外し、地図の板・順番のカードから入る。帯は 地図・比較・順番 の 3 つ
describe("appNavHrefs（下の帯の 3 つ。選んだ畑を引き継ぐ、#194・#216）", () => {
  it("選んでいる畑があれば、3 つとも同じ畑へ。詳細は無い", () => {
    expect(appNavHrefs("A-03", "A-03")).toStrictEqual({
      map: "/#A-03",
      compare: "/fields/A-03#compare",
      order: "/order#A-03",
    });
  });

  it("選んでいなければ、地図と順番は畑を付けず、比較は代わりの畑（目安など）へ", () => {
    expect(appNavHrefs("A-03", null)).toStrictEqual({
      map: "/",
      compare: "/fields/A-03#compare",
      order: "/order",
    });
  });

  it("番号は URL に使える形にする", () => {
    expect(appNavHrefs("A 1", "A 1").compare).toBe("/fields/A%201#compare");
  });
});

describe("fieldDetailHref（地図の板・順番のカード・比較からの詳細の行き先、#216）", () => {
  it("/fields/<番号>", () => {
    expect(fieldDetailHref("A-03")).toBe("/fields/A-03");
    expect(fieldDetailHref("A 1")).toBe("/fields/A%201");
  });
});

describe("navCurrent（詳細・比較の画面で帯のどれを選んで見せるか、#216）", () => {
  it("詳細は帯に無いので、どれも選ばない", () => {
    expect(navCurrent("detail")).toBeNull();
  });

  it("比較は比較", () => {
    expect(navCurrent("compare")).toBe("compare");
  });
});

// 札は 1 文字の記号にせず、言葉にする（11-07 精査 6 回目 #4。REVIEW-BRIEF §5「文字を消すだけで改善したつもりにならない」）
// みっきぃ 5（#218）: 言葉に人のアイコンを添え、権限の強いほど飾る（委員長＝王冠、委員＝くわ、一般＝飾りなし）
// 11-08 本人の依頼: 合言葉を入れ直す場所。委員・委員長のどちらでも入れ直せ、入っていれば「出る」がある
describe("accountView（アカウント札とシートの言葉・アイコン、#194・#218）", () => {
  it("委員長は王冠", () => {
    expect(accountView("admin")).toStrictEqual({
      chip: "委員長",
      line: "委員長として入っています",
      isAdmin: true,
      signIn: { label: "合言葉を入れ直す", lead: "入れ直す合言葉を入れてください。委員の合言葉なら、委員として入り直します。", submit: "入り直す" },
      canSignOut: true,
      tier: "chair",
      ornament: "crown",
    });
  });

  it("委員はくわ", () => {
    expect(accountView("member")).toStrictEqual({
      chip: "委員",
      line: "委員として入っています",
      isAdmin: false,
      signIn: { label: "合言葉を入れ直す", lead: "入れ直す合言葉を入れてください。委員長の合言葉なら、委員長として入り直します。", submit: "入り直す" },
      canSignOut: true,
      tier: "member",
      ornament: "hoe",
    });
  });

  it("入っていない（一般）は飾りなしの人（押すと入れることを言う）", () => {
    expect(accountView(null)).toStrictEqual({
      chip: "入る",
      line: "入っていません",
      isAdmin: false,
      signIn: { label: "合言葉を入れる", lead: "委員か委員長の合言葉を入れてください。", submit: "入る" },
      canSignOut: false,
      tier: "guest",
      ornament: "none",
    });
  });

  it("まだ分からないときは「…」で飾りなし", () => {
    expect(accountView(undefined)).toMatchObject({ chip: "…", tier: "loading", ornament: "none", signIn: null, canSignOut: false });
  });
});
