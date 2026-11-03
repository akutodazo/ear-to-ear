/**
 * /api/ の経路の振り分け（純粋関数）。区切りごとの完全一致と :name だけ。
 * 末尾のスラッシュ・大文字は正規化しない。パラメータは復号しない。
 */
import type { HttpMethod, Route } from "./deps";

export type RouteMatch =
  | { kind: "found"; route: Route; params: Record<string, string> }
  | { kind: "method-not-allowed"; allow: HttpMethod[] }
  | { kind: "not-found" };

/** パスが型に合えば params を返す。合わなければ null */
function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  const expected = pattern.split("/");
  const actual = pathname.split("/");
  if (expected.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < expected.length; i++) {
    const part = expected[i];
    const value = actual[i];
    if (part.startsWith(":")) {
      if (value === "") return null;
      params[part.slice(1)] = value;
    } else if (part !== value) {
      return null;
    }
  }
  return params;
}

export function matchRoute(
  routes: readonly Route[],
  method: string,
  pathname: string,
): RouteMatch {
  const allow: HttpMethod[] = [];
  for (const route of routes) {
    const params = matchPattern(route.pattern, pathname);
    if (params === null) continue;
    if (route.method === method) return { kind: "found", route, params };
    if (!allow.includes(route.method)) allow.push(route.method);
  }
  return allow.length > 0 ? { kind: "method-not-allowed", allow } : { kind: "not-found" };
}
