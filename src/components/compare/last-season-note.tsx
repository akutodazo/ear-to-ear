/**
 * 昨年の同じ頃（11-05）。年・作物・判断の日を分けて言う。昨年の写真は無い（今年の様子と見せない）。props だけで受け取る。
 * 昨年の判断の頃は、昨年の引き継ぎ（5 段目）をこの段の中に畳んで入れる（同じ事実を別の段で 2 回言わない。今年の履歴を下に押さない。精査 4 回目 #4）。
 * 出所は札にせず、文の後ろに灰色の小さな文字で年つきで書く（押せる札に見せない。精査 4 回目 #3）
 */
import type { LastSeasonMemoView } from "@/services/last-season-handover";
import { NO_SOURCE_LABEL } from "@/services/handover-view";
import { IconCalendar } from "@/components/icons";

interface Props {
  lines: string[];
  /** 昨年の引き継ぎ（昨年の判断の頃だけ）。無ければ null */
  memo?: LastSeasonMemoView | null;
  /** 地図の板の入口から来たときは開いておく */
  memoOpen?: boolean;
}

export function LastSeasonNote({ lines, memo = null, memoOpen = false }: Props) {
  const [head, ...rest] = lines;
  return (
    <section id="last-season" className="season" aria-label="昨年の同じ頃">
      <h2 className="season-title">昨年の同じ頃</h2>
      <p className="season-head">{head}</p>
      {rest.map((line) => (
        <p key={line} className="season-line">
          {line}
        </p>
      ))}
      {memo && (
        <details className="season-memo" open={memoOpen}>
          <summary>
            <IconCalendar />
            昨年の引き継ぎを読む（{memo.season}年）
          </summary>
          <div className="memo-body">
            {memo.sentences.map((s, i) => (
              <p key={i} className={s.uncited ? "memo-sentence memo-uncited" : "memo-sentence"}>
                {s.text}
                <span className="memo-origin">（{s.uncited ? NO_SOURCE_LABEL : s.labels.join("・")}）</span>
              </p>
            ))}
            <p className="memo-created">架空の例（手で書いたもの。Claude が作ったメモではない）</p>
          </div>
        </details>
      )}
    </section>
  );
}
