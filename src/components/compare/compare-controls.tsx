/**
 * 見比べるの選び方（11-05）: 比べ方（同じ日に撮った別の畑と／この畑の前の日と）、撮影日、相手の畑か前の日。
 * 札は押せる大きさ（44px）で、その日に写真が無い相手は薄くして押せない。props だけで受け取る
 */
import type { Field } from "@/types";
import type { PartnerOption } from "@/services/photo-compare";
import { monthDay } from "@/services/last-season";
import { IconCalendar, IconFields } from "@/components/icons";

export type CompareMode = "same-day" | "same-field";

interface Props {
  mode: CompareMode;
  onMode: (mode: CompareMode) => void;
  /** この畑に写真がある日（新しい順）と、選んでいる日 */
  days: string[];
  date: string | null;
  onDate: (date: string) => void;
  /** 同じ日のとき: 相手の候補と選んでいる相手 */
  partners: PartnerOption[];
  partnerId: string | null;
  fieldsById: Record<string, Field>;
  benchmarkId: string | null;
  onPartner: (fieldId: string) => void;
  /** 前の日のとき: 上に置ける日と選んでいる日 */
  earlierOptions: string[];
  earlier: string | null;
  onEarlier: (date: string) => void;
}

export function CompareControls({ mode, onMode, days, date, onDate, partners, partnerId, fieldsById, benchmarkId, onPartner, earlierOptions, earlier, onEarlier }: Props) {
  return (
    <div className="controls">
      <div className="mode" role="group" aria-label="比べ方">
        <button type="button" className={mode === "same-day" ? "mode-item mode-current" : "mode-item"} aria-pressed={mode === "same-day"} onClick={() => onMode("same-day")}>
          <IconFields />
          同じ日の別の畑と
        </button>
        <button type="button" className={mode === "same-field" ? "mode-item mode-current" : "mode-item"} aria-pressed={mode === "same-field"} onClick={() => onMode("same-field")}>
          <IconCalendar />
          この畑の前の日と
        </button>
      </div>
      {days.length > 0 && (
        <div className="chips" role="group" aria-label="撮影日">
          {days.map((d) => (
            <button key={d} type="button" className={d === date ? "chip chip-current" : "chip"} aria-pressed={d === date} onClick={() => onDate(d)}>
              {monthDay(d)}
            </button>
          ))}
        </div>
      )}
      {mode === "same-day" && partners.length > 0 && (
        <div className="chips" role="group" aria-label="比べる相手">
          <span className="chips-label">上に</span>
          {partners.map((p) => (
            <button
              key={p.fieldId}
              type="button"
              className={p.fieldId === partnerId ? "chip chip-current" : "chip"}
              aria-pressed={p.fieldId === partnerId}
              disabled={!p.enabled}
              title={p.enabled ? undefined : "この日の写真がありません"}
              onClick={() => onPartner(p.fieldId)}
            >
              {p.fieldId === benchmarkId && <i className="mark mark-benchmark" aria-hidden="true" />}
              {fieldsById[p.fieldId]?.name ?? p.fieldId}
            </button>
          ))}
        </div>
      )}
      {mode === "same-field" && earlierOptions.length > 0 && (
        <div className="chips" role="group" aria-label="上に置く日">
          <span className="chips-label">上に</span>
          {earlierOptions.map((d) => (
            <button key={d} type="button" className={d === earlier ? "chip chip-current" : "chip"} aria-pressed={d === earlier} onClick={() => onEarlier(d)}>
              {monthDay(d)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
