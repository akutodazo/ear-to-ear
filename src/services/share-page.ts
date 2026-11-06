/**
 * LINE に 1 枚の共有ページ（#160）。LINE のサーバーが読む OGP（og:image でサムネイル）と、人が開いたときの本文の HTML。純粋関数。
 * 文は order-message と同じもの（端末の文と食い違わない）。端末 ID・座標は入れない（K6）
 */
import type { Field } from "@/types";
import { orderImageTitle, orderMessageText } from "./order-message";

export interface SharePageInput {
  id: string;
  /** 要求の origin（https://…）。og:image は絶対 URL が要る */
  origin: string;
  district: string;
  confirmedAt: string;
  ranked: readonly string[];
  benchmarkId: string | null;
  width: number;
  height: number;
  fieldsById: Record<string, Field>;
}

const DESCRIPTION_MAX_CHARS = 200;

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clip(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("")}…`;
}

export function sharePageHtml(input: SharePageInput): string {
  const { id, origin } = input;
  const title = orderImageTitle(input.district, input.confirmedAt);
  const text = orderMessageText({
    district: input.district,
    confirmedAt: input.confirmedAt,
    ranked: input.ranked,
    fieldsById: input.fieldsById,
    benchmarkId: input.benchmarkId,
  });
  // 1 行目（見出し）は og:title と同じなので外し、残りを 1 行に
  const description = clip(text.split("\n").slice(1).join(" "), DESCRIPTION_MAX_CHARS);
  const pageUrl = `${origin}/api/shares/${encodeURIComponent(id)}`;
  const imagePath = `/api/share-files/${encodeURIComponent(id)}`;
  const e = escapeHtml;
  const metaTag = (attr: "property" | "name", key: string, value: string) => `<meta ${attr}="${key}" content="${e(value)}">`;
  return [
    "<!doctype html>",
    '<html lang="ja"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    metaTag("name", "robots", "noindex, nofollow"),
    `<title>${e(title)} — ear-to-ear</title>`,
    metaTag("property", "og:type", "website"),
    metaTag("property", "og:site_name", "ear-to-ear"),
    metaTag("property", "og:title", title),
    metaTag("property", "og:description", description),
    metaTag("property", "og:url", pageUrl),
    metaTag("property", "og:image", `${origin}${imagePath}`),
    metaTag("property", "og:image:type", "image/jpeg"),
    metaTag("property", "og:image:width", String(input.width)),
    metaTag("property", "og:image:height", String(input.height)),
    metaTag("property", "og:image:alt", "確定した刈る順番の地図 1 枚"),
    "<style>body{margin:0 auto;max-width:640px;padding:16px;font-family:sans-serif}img{width:100%;height:auto}pre{white-space:pre-wrap;font:inherit}</style>",
    "</head><body>",
    `<h1>${e(title)}</h1>`,
    `<img src="${imagePath}" alt="確定した刈る順番の地図 1 枚" width="${input.width}" height="${input.height}">`,
    `<pre>${e(text)}</pre>`,
    "<p>地図: 地理院タイル（国土地理院）。区画・番号・順番は架空のもの</p>",
    '<p><a href="/order">刈る順番の画面へ</a></p>',
    "</body></html>",
  ].join("\n");
}
