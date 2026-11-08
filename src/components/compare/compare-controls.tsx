/**
 * 見比べるの選び方（11-05）: 比べ方（同じ日の別の畑と／この畑の前の日と）と、撮影日。
 * 同じ日のときは「撮影日」の 1 段。前の日のときは「下に」（選んだ日）と「上に」（それより前の日）の 2 段で対にする（精査 3 回目 #3）。
 * 相手の畑は、写真の上の帯を押して選ぶ（split-viewer。精査 3 回目 #2）。札は 44px。props だけで受け取る
 */
import { monthDay } from "@/services/last-season";
import type { CompareMode } from "@/services/photo-compare";
import { IconSameDay, IconSameField } from "@/components/icons";

interface Props {
  mode: CompareMode;
  onMode: (mode: CompareMode) => void;
  /** この畑に写真がある日（新しい順）と、選んでいる日 */
  days: string[];
  date: string | null;
  onDate: (date: string) => void;
  /** 前の日のとき: 上に置ける日（選んだ日より前）と選んでいる日 */
  earlierOptions: string[];
  earlier: string | null;
  onEarlier: (date: string) => void;
}

function DateRow({ label, dates, current, onPick }: { label: string; dates: string[]; current: string | null; onPick: (d: string) => void }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      <span className="chips-label">{label}</span>
      {dates.map((d) => (
        <button key={d} type="button" className={d === current ? "chip chip-current" : "chip"} aria-pressed={d === current} onClick={() => onPick(d)}>
          {monthDay(d)}
        </button>
      ))}
    </div>
  );
}

export function CompareControls({ mode, onMode, days, date, onDate, earlierOptions, earlier, onEarlier }: Props) {
  return (
    <div className="controls">
      <div className="mode" role="group" aria-label="比べ方">
        <button type="button" className={mode === "same-day" ? "mode-item mode-current" : "mode-item"} aria-pressed={mode === "same-day"} onClick={() => onMode("same-day")}>
          <IconSameDay />
          同じ日の別の畑と
        </button>
        <button type="button" className={mode === "same-field" ? "mode-item mode-current" : "mode-item"} aria-pressed={mode === "same-field"} onClick={() => onMode("same-field")}>
          <IconSameField />
          この畑の前の日と
        </button>
      </div>
      {mode === "same-day" && days.length > 0 && <DateRow label="撮影日" dates={days} current={date} onPick={onDate} />}
      {mode === "same-field" && days.length > 0 && <DateRow label="下に" dates={days} current={date} onPick={onDate} />}
      {mode === "same-field" && earlierOptions.length > 0 && <DateRow label="上に" dates={earlierOptions} current={earlier} onPick={onEarlier} />}
    </div>
  );
}
