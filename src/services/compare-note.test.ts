import { describe, expect, it } from "vitest";
import { sameDayEmptyNote } from "./compare-note";

// 見比べるの「同じ日に撮った別の畑と」で、相手の写真が無いときの一文（11-06 地図の精査 #5）。
// 目安の畑と見比べに来たのに、目安の畑の名前が出ないと、何と比べたかったのかを見失う
describe("sameDayEmptyNote（同じ日に撮った別の畑が無いとき）", () => {
  it("目安の畑に確定した写真が 1 枚も無ければ、目安の畑の番号を出してそう言う", () => {
    expect(sameDayEmptyNote({ dateLabel: "7/21", selfId: "A-06", benchmarkId: "A-07", benchmarkHasPhotos: false })).toBe(
      "目安の畑 A-07 には、まだ確定した写真がありません",
    );
  });

  it("目安の畑に写真はあるがその日には無ければ、日と目安の畑の番号を出す", () => {
    expect(sameDayEmptyNote({ dateLabel: "7/21", selfId: "A-06", benchmarkId: "A-07", benchmarkHasPhotos: true })).toBe(
      "7/21 に撮った目安の畑 A-07 の写真はありません（同じ日に撮った写真どうしで比べます）",
    );
  });

  it("目安が無い・自分が目安のときは、今までどおり別の畑の写真が無いと言う", () => {
    expect(sameDayEmptyNote({ dateLabel: "7/21", selfId: "A-07", benchmarkId: "A-07", benchmarkHasPhotos: true })).toBe("7/21 に撮った別の畑の写真はありません");
    expect(sameDayEmptyNote({ dateLabel: "7/21", selfId: "A-06", benchmarkId: null, benchmarkHasPhotos: false })).toBe("7/21 に撮った別の畑の写真はありません");
  });

  it("日が分からなければ「この日」と言う", () => {
    expect(sameDayEmptyNote({ dateLabel: null, selfId: "A-07", benchmarkId: null, benchmarkHasPhotos: false })).toBe("この日 に撮った別の畑の写真はありません");
  });
});
