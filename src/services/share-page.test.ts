import { describe, expect, it } from "vitest";
import type { Field } from "@/types";
import { escapeHtml, sharePageHtml, type SharePageInput } from "./share-page";

const FIELDS: Record<string, Field> = {
  "A-01": { id: "A-01", name: "北の1", lat: 43.24, lng: 141.75, district: "北地区" },
  "A-02": { id: "A-02", name: "北の2", lat: 43.24, lng: 141.75, district: "北地区" },
};

const INPUT: SharePageInput = {
  id: "00000000-0000-4000-8000-000000000001",
  origin: "https://example.test",
  district: "北地区",
  confirmedAt: "2026-11-06T03:00:00.000Z",
  ranked: ["A-02", "A-01"],
  benchmarkId: "A-01",
  width: 1080,
  height: 1200,
  fieldsById: FIELDS,
};

function meta(html: string, property: string): string | null {
  const m = html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)">`));
  return m === null ? null : m[1];
}

describe("sharePageHtml の OGP", () => {
  it("og:title は絵の見出しと同じ", () => {
    expect(meta(sharePageHtml(INPUT), "og:title")).toBe("北地区 刈る順番 11/6 確定");
  });

  it("og:image・og:url は要求の origin の絶対 URL", () => {
    const html = sharePageHtml(INPUT);
    expect(meta(html, "og:image")).toBe(`https://example.test/api/share-files/${INPUT.id}`);
    expect(meta(html, "og:url")).toBe(`https://example.test/api/shares/${INPUT.id}`);
  });

  it("og:image の幅・高さ・型", () => {
    const html = sharePageHtml(INPUT);
    expect(meta(html, "og:image:width")).toBe("1080");
    expect(meta(html, "og:image:height")).toBe("1200");
    expect(meta(html, "og:image:type")).toBe("image/jpeg");
    expect(meta(html, "og:type")).toBe("website");
  });

  it("og:description は順を 1 行にまとめる（目安の印つき）", () => {
    expect(meta(sharePageHtml(INPUT), "og:description")).toBe("1. A-02 北の2 2. A-01 北の1（目安） この順にするよ");
  });

  it("og:description は 200 文字で切る", () => {
    const many: Record<string, Field> = {};
    const ranked: string[] = [];
    for (let i = 1; i <= 40; i++) {
      const id = `A-${String(i).padStart(2, "0")}`;
      many[id] = { id, name: `とても長い畑の名前その${i}`, lat: 0, lng: 0, district: "北地区" };
      ranked.push(id);
    }
    const description = meta(sharePageHtml({ ...INPUT, ranked, fieldsById: many, benchmarkId: null }), "og:description");
    expect(description).not.toBeNull();
    expect([...(description ?? "")].length).toBeLessThanOrEqual(200);
  });

  it("検索に出さない（robots noindex）", () => {
    expect(meta(sharePageHtml(INPUT), "robots")).toBe("noindex, nofollow");
  });

  it("本文に絵・文・出典・架空の注記・画面への道", () => {
    const html = sharePageHtml(INPUT);
    expect(html).toContain(`<img src="/api/share-files/${INPUT.id}"`);
    expect(html).toContain("1. A-02 北の2\n2. A-01 北の1（目安）");
    expect(html).toContain("地理院タイル");
    expect(html).toContain("架空");
    expect(html).toContain('href="/order"');
  });
});

describe("エスケープ", () => {
  it("escapeHtml は & < > \" ' を直す", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("畑の名前・地区に記号があっても、属性と本文を壊さない", () => {
    const evil: Record<string, Field> = {
      "A-01": { id: "A-01", name: `"><script>x</script>`, lat: 0, lng: 0, district: `北"&<` },
    };
    const html = sharePageHtml({ ...INPUT, district: `北"&<`, ranked: ["A-01"], benchmarkId: null, fieldsById: evil });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("北&quot;&amp;&lt;");
  });
});
