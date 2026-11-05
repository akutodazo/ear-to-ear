/**
 * 昨年の同じ頃（見比べるの画面、11-05）。純粋関数。
 * 場所（圃場）と年の作物・判断を分ける（輪作で作物が変わる）。昨年の写真を今年の様子として見せない。
 * ここは記録の日付を言葉にするだけで、収穫の時期を予想しない（AGENTS.md「推定は推定と書く」「収穫の可否を Claude に言わせない」）。
 */

/** ある年・ある圃場の記録。日付は 'YYYY-MM-DD'（日本時間の日付）。無ければ null */
export interface SeasonRecord {
  season: string;
  fieldId: string;
  /** 作物（例 小麦・大豆）。小麦でない年は比べない */
  crop: string;
  /** 収穫可能と判断した日 */
  readyAt: string | null;
  /** 収穫済にした日 */
  doneAt: string | null;
}

const WHEAT = "小麦";
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** その圃場の、今年の 1 つ前の年の記録。無ければ null */
export function lastSeasonFor(records: readonly SeasonRecord[], fieldId: string, season: string): SeasonRecord | null {
  const year = Number(season);
  if (!Number.isInteger(year)) return null;
  const last = String(year - 1);
  return records.find((r) => r.fieldId === fieldId && r.season === last) ?? null;
}

function parts(date: string): { year: number; month: number; day: number } {
  const m = DATE.exec(date);
  if (!m) throw new Error(`日付ではない: ${date}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** 'YYYY-MM-DD' を「7/4」に */
export function monthDay(date: string): string {
  const { month, day } = parts(date);
  return `${month}/${day}`;
}

/** 年を無視した月日の差（a − b、日）。a の月日を b の年に置いて数える */
export function dayDiffSameYear(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  const ta = Date.UTC(pb.year, pa.month - 1, pa.day);
  const tb = Date.UTC(pb.year, pb.month - 1, pb.day);
  return Math.round((ta - tb) / 86_400_000);
}

function lastYearLabel(season: string): string {
  const year = Number(season);
  return Number.isInteger(year) ? `${year - 1}年` : "昨年";
}

/**
 * 昨年の同じ頃の文。
 * - 記録なし → 無いと言う
 * - 小麦でない → 作物だけ言う（比べない）
 * - 小麦 → 年と作物／判断した日・収穫した日／今年の最新の写真との日付の差（写真と判断の日があるときだけ）
 */
export function lastSeasonLines(record: SeasonRecord | null, season: string, latestPhotoTakenAt: string | null): string[] {
  if (record === null) return [`昨年（${lastYearLabel(season)}）の記録はありません`];
  const head = `${record.season}年は${record.crop}`;
  if (record.crop !== WHEAT) return [`${head}（${WHEAT}ではない）`];
  const events: string[] = [];
  if (record.readyAt !== null) events.push(`${monthDay(record.readyAt)} に収穫可能と判断`);
  if (record.doneAt !== null) events.push(`${monthDay(record.doneAt)} に収穫済`);
  const lines = [head, events.length > 0 ? events.join("、") : "判断の記録なし"];
  if (latestPhotoTakenAt !== null && record.readyAt !== null) {
    const diff = dayDiffSameYear(latestPhotoTakenAt, record.readyAt);
    const relation = diff === 0 ? "と同じ日付" : diff < 0 ? `の ${-diff} 日前の日付` : `の ${diff} 日後の日付`;
    lines.push(`今年の最新の写真（${monthDay(latestPhotoTakenAt)}）は、昨年の判断${relation}`);
  }
  return lines;
}
