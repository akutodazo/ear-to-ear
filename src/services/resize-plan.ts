/**
 * 送る写真の縮小の大きさを決める（docs/spec.md §4 の 3）。純粋関数。
 * 長辺を THUMBNAIL_LONG_EDGE_PX に縮め、縦横の比は保つ。小さい写真は大きくしない。
 */
import { THUMBNAIL_LONG_EDGE_PX } from "../config";

export function resizedSize(
  width: number,
  height: number,
  longEdge: number = THUMBNAIL_LONG_EDGE_PX,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= longEdge) return { width, height };
  const scale = longEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
