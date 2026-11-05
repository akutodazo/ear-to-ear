/**
 * LINE に送る地図 1 枚の絵を描く（11-05、4 段目「LINE に 1 枚」）。ブラウザ専用（canvas）。
 * 地理院タイルの航空写真（CORS 可）の上に区画の輪郭・判断の塗り・刈る順番の丸を描き、上に見出し、右下に出典を入れる。
 * 座標の計算は src/services/tile-math（純粋関数）。持つのは圃場の区画と番号だけで、撮影位置は使わない（K6）
 */
import { MAP_TILES } from "@/config";
import type { LatLng } from "@/services/parcel-geometry";
import { polygonBounds, polygonCentroid, unionBounds } from "@/services/parcel-geometry";
import { fitView, projectToView, tilesForView } from "@/services/tile-math";

export interface ImageParcel {
  fieldId: string;
  name: string;
  polygon: readonly LatLng[];
  fill: "none" | "ready" | "done";
  benchmark: boolean;
  /** 刈る順番（無ければ丸を描かない） */
  rank: number | null;
}

export interface OrderImageInput {
  title: string;
  parcels: readonly ImageParcel[];
  /** 左下に小さく入れる注記（デモでは「区画・番号は架空」） */
  note?: string;
}

const W = 1080;
const MAP_H = 1080;
const BAND = 120;
const FONT = '"Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", system-ui, sans-serif';
const GREEN = "#2d6441";
const LIME = "rgba(216, 241, 120, 0.42)";
const INK = "rgba(37, 51, 38, 0.45)";
const GOLD = "#f1cc65";

function loadTile(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function tileUrl(z: number, x: number, y: number): string {
  return MAP_TILES.url.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}

function outlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.lineJoin = "round";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, y);
}

/** 絵を描いて JPEG にする。タイルが読めなくても、地の色の上に描いて返す */
export async function drawOrderImage(input: OrderImageInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = BAND + MAP_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("絵を描けない");

  // 見出しの帯
  ctx.fillStyle = "#f5f4ec";
  ctx.fillRect(0, 0, W, BAND);
  ctx.fillStyle = GREEN;
  ctx.font = `700 52px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText(input.title, 40, BAND / 2);

  // 地図
  const bounds = unionBounds(input.parcels.map((p) => polygonBounds(p.polygon)));
  ctx.fillStyle = "#6f7a52";
  ctx.fillRect(0, BAND, W, MAP_H);
  if (bounds) {
    const view = fitView(bounds, W, MAP_H, 90, MAP_TILES.maxZoom);
    const tiles = tilesForView(view, W, MAP_H);
    const images = await Promise.all(tiles.map((t) => loadTile(tileUrl(t.z, t.x, t.y))));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, BAND, W, MAP_H);
    ctx.clip();
    tiles.forEach((t, i) => {
      const img = images[i];
      if (img) ctx.drawImage(img, t.dx, BAND + t.dy, 256, 256);
    });
    const at = (lat: number, lng: number) => {
      const p = projectToView(view, lat, lng);
      return { x: p.x, y: BAND + p.y };
    };
    // 区画: 塗り → 影 → 輪郭（目安は金）
    for (const p of input.parcels) {
      ctx.beginPath();
      p.polygon.forEach(([lat, lng], i) => {
        const q = at(lat, lng);
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
      ctx.closePath();
      if (p.fill !== "none") {
        ctx.fillStyle = p.fill === "ready" ? LIME : INK;
        ctx.fill();
      }
      ctx.lineJoin = "round";
      ctx.lineWidth = 9;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = p.benchmark ? GOLD : "#ffffff";
      ctx.stroke();
    }
    // 丸と番号・名前
    ctx.textAlign = "center";
    for (const p of input.parcels) {
      const [lat, lng] = polygonCentroid(p.polygon);
      const c = at(lat, lng);
      if (p.rank !== null) {
        ctx.beginPath();
        ctx.arc(c.x, c.y - 30, 44, 0, Math.PI * 2);
        ctx.fillStyle = GREEN;
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = `700 48px ${FONT}`;
        ctx.fillText(String(p.rank), c.x, c.y - 27);
      }
      ctx.font = `700 34px ${FONT}`;
      outlinedText(ctx, `${p.fieldId} ${p.name}`, c.x, c.y + (p.rank !== null ? 42 : 0));
    }
    ctx.restore();
  }

  // 出典（必須）と注記
  ctx.textAlign = "right";
  ctx.font = `500 24px ${FONT}`;
  const credit = "地理院タイル";
  const cw = ctx.measureText(credit).width + 24;
  ctx.fillStyle = "rgba(255, 254, 249, 0.88)";
  ctx.fillRect(W - cw - 12, BAND + MAP_H - 48, cw, 36);
  ctx.fillStyle = "#253326";
  ctx.fillText(credit, W - 24, BAND + MAP_H - 30);
  if (input.note) {
    ctx.textAlign = "left";
    const nw = ctx.measureText(input.note).width + 24;
    ctx.fillStyle = "rgba(255, 254, 249, 0.88)";
    ctx.fillRect(12, BAND + MAP_H - 48, nw, 36);
    ctx.fillStyle = "#253326";
    ctx.fillText(input.note, 24, BAND + MAP_H - 30);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("絵を JPEG にできない"))), "image/jpeg", 0.88);
  });
}
