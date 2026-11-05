/**
 * この畑の写真を縦に送る（新しい日が先、日付不明は最後。11-05）。1 枚ずつ大きく、日付は小さく。
 * 判断を書いているときは、写真の下で「根拠にする」を選べる。props だけで受け取る
 */
import Image from "next/image";
import type { PhotoGroup } from "@/services/photo-groups";
import { takenAtLabel } from "@/services/photo-labels";
import { IconPhoto } from "@/components/icons";

interface Props {
  groups: PhotoGroup[];
  fieldId: string;
  loading: boolean;
  message: string | null;
  /** 読めなかったときの「もう一度読み込む」 */
  onRetry: () => void;
  /** 判断を書いているとき: 根拠に選んだ写真と、切り替え。無ければ選べない */
  refs?: { selected: ReadonlySet<string>; onToggle: (photoId: string) => void };
}

export function PhotoStream({ groups, fieldId, loading, message, onRetry, refs }: Props) {
  if (groups.length === 0) {
    const failed = !loading && message !== null && message !== "まだ確定した写真はありません";
    return (
      <div className="stream-empty">
        <IconPhoto />
        {loading ? "写真を読み込んでいます" : (message ?? "まだ確定した写真はありません")}
        {failed && (
          <button type="button" className="button button-small" onClick={onRetry}>
            もう一度読み込む
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="stream">
      {message && <p className="note">{message}</p>}
      {groups.map((group) => (
        <section key={group.takenAt ?? "unknown"} className="stream-day" aria-label={takenAtLabel(group.takenAt)}>
          <h2 className="stream-day-title">
            {takenAtLabel(group.takenAt)}
            <span className="note"> {group.photos.length}枚</span>
          </h2>
          {group.photos.map((photo) => {
            const src = `/api/photo-files/${encodeURIComponent(photo.id)}`;
            const chosen = refs?.selected.has(photo.id) ?? false;
            return (
              <figure key={photo.id} className="stream-photo">
                <a className="stream-photo-frame" href={src} target="_blank" rel="noreferrer">
                  <Image src={src} alt={`${fieldId} ${takenAtLabel(photo.takenAt)}の写真`} fill sizes="(max-width: 640px) 100vw, 640px" />
                </a>
                {refs && (
                  <figcaption>
                    <button
                      type="button"
                      className={chosen ? "ref-toggle ref-toggle-on" : "ref-toggle"}
                      aria-pressed={chosen}
                      onClick={() => refs.onToggle(photo.id)}
                    >
                      {chosen ? "根拠にする ✓" : "根拠にする"}
                    </button>
                  </figcaption>
                )}
              </figure>
            );
          })}
        </section>
      ))}
    </div>
  );
}
