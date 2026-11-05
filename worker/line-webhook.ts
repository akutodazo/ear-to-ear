/**
 * POST /api/line/webhook（L8、docs/spec.md §6、#140）。Cookie ではなく LINE の署名で守る。
 * 判定は Service（line-signature・line-webhook）、外の世界は deps の line・db だけ。
 * 順: LINE の口が無い 503 → 宣言の長さが上限超 413 → 生の本文を読む（超えたら 413）→ 署名が違う 401（D1 に触らない）
 *   → join（group）のグループ ID の最後の 1 つを settings に上書きで保存 → 200
 * グループ ID・本文はログに出さない。
 */
import { verifyLineSignature } from "@/services/line-signature";
import { joinedGroupIds } from "@/services/line-webhook";
import { declaredTooLarge, readBodyLimited } from "./body";
import type { Handler } from "./deps";
import { errorResponse, json } from "./http";

/** 本文の上限（バイト）。LINE のイベントは数件ずつ届くので十分な大きさ。共有の config.ts は変えずにここに置く */
export const LINE_WEBHOOK_MAX_BYTES = 64 * 1024;

/** 同じ key の行は 1 文で上書きする（DELETE を使わない） */
const SAVE_SQL =
  "INSERT INTO settings (key, value) VALUES ('line_group_id', ?) " +
  "ON CONFLICT(key) DO UPDATE SET value = excluded.value";

export const postLineWebhook: Handler = async (request, { deps }) => {
  const line = deps.line;
  if (line === null) return errorResponse(503, "line_disabled");
  if (declaredTooLarge(request.headers.get("content-length"), LINE_WEBHOOK_MAX_BYTES)) {
    return errorResponse(413, "payload_too_large");
  }

  // 署名は受け取ったバイト列そのものに対して確かめる（JSON に直してから並べ直さない）
  const bytes = await readBodyLimited(request, LINE_WEBHOOK_MAX_BYTES);
  if (bytes === null) return errorResponse(413, "payload_too_large");
  const valid = await verifyLineSignature(bytes, request.headers.get("x-line-signature"), line.sign);
  if (!valid) return errorResponse(401, "unauthorized");

  // LINE の「検証」は events が空の本文を送るので、何も書かずに 200
  const groupId = joinedGroupIds(new TextDecoder().decode(bytes)).at(-1);
  if (groupId !== undefined) await deps.db.prepare(SAVE_SQL).bind(groupId).run();
  return json(200, { ok: true });
};
