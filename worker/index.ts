/**
 * Worker の入口（人が書く。檻の外）。Deps を作って handleRequest に渡すだけ。
 * Deps が作れない（Secret が無い等）ときも中身を漏らさず 500 にする。
 */
import { handleRequest } from "./app";
import { createDeps, type Env } from "./env";
import { applyCommonHeaders, errorResponse } from "./http";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, createDeps(env));
    } catch (error) {
      console.error(error);
      return applyCommonHeaders(errorResponse(500, "internal"));
    }
  },
};
