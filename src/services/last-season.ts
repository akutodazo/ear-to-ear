/**
 * 昨年の同じ頃（見比べるの画面、11-05）。純粋関数。
 * 場所（圃場）と年の作物・判断を分ける（輪作で作物が変わる）。昨年の写真を今年の様子として見せない。
 * ここは記録の日付を言葉にするだけで、収穫の時期を予想しない。日数の差も出さない（「あと n 日」と読めるため。精査 #2）。
 */
import type { StatusEvent } from "@/types";

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

/** 今年の判断の日（昨年と同じ形で並べるため） */
export interface SeasonDates {
  readyAt: string | null;
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

const JST_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });

/** ISO の日時を日本時間の 'YYYY-MM-DD' に（判断の at を昨年の記録と同じ形にする） */
export function isoToJstDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error(`日時ではない: ${iso}`);
  return JST_DATE.format(date);
}

function lastYearLabel(season: string): string {
  const year = Number(season);
  return Number.isInteger(year) ? `${year - 1}年` : "昨年";
}

/** 「7/20 に収穫可能と判断、7/24 に収穫済」。何も無ければ null */
function eventsText(dates: SeasonDates): string | null {
  const events: string[] = [];
  if (dates.readyAt !== null) events.push(`${monthDay(dates.readyAt)} に収穫可能と判断`);
  if (dates.doneAt !== null) events.push(`${monthDay(dates.doneAt)} に収穫済`);
  return events.length > 0 ? events.join("、") : null;
}

/**
 * 昨年の同じ頃の文。
 * - 記録なし → 無いと言う
 * - 小麦でない → 作物だけ言う（比べない）
 * - 小麦 → 年と作物／「昨年 …」／「今年 …」を同じ形で並べる（差は見る人が読む）
 */
export function lastSeasonLines(record: SeasonRecord | null, season: string, thisSeason: SeasonDates | null): string[] {
  if (record === null) return [`昨年（${lastYearLabel(season)}）の記録はありません`];
  const head = `${record.season}年は${record.crop}`;
  if (record.crop !== WHEAT) return [`${head}（${WHEAT}ではない）`];
  const last = eventsText(record) ?? "判断の記録なし";
  const now = thisSeason === null ? null : eventsText(thisSeason);
  return [head, `昨年 ${last}`, `今年 ${now ?? "まだ判断はありません"}`];
}

/** 今年の判断の記録から、収穫可能・収穫済それぞれの最新の日（日本時間の日付）。取り消した記録は数えない。記録が無ければ null */
export function seasonDatesFromEvents(events: readonly Pick<StatusEvent, "status" | "at" | "revokedAt">[]): SeasonDates | null {
  const live = events.filter((e) => e.revokedAt === null);
  if (live.length === 0) return null;
  const latestOf = (kind: StatusEvent["status"]) => {
    const list = live.filter((e) => e.status === kind);
    return list.length === 0 ? null : isoToJstDate(list.reduce((a, b) => (a.at > b.at ? a : b)).at);
  };
  return { readyAt: latestOf("ready"), doneAt: latestOf("done") };
}
