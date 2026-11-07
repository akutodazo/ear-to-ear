/**
 * POST /api/fields/:id/handover（引き継ぎメモを作り直して保存する、L6、docs/spec.md §6、T31 #111）。admin だけ。
 * 判定は Service（handover-document・handover-request・handover-note・usage-limit）、外の世界は deps の db・claude・nowMs だけ。
 * 順: 一覧に無い圃場 404 → Claude が止まっている 503 → 記録を読む → 0 件 422 → 回数 429 → Claude → 502 → 保存して 200
 * 502 は理由と Claude の状態コードを返し、ログにも同じ 2 つだけを 1 行で残す（#192）
 */
import { CLAUDE_DAILY_LIMIT, CLAUDE_MODEL } from "@/config";
import { buildHandoverRecords } from "@/services/handover-document";
import { handoverSeason } from "@/services/handover-note";
import { buildHandoverRequest, readHandoverReply } from "@/services/handover-request";
import { PHOTO_LIST_COLUMNS, photoFromRow, type PhotoListRow } from "@/services/photo-query";
import { STATUS_EVENT_COLUMNS, statusEventFromRow, type StatusEventRow } from "@/services/status-events";
import { claudeCounterKey, claudeDayEndsAt } from "@/services/usage-limit";
import type { ClaudePort, ClaudeReply, Handler } from "./deps";
import { errorResponse, json } from "./http";

/** その圃場の判断の全部（取り消したものも）。番号は bind */
const EVENTS_SQL = `SELECT ${STATUS_EVENT_COLUMNS.join(", ")} FROM field_status_events WHERE field_id = ?`;

/** その圃場の確定済みの写真。番号は bind */
const PHOTOS_SQL = `SELECT ${PHOTO_LIST_COLUMNS.join(", ")} FROM uploaded_photos WHERE state = 'confirmed' AND field_id = ?`;

/** 上限未満のときだけ 1 文で足す。満杯なら行は返らない（期限も変えない） */
const COUNT_SQL =
  "INSERT INTO usage_counters (key, count, expires_at) VALUES (?, 1, ?) " +
  "ON CONFLICT(key) DO UPDATE SET count = usage_counters.count + 1 WHERE usage_counters.count < ? " +
  "RETURNING count";

/** 同じ圃場・シーズンの行は 1 文で上書きする（DELETE を使わない） */
const SAVE_SQL =
  "INSERT INTO handover_notes (field_id, season, body, model, created_at) VALUES (?, ?, ?, ?, ?) " +
  "ON CONFLICT(field_id, season) DO UPDATE SET body = excluded.body, model = excluded.model, created_at = excluded.created_at";

/** 口の例外は通信の失敗（status 0・body null）と同じに扱う */
async function callClaude(claude: ClaudePort, body: unknown): Promise<ClaudeReply> {
  try {
    return await claude(body);
  } catch {
    return { status: 0, body: null };
  }
}

export const postFieldHandover: Handler = async (_request, { params, deps }) => {
  const fieldId = params.id;
  if (!deps.knownFieldIds.has(fieldId)) return errorResponse(404, "not_found");
  const claude = deps.claude;
  if (claude === null) return errorResponse(503, "claude_disabled");

  const nowMs = deps.nowMs();
  const season = handoverSeason(nowMs);
  const events = await deps.db.prepare(EVENTS_SQL).bind(fieldId).all<StatusEventRow>();
  const photos = await deps.db.prepare(PHOTOS_SQL).bind(fieldId).all<PhotoListRow>();
  const records = buildHandoverRecords(
    fieldId,
    season,
    events.results.map(statusEventFromRow),
    photos.results.map(photoFromRow),
  );
  if (records.length === 0) return errorResponse(422, "unprocessable", { reason: "no_records" });

  // 呼ぶ前に数える（失敗も数える）
  const dayEndsAt = claudeDayEndsAt(nowMs);
  const reserved = await deps.db
    .prepare(COUNT_SQL)
    .bind(claudeCounterKey(nowMs), dayEndsAt, CLAUDE_DAILY_LIMIT)
    .first<{ count: number }>();
  if (reserved === null) {
    const response = errorResponse(429, "too_many_requests");
    response.headers.set("retry-after", String(Math.max(1, Math.ceil((Date.parse(dayEndsAt) - nowMs) / 1000))));
    return response;
  }

  const reply = await callClaude(claude, buildHandoverRequest(fieldId, season, records));
  const read = readHandoverReply(reply.status, reply.body, records.length);
  if (!read.ok) {
    // 返事の本文・例外の文は出さない（理由と状態コードだけ）
    const upstreamStatus = reply.status;
    console.error(`handover bad_gateway reason=${read.reason} upstreamStatus=${upstreamStatus}`);
    return json(502, { error: "bad_gateway", reason: read.reason, upstreamStatus });
  }

  const createdAt = new Date(nowMs).toISOString();
  await deps.db
    .prepare(SAVE_SQL)
    .bind(fieldId, season, JSON.stringify({ records, blocks: read.blocks }), CLAUDE_MODEL, createdAt)
    .run();
  return json(200, { fieldId, season, records, blocks: read.blocks, model: CLAUDE_MODEL, createdAt });
};
