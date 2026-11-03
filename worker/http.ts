/**
 * API の共通の応答。失敗の本文は { error } だけで、内部の情報を入れない。
 */
export type ErrorCode =
  | "bad_request"
  | "not_found"
  | "method_not_allowed"
  | "unauthorized"
  | "forbidden"
  | "not_implemented"
  | "too_many_attempts"
  | "payload_too_large"
  | "unsupported_media_type"
  | "internal";

/** Content-Type: application/json; charset=utf-8 */
export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** 204。本文も Content-Type も無い */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/** { error: code }。reason は 422 で理由のコードを載せるときだけ */
export function errorResponse(status: number, code: ErrorCode, extra?: { reason?: string }): Response {
  const reason = extra?.reason;
  return json(status, reason === undefined ? { error: code } : { error: code, reason });
}

/** Cache-Control: no-store と X-Content-Type-Options: nosniff を、無いときだけ付ける */
export function applyCommonHeaders(response: Response): Response {
  // ハンドラの応答のヘッダは書き換えられないことがあるので、写してから足す
  const headers = new Headers(response.headers);
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  if (!headers.has("x-content-type-options")) headers.set("x-content-type-options", "nosniff");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
