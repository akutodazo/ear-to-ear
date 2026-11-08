/**
 * POST /api/session（合言葉 → Cookie、失敗は 10 分に 5 回まで）と GET /api/session（役割）、DELETE /api/session（出る。11-08）。
 * 判定は Service（usage-limit・session-request・session-token）、外の世界は deps。例外は握らない。
 */
import { LOGIN_MAX_ATTEMPTS_PER_WINDOW, SESSION_DAYS } from "@/config";
import { clientIp, isJsonContentType, parseSessionBody, SESSION_BODY_MAX_CHARS } from "@/services/session-request";
import { issueSessionToken } from "@/services/session-token";
import { loginCounterKey, loginWindow, retryAfterSec, utcDay } from "@/services/usage-limit";
import { nowSec, requireSession } from "./auth";
import { declaredTooLarge, readBodyLimited } from "./body";
import { buildClearSessionCookie, buildSessionCookie } from "./cookies";
import type { Handler } from "./deps";
import { errorResponse, json, noContent } from "./http";

export const postSession: Handler = async (request, { deps }) => {
  if (!isJsonContentType(request.headers.get("content-type"))) return errorResponse(415, "unsupported_media_type");
  if (declaredTooLarge(request.headers.get("content-length"), SESSION_BODY_MAX_CHARS)) return errorResponse(413, "payload_too_large");

  const bytes = await readBodyLimited(request, SESSION_BODY_MAX_CHARS);
  if (bytes === null) return errorResponse(413, "payload_too_large");
  // 区切りをまたぐ多バイト文字が壊れないよう、つないだ後で文字に直す
  const body = parseSessionBody(new TextDecoder().decode(bytes));
  if (!body.ok) {
    return body.reason === "too_long" ? errorResponse(413, "payload_too_large") : errorResponse(400, "bad_request");
  }

  const nowMs = deps.nowMs();
  const window = loginWindow(nowMs);
  const ipHash = await deps.hashIp(clientIp(request.headers.get("cf-connecting-ip")), utcDay(nowMs));
  const key = loginCounterKey(ipHash, window.slot);

  // 照合の前に枠を 1 つ取る。上限未満のときだけ 1 文で足すので、同時に何本来ても照合は上限の回数まで。
  // 満杯なら行は返らず、照合も書き込みもせずに 429
  const reserved = await deps.db
    .prepare(
      "INSERT INTO usage_counters (key, count, expires_at) VALUES (?, 1, ?) " +
        "ON CONFLICT(key) DO UPDATE SET count = usage_counters.count + 1 WHERE usage_counters.count < ? " +
        "RETURNING count",
    )
    .bind(key, window.expiresAt, LOGIN_MAX_ATTEMPTS_PER_WINDOW)
    .first<{ count: number }>();
  if (reserved === null) {
    const response = errorResponse(429, "too_many_attempts");
    response.headers.set("retry-after", String(retryAfterSec(window, nowMs)));
    return response;
  }

  const role = await deps.matchPassphrase(body.passphrase);
  // 不一致は取った枠をそのまま失敗として残す。ついでに期限の過ぎた行（合言葉の枠・前の日の Claude の回数）を消す（#59）
  if (role === null) {
    await deps.db
      .prepare("DELETE FROM usage_counters WHERE expires_at < ?")
      .bind(new Date(nowMs).toISOString())
      .run();
    return errorResponse(401, "unauthorized");
  }

  // 一致したら取った枠を戻す（成功は数えない）。0 になった行は消す
  await deps.db.batch([
    deps.db.prepare("UPDATE usage_counters SET count = count - 1 WHERE key = ?").bind(key),
    deps.db.prepare("DELETE FROM usage_counters WHERE key = ? AND count <= 0").bind(key),
  ]);

  const token = await issueSessionToken(
    { device: deps.newId(), role, exp: nowSec(deps) + SESSION_DAYS * 24 * 60 * 60 },
    deps.hmac,
  );
  const response = noContent();
  response.headers.set("set-cookie", buildSessionCookie(token));
  return response;
};

export const getSession: Handler = async (_request, ctx) => {
  return json(200, { role: requireSession(ctx).role });
};

/**
 * 出る（11-08 本人の依頼: 合言葉を入れ直す場所）。Cookie を消すだけで、照合も D1 も使わない。
 * 入っていない・期限切れの端末でも 204（消すものが無いだけ）。トークンは署名だけで持つので、写された値は期限まで使える（今までと同じ）
 */
export const deleteSession: Handler = async () => {
  const response = noContent();
  response.headers.set("set-cookie", buildClearSessionCookie());
  return response;
};
