/**
 * 昨年の引き継ぎ（5 段目、11-05）。昨年の判断の日の前後だけ、見比べるの「昨年の同じ頃」の下に出す。
 * 根拠の印は言葉だけ（昨年の履歴・写真はこの画面に無いのでリンクにしない）。架空の例であることを書く。props だけで受け取る
 */
import type { LastSeasonMemoView } from "@/services/last-season-handover";
import { NO_SOURCE_LABEL } from "@/services/handover-view";
import { IconCalendar } from "@/components/icons";

export function LastSeasonMemo({ view }: { view: LastSeasonMemoView }) {
  return (
    <section className="season memo memo-last" aria-label="昨年の引き継ぎ">
      <h2 className="season-title">
        <IconCalendar />
        昨年の引き継ぎ（{view.season}年）
      </h2>
      <div className="memo-body">
        {view.sentences.map((s, i) => (
          <p key={i} className={s.uncited ? "memo-sentence memo-uncited" : "memo-sentence"}>
            {s.text}
            {s.uncited ? (
              <span className="badge"> {NO_SOURCE_LABEL}</span>
            ) : (
              s.labels.map((label) => (
                <span key={label} className="badge badge-source badge-source-static">
                  {label}
                </span>
              ))
            )}
          </p>
        ))}
        <p className="memo-created">架空の例（手で書いたもの。Claude が作ったメモではない）</p>
      </div>
    </section>
  );
}
