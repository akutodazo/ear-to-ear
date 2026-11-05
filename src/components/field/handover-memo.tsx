/**
 * 引き継ぎメモ（L6、docs/design/screen-spec.md §2-2 の「記録」、合格条件 13）。文ごとに根拠の印を付け、
 * 印を押すと元の記録（判断の履歴の項目・写真）に戻れる。根拠の無い文は灰色で「根拠なし」。
 * 作り直すのは管理者だけ（守るのはサーバー）。結果は押したボタンの直下に 1 行。props だけで受け取る
 * 見た目は見比べるの「昨年の同じ頃」「判断の履歴」と同じ段（11-05 本人の指示。枠で囲まない）
 */
import type { HandoverSentence } from "@/services/handover-view";
import { NO_SOURCE_LABEL } from "@/services/handover-view";
import { IconPen } from "@/components/icons";

export function HandoverMemo({
  sentences,
  createdLabel,
  loading,
  message,
  creating,
  createMessage,
  onCreate,
}: {
  sentences: HandoverSentence[];
  /** 例「7/22 10:30 に作成」。メモが無ければ null */
  createdLabel: string | null;
  loading: boolean;
  message: string | null;
  creating: boolean;
  createMessage: { text: string; ok: boolean } | null;
  onCreate: () => void;
}) {
  return (
    <section className="season memo" aria-label="引き継ぎメモ">
      <h2 className="season-title">引き継ぎメモ</h2>
      {loading && sentences.length === 0 && <p className="note">読み込んでいます</p>}
      {message && <p className="note">{message}</p>}
      {sentences.length > 0 && (
        <div className="memo-body">
          {sentences.map((sentence, i) => (
            <p key={i} className={sentence.uncited ? "memo-sentence memo-uncited" : "memo-sentence"}>
              {sentence.text}
              {sentence.uncited ? (
                <span className="badge"> {NO_SOURCE_LABEL}</span>
              ) : (
                sentence.sources.map((source) => (
                  <a
                    key={`${source.kind}:${source.id}`}
                    className="badge badge-source"
                    href={source.href}
                    title={source.citedText}
                    {...(source.kind === "photo" ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {source.label}
                  </a>
                ))
              )}
            </p>
          ))}
          {createdLabel && <p className="memo-created">{createdLabel}（Claude が記録から作成）</p>}
        </div>
      )}
      <button type="button" className="button button-small memo-create" onClick={onCreate} disabled={creating} aria-busy={creating}>
        <IconPen />
        {creating ? "作っています…" : sentences.length > 0 ? "メモを作り直す（管理者）" : "メモを作る（管理者）"}
      </button>
      {createMessage && <p className={createMessage.ok ? "note note-ok" : "note note-alert"}>{createMessage.text}</p>}
    </section>
  );
}
