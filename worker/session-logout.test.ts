import { describe, expect, it, vi } from "vitest";
import { handleRequest } from "./app";
import { buildClearSessionCookie } from "./cookies";
import type { Deps } from "./deps";
import { fakeDeps, request, sessionToken } from "./test-helpers";

// DELETE /api/session（11-08 本人の依頼: 合言葉を入れ直す場所）。Cookie は HttpOnly なので、画面からは消せない。
// サーバーが Max-Age=0 の Cookie を返して消す。入っていない・期限切れの端末でも、消すだけなので 204
describe("DELETE /api/session（出る）", () => {
  it("Cookie を消す Set-Cookie を 1 本返し、204 で本文なし", async () => {
    const response = await handleRequest(request("DELETE", "/api/session", `session=${await sessionToken("member")}`), fakeDeps());
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toBe(buildClearSessionCookie());
    expect(await response.text()).toBe("");
  });

  it("Cookie が無くても 204 で、同じ Set-Cookie（入っていない端末で押しても失敗にしない）", async () => {
    const response = await handleRequest(request("DELETE", "/api/session"), fakeDeps());
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toBe(buildClearSessionCookie());
  });

  it("壊れた Cookie でも 204（照合しない）", async () => {
    const hmac = { sign: vi.fn(), verify: vi.fn() } as unknown as Deps["hmac"];
    const response = await handleRequest(request("DELETE", "/api/session", "session=broken"), fakeDeps({ hmac }));
    expect(response.status).toBe(204);
  });

  it("D1 にも R2 にも触れない", async () => {
    const prepare = vi.fn();
    const db = { prepare, batch: vi.fn() } as unknown as Deps["db"];
    const photos = { get: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as Deps["photos"];
    await handleRequest(request("DELETE", "/api/session"), fakeDeps({ db, photos }));
    expect(prepare).not.toHaveBeenCalled();
  });

  it("共通ヘッダ（no-store・nosniff）が付く", async () => {
    const response = await handleRequest(request("DELETE", "/api/session"), fakeDeps());
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
