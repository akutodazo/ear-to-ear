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
  | "internal";

/** Content-Type: application/json; charset=utf-8 */
export function json(_status: number, _body: unknown): Response {
  throw new Error("not implemented");
}

/** 204。本文も Content-Type も無い */
export function noContent(): Response {
  throw new Error("not implemented");
}

/** { error: code }。reason は 422 で理由のコードを載せるときだけ */
export function errorResponse(_status: number, _code: ErrorCode, _extra?: { reason?: string }): Response {
  throw new Error("not implemented");
}

/** Cache-Control: no-store と X-Content-Type-Options: nosniff を、無いときだけ付ける */
export function applyCommonHeaders(_response: Response): Response {
  throw new Error("not implemented");
}
