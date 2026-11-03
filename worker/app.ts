/**
 * Worker の振り分けの本体。/api/ の外は静的アセットへ、/api/ は経路・認証・ハンドラ・共通ヘッダ。
 * 未捕捉の例外は 500 { error: "internal" } にして中身を漏らさない。
 */
import type { Deps } from "./deps";

export async function handleRequest(_request: Request, _deps: Deps): Promise<Response> {
  throw new Error("not implemented");
}
