/**
 * Worker の入口（人が書く。檻の外）。Deps を作って handleRequest に渡すだけ。
 * Deps が作れない（Secret が無い等）ときも中身を漏らさず 500 にする。
 * このとき静的な画面も 500 になるのは意図どおり（設定の誤りに早く気づくため。安全側）。
 */
import { handleRequest } from "./app";
import { createDeps, type Env, type WaitContext } from "./env";
import { applyCommonHeaders, errorResponse } from "./http";

export default {
  // ctx（ExecutionContext）は LINE の送信を応答の後に走らせるために渡す（L8、#139）
  async fetch(request: Request, env: Env, ctx: WaitContext): Promise<Response> {
    try {
      return await handleRequest(request, createDeps(env, ctx));
    } catch (error) {
      console.error(error);
      return applyCommonHeaders(errorResponse(500, "internal"));
    }
  },
};
