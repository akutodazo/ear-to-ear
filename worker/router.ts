/**
 * /api/ の経路の振り分け（純粋関数）。区切りごとの完全一致と :name だけ。
 * 末尾のスラッシュ・大文字は正規化しない。パラメータは復号しない。
 */
import type { HttpMethod, Route } from "./deps";

export type RouteMatch =
  | { kind: "found"; route: Route; params: Record<string, string> }
  | { kind: "method-not-allowed"; allow: HttpMethod[] }
  | { kind: "not-found" };

export function matchRoute(
  _routes: readonly Route[],
  _method: string,
  _pathname: string,
): RouteMatch {
  throw new Error("not implemented");
}
