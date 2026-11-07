/**
 * 判断ごとの OGP ページ（みっきぃ 7、#220）。LINE の判断の通知をサムネイル付きにするため、通知の URL をこのページにする。純粋関数。
 * 載せるのは番号・名前・状態・理由の言葉・日本時間・根拠の写真 1 枚（合言葉なしで配っている写真）だけ。
 * メモ（自由文）・端末・ほかの根拠は載せない（LINE の本文と同じ範囲、docs/privacy.md）
 */
import type { StatusEvent } from "@/types";
import { escapeHtml } from "./share-page";
import { noticeReasons } from "./line-notice";
import { jstDateTimeLabel, statusLabel } from "./status-view";

/** 記録は /api/judgments/<id>、取り消しは ?revoked=1 を付けた別の URL（LINE はプレビューを URL ごとに覚えるため） */
export function judgmentUrl(origin: string, eventId: number, kind: "recorded" | "revoked"): string {
  const url = `${origin}/api/judgments/${eventId}`;
  return kind === "revoked" ? `${url}?revoked=1` : url;
}

export interface JudgmentPageInput {
  /** 要求の origin（https://…）。og:image は絶対 URL が要る */
  origin: string;
  event: StatusEvent;
  fieldName: string;
  /** 根拠の写真の 1 枚目。無い・消えたなら null（og:image を出さない） */
  photo: { id: string; width: number; height: number } | null;
}

export function judgmentPageHtml(input: JudgmentPageInput): string {
  const { origin, event, fieldName, photo } = input;
  const status = statusLabel(event.status);
  const name = `${event.fieldId} ${fieldName}`;
  const revoked = event.revokedAt !== null;
  const title = revoked ? `${name} 「${status}」の判断を取り消しました` : `${name} ${status}`;
  const lines = [
    `理由: ${noticeReasons(event.reasons)}`,
    `判断: ${jstDateTimeLabel(event.at)}`,
    ...(revoked && event.revokedAt !== null ? [`取り消し: ${jstDateTimeLabel(event.revokedAt)}`] : []),
  ];
  const description = lines.join(" ／ ");
  const pageUrl = judgmentUrl(origin, event.id, "recorded");
  const imagePath = photo === null ? null : `/api/photo-files/${encodeURIComponent(photo.id)}`;
  const alt = `${name}の判断の根拠の写真`;
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
    ...(photo === null || imagePath === null
      ? []
      : [
          metaTag("property", "og:image", `${origin}${imagePath}`),
          metaTag("property", "og:image:type", "image/jpeg"),
          metaTag("property", "og:image:width", String(photo.width)),
          metaTag("property", "og:image:height", String(photo.height)),
          metaTag("property", "og:image:alt", alt),
        ]),
    "<style>body{margin:0 auto;max-width:640px;padding:16px;font-family:sans-serif;line-height:1.6}img{width:100%;height:auto;border-radius:8px}</style>",
    "</head><body>",
    `<h1>${e(title)}</h1>`,
    ...(photo === null || imagePath === null
      ? []
      : [`<img src="${imagePath}" alt="${e(alt)}" width="${photo.width}" height="${photo.height}">`]),
    ...lines.map((line) => `<p>${e(line)}</p>`),
    "<p>番号・名前・判断は架空のもの</p>",
    `<p><a href="/fields/${encodeURIComponent(event.fieldId)}">この畑の詳細へ</a></p>`,
    "</body></html>",
  ].join("\n");
}
