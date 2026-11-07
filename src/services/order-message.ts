/**
 * LINE に送る刈る順番の文（11-05、4 段目「LINE に 1 枚」）。純粋関数。
 * 11-04 夜の本人決定: 父が直した順を委員長が確定 →「○○の順にするよ」を LINE へ。記録した順を並べるだけで、推測の言葉は入れない
 */
import type { Field } from "@/types";
import { monthDayJst } from "./parcel-geometry";

export interface OrderMessageInput {
  district: string;
  /** 確定した時刻 ISO 8601 */
  confirmedAt: string;
  ranked: readonly string[];
  fieldsById: Record<string, Field>;
  benchmarkId: string | null;
  /** 画面への道（あれば最後の行に） */
  url?: string;
}

export function orderMessageText(input: OrderMessageInput): string {
  const head = `${input.district}の刈る順番（${monthDayJst(input.confirmedAt)} 確定）`;
  if (input.ranked.length === 0) return `${head}\n順位を付けた畑はまだありません`;
  const lines = input.ranked.map((id, i) => {
    const name = input.fieldsById[id]?.name;
    const label = name ? `${id} ${name}` : id;
    return `${i + 1}. ${label}${id === input.benchmarkId ? "（目安）" : ""}`;
  });
  return [head, ...lines, "この順にするよ", ...(input.url ? [input.url] : [])].join("\n");
}

/** 絵の上の見出し */
export function orderImageTitle(district: string, confirmedAt: string): string {
  return `${district} 刈る順番 ${monthDayJst(confirmedAt)} 確定`;
}
