import type { MetadataRoute } from "next";

/** ホーム画面に追加したときの名前・色・アイコン（画面の精査 D、11-03）。静的書き出しで manifest.webmanifest になる */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ear-to-ear — 穂から穂へ、写真と判断をつなぐ",
    short_name: "ear-to-ear",
    description: "小麦収穫委員会の写真共有",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f8",
    theme_color: "#1f6fb5",
    lang: "ja",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
