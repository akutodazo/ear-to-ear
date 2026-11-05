/**
 * この畑の写真を縦に送る（新しい日が先、日付不明は最後。11-05）。1 枚ずつ大きく、写真ごとに番号・名前・日付の帯
 * （目安の帯と同じ形。送っても、どの畑の何日の写真かを見失わない。精査 #3）。
 * 判断を書いているときは、写真の下で「根拠」を選べる（選んだ写真は枠で分かる。精査 #7）。props だけで受け取る
 */
import Image from "next/image";
import Link from "next/link";
import type { PhotoGroup } from "@/services/photo-groups";
import { takenAtLabel } from "@/services/photo-labels";
import { IconCamera, IconPhoto } from "@/components/icons";

interface Props {
  groups: PhotoGroup[];
  fieldId: string;
  fieldName: string;
  loading: boolean;
  message: string | null;
  /** 読めなかったときの「もう一度読み込む」 */
  onRetry: () => void;
  /** 判断を書いているとき: 根拠に選んだ写真と、切り替え。無ければ選べない */
  refs?: { selected: ReadonlySet<string>; onToggle: (photoId: string) => void };
}

const NO_PHOTOS = "まだ確定した写真はありません";

export function PhotoStream({ groups, fieldId, fieldName, loading, message, onRetry, refs }: Props) {
  if (groups.length === 0) {
    const failed = !loading && message !== null && message !== NO_PHOTOS;
    return (
      <div className="stream-empty">
        <IconPhoto />
        {loading ? "写真を読み込んでいます" : (message ?? NO_PHOTOS)}
        {failed && (
          <button type="button" className="button button-small" onClick={onRetry}>
            もう一度読み込む
          </button>
        )}
        {!loading && !failed && (
          <Link className="button button-small" href="/upload">
            <IconCamera />
            写真を送る
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="stream">
      {message && <p className="note">{message}</p>}
      {groups.map((group) => (
        <section key={group.takenAt ?? "unknown"} className="stream-day" aria-label={takenAtLabel(group.takenAt)}>
          {group.photos.map((photo) => {
            const src = `/api/photo-files/${encodeURIComponent(photo.id)}`;
            const chosen = refs?.selected.has(photo.id) ?? false;
            return (
              <figure key={photo.id} className={chosen ? "stream-photo stream-photo-chosen" : "stream-photo"}>
                <a className="stream-photo-frame" href={src}>
                  <Image src={src} alt={`${fieldId} ${takenAtLabel(photo.takenAt)}の写真`} fill sizes="(max-width: 640px) 100vw, 640px" />
                  <span className="stream-caption">
                    <span className="stream-caption-title">
                      <span className="dock-id">{fieldId}</span> {fieldName}
                    </span>
                    <span className="stream-caption-date">{takenAtLabel(photo.takenAt)}</span>
                  </span>
                </a>
                {refs && (
                  <figcaption className="stream-photo-actions">
                    <button
                      type="button"
                      className={chosen ? "ref-toggle ref-toggle-on" : "ref-toggle"}
                      aria-pressed={chosen}
                      onClick={() => refs.onToggle(photo.id)}
                    >
                      {chosen ? "根拠 ✓" : "根拠にする"}
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
