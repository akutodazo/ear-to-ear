import { describe, expect, it } from "vitest";
import type { Field } from "@/types";
import { orderMessageText, orderImageTitle } from "./order-message";

// LINE に送る順番の文（11-05、4 段目）。委員長が確定した順を「この順にするよ」の形で。推測の言葉は入れない
const f = (id: string, name: string): Field => ({ id, name, lat: 43.24, lng: 141.75, district: "北地区" });
const fieldsById = { "A-01": f("A-01", "北の1"), "A-03": f("A-03", "北の3"), "A-04": f("A-04", "北の4") };

describe("orderMessageText（LINE に送る文）", () => {
  it("地区・確定した日（日本時間）・番号と名前を上から。目安には印。最後に「この順にするよ」", () => {
    const text = orderMessageText({ district: "北地区", confirmedAt: "2026-07-21T20:30:00.000Z", ranked: ["A-04", "A-03", "A-01"], fieldsById, benchmarkId: "A-03" });
    expect(text).toBe(["北地区の刈る順番（7/22 確定）", "1. A-04 北の4", "2. A-03 北の3（目安）", "3. A-01 北の1", "この順にするよ"].join("\n"));
  });

  it("URL があれば最後の行に足す", () => {
    const text = orderMessageText({ district: "北地区", confirmedAt: "2026-07-22T01:00:00.000Z", ranked: ["A-04"], fieldsById, benchmarkId: null, url: "https://example.test/order#A-04" });
    expect(text.split("\n").at(-1)).toBe("https://example.test/order#A-04");
  });

  it("一覧に無い番号は番号だけ。順位が無ければ、無いと言う", () => {
    expect(orderMessageText({ district: "北地区", confirmedAt: "2026-07-22T01:00:00.000Z", ranked: ["A-09"], fieldsById, benchmarkId: null }).split("\n")[1]).toBe("1. A-09");
    expect(orderMessageText({ district: "北地区", confirmedAt: "2026-07-22T01:00:00.000Z", ranked: [], fieldsById, benchmarkId: null })).toBe("北地区の刈る順番（7/22 確定）\n順位を付けた畑はまだありません");
  });

  it("推測の言葉を出さない", () => {
    const text = orderMessageText({ district: "北地区", confirmedAt: "2026-07-22T01:00:00.000Z", ranked: ["A-04", "A-03"], fieldsById, benchmarkId: "A-03" });
    expect(text).not.toMatch(/予定|そう|見込み|成熟|水分|日後|日前/);
  });

  it("絵の見出しは「北地区 刈る順番 7/22 確定」", () => {
    expect(orderImageTitle("北地区", "2026-07-21T20:30:00.000Z")).toBe("北地区 刈る順番 7/22 確定");
  });
});
