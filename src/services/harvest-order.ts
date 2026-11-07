/**
 * 刈る順番の下書きと並べ替え（11-05、3 段目）。純粋関数。
 * 記録（人の判断・写真の撮影日・昨年の判断・目安）から並べるだけで、写真や AI から収穫の時期を推測しない。
 * 順位を付けるのは今年「収穫可能」と人が判断した畑だけ。判断の無い畑は「順位なし」に置き、人が動かす（docs/design/screen-spec.md §3）
 */
import type { Field, FieldSummary, UploadedPhoto } from "@/types";
import { isoToJstDate, lastSeasonFor, monthDay, type SeasonRecord } from "./last-season";

export type Missing = "judgment" | "photo";

/** 畑ごとの記録の行 */
export interface OrderRow {
  fieldId: string;
  status: "ready" | "done" | "none";
  /** 今年「収穫可能」と判断した日（日本時間の YYYY-MM-DD） */
  readyAt: string | null;
  /** 昨年「収穫可能」と判断した日（小麦の年だけ） */
  lastReadyAt: string | null;
  /** 今年の写真のうち、いちばん新しい撮影日 */
  latestPhotoAt: string | null;
  benchmark: boolean;
  missing: Missing[];
  /** ある記録だけを言う文 */
  lines: string[];
}

/** 下書き（と、人が直した順） */
export interface OrderDraft {
  /** 順位のある畑（上から刈る） */
  ranked: string[];
  /** 順位を付けていない畑 */
  unranked: string[];
  /** 収穫済 */
  done: string[];
}

export interface OrderInput {
  fields: readonly Field[];
  summaries: readonly FieldSummary[];
  benchmarkId: string | null;
  season: string;
  lastSeason: readonly SeasonRecord[];
  photosByField: Record<string, readonly UploadedPhoto[]>;
}

export function orderRows(input: OrderInput): Record<string, OrderRow> {
  const rows: Record<string, OrderRow> = {};
  for (const field of input.fields) {
    const latest = input.summaries.find((s) => s.fieldId === field.id)?.latest ?? null;
    const status = latest?.status ?? "none";
    const readyAt = latest?.status === "ready" ? isoToJstDate(latest.at) : null;
    const last = lastSeasonFor(input.lastSeason, field.id, input.season);
    const lastReadyAt = last !== null && last.crop === "小麦" ? last.readyAt : null;
    const seasonPhotos = (input.photosByField[field.id] ?? []).filter(
      (p) => p.state === "confirmed" && p.takenAt !== null && p.takenAt.startsWith(`${input.season}-`),
    );
    const latestPhotoAt = seasonPhotos.reduce<string | null>((acc, p) => (acc === null || (p.takenAt ?? "") > acc ? p.takenAt : acc), null);
    const missing: Missing[] = [];
    if (status === "none") missing.push("judgment");
    if (latestPhotoAt === null) missing.push("photo");
    const lines: string[] = [];
    if (readyAt !== null) lines.push(`${monthDay(readyAt)} に収穫可能と判断`);
    if (latest?.status === "done") lines.push(`${monthDay(isoToJstDate(latest.at))} に収穫済`);
    if (last !== null && last.crop !== "小麦") lines.push(`昨年は${last.crop}`);
    else if (lastReadyAt !== null) lines.push(`昨年 ${monthDay(lastReadyAt)} に収穫可能と判断`);
    rows[field.id] = { fieldId: field.id, status, readyAt, lastReadyAt, latestPhotoAt, benchmark: field.id === input.benchmarkId, missing, lines };
  }
  return rows;
}

/** null を後ろにする昇順の比較 */
function compareNullable(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

/**
 * 記録からの下書き。
 * 順位: 今年「収穫可能」の畑を判断の早い順（同じ日は目安 → 昨年の判断の早い順 → 番号）。
 * 順位なし: 判断の無い畑を昨年の判断の早い順（無ければ番号順）。収穫済は別
 */
export function draftOrder(rows: Record<string, OrderRow>, fields: readonly Field[]): OrderDraft {
  const list = fields.map((f) => rows[f.id]).filter((r): r is OrderRow => r !== undefined);
  const byId = (a: OrderRow, b: OrderRow) => (a.fieldId < b.fieldId ? -1 : a.fieldId > b.fieldId ? 1 : 0);
  const ranked = list
    .filter((r) => r.status === "ready")
    .sort((a, b) => compareNullable(a.readyAt, b.readyAt) || Number(b.benchmark) - Number(a.benchmark) || compareNullable(a.lastReadyAt, b.lastReadyAt) || byId(a, b));
  const unranked = list.filter((r) => r.status === "none").sort((a, b) => compareNullable(a.lastReadyAt, b.lastReadyAt) || byId(a, b));
  const done = list.filter((r) => r.status === "done").sort(byId);
  return { ranked: ranked.map((r) => r.fieldId), unranked: unranked.map((r) => r.fieldId), done: done.map((r) => r.fieldId) };
}

/** 上下に 1 つ動かす（delta は正なら下、負なら上。2 以上でも 1 つだけ）。端では動かない。元の配列は変えない */
export function moveWithin(list: readonly string[], index: number, delta: number): string[] {
  const step = Math.sign(delta);
  const to = index + step;
  if (step === 0 || index < 0 || index >= list.length || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** 順位なしの畑を順位の最後へ、順位の畑を順位なしの先頭へ。収穫済・知らない畑は変えない */
export function rankOrUnrank(draft: OrderDraft, fieldId: string): OrderDraft {
  if (draft.unranked.includes(fieldId)) {
    return { ...draft, ranked: [...draft.ranked, fieldId], unranked: draft.unranked.filter((id) => id !== fieldId) };
  }
  if (draft.ranked.includes(fieldId)) {
    return { ...draft, ranked: draft.ranked.filter((id) => id !== fieldId), unranked: [fieldId, ...draft.unranked] };
  }
  return draft;
}

/** 順位の並びと、順位なしの集まりが同じか（確定した順と違うかを見る） */
export function sameOrder(a: OrderDraft, b: OrderDraft): boolean {
  const sameList = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((v, i) => v === y[i]);
  const sameSet = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((v) => y.includes(v));
  return sameList(a.ranked, b.ranked) && sameSet(a.unranked, b.unranked);
}

/** 次に撮る畑: 今年の写真が無い畑（番号順）→ 判断が無く最新の写真が古い畑。収穫可能・収穫済は入れない */
export function nextToShoot(rows: Record<string, OrderRow>): string[] {
  const open = Object.values(rows).filter((r) => r.status === "none");
  const noPhoto = open.filter((r) => r.latestPhotoAt === null).map((r) => r.fieldId).sort();
  const old = open
    .filter((r) => r.latestPhotoAt !== null)
    .sort((a, b) => compareNullable(a.latestPhotoAt, b.latestPhotoAt) || (a.fieldId < b.fieldId ? -1 : 1))
    .map((r) => r.fieldId);
  return [...noPhoto, ...old];
}

/** from の畑を to の位置へ動かす（指で動かした先。範囲の外は端に丸める）。from が範囲外なら変えない */
export function moveTo(list: readonly string[], from: number, to: number): string[] {
  if (from < 0 || from >= list.length) return [...list];
  const target = Math.min(list.length - 1, Math.max(0, to));
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

/**
 * 保存した順を、今の記録（下書き）に合わせる。保存した並びを使い、収穫済になった畑・知らない畑・重なりは外し、
 * 保存に無い畑は順位なしの後ろに足す（新しく判断された畑も、勝手に順位を付けず人が動かす）
 */
export function applySaved(now: OrderDraft, saved: { ranked: readonly string[]; unranked: readonly string[] }): OrderDraft {
  const open = new Set([...now.ranked, ...now.unranked]);
  const used = new Set<string>();
  const take = (ids: readonly string[]) =>
    ids.filter((id) => {
      if (!open.has(id) || used.has(id)) return false;
      used.add(id);
      return true;
    });
  const ranked = take(saved.ranked);
  const unranked = take(saved.unranked);
  const rest = [...now.ranked, ...now.unranked].filter((id) => !used.has(id));
  return { ranked, unranked: [...unranked, ...rest], done: [...now.done] };
}
