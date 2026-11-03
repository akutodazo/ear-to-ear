/**
 * POST /api/session（合言葉 → Cookie、失敗は 10 分に 5 回まで）と GET /api/session（役割）。
 * 判定は Service（usage-limit・session-request・session-token）、外の世界は deps。例外は握らない。
 */
import { LOGIN_MAX_ATTEMPTS_PER_WINDOW, SESSION_DAYS } from "@/config";
import { clientIp, isJsonContentType, parseSessionBody, SESSION_BODY_MAX_CHARS } from "@/services/session-request";
import { issueSessionToken } from "@/services/session-token";
import { loginCounterKey, loginWindow, retryAfterSec, utcDay } from "@/services/usage-limit";
import { nowSec, requireSession } from "./auth";
import { buildSessionCookie } from "./cookies";
import type { Handler } from "./deps";
import { errorResponse, json, noContent } from "./http";

/** content-length が数として読めて上限を超えるか。読めなければ本文で判定する */
function declaredTooLarge(header: string | null): boolean {
  if (header === null || !/^\d+$/.test(header)) return false;
  return Number(header) > SESSION_BODY_MAX_CHARS;
}

/**
 * 本文をバイトで上限まで読む。超えたら読むのをやめて null（content-length が無い・偽りでも、全部は読まない）。
 * 区切りをまたぐ多バイト文字が壊れないよう、つないでから文字に直す
 */
async function readBodyLimited(request: Request, maxBytes: number): Promise<string | null> {
  if (request.body === null) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export const postSession: Handler = async (request, { deps }) => {
  if (!isJsonContentType(request.headers.get("content-type"))) return errorResponse(415, "unsupported_media_type");
  if (declaredTooLarge(request.headers.get("content-length"))) return errorResponse(413, "payload_too_large");

  const text = await readBodyLimited(request, SESSION_BODY_MAX_CHARS);
  if (text === null) return errorResponse(413, "payload_too_large");
  const body = parseSessionBody(text);
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
  // 不一致は取った枠をそのまま失敗として残す
  if (role === null) return errorResponse(401, "unauthorized");

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
