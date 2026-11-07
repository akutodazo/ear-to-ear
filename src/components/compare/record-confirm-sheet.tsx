"use client";

/**
 * 「記録する」を押した後に確かめるシート（みっきぃ 6、#219）。LINE のグループに届くのと同じ文を、トークの吹き出しの形で見せる。
 * 根拠の写真の 1 枚目は LINE のサムネイルになるので、吹き出しの上に同じ形で出す。「いいえ」・Esc・暗がりで閉じる。props だけで受け取る
 */
import Image from "next/image";
import type { RecordConfirmView } from "@/services/record-confirm-view";
import { Sheet } from "@/components/sheet";
import { IconLink } from "@/components/icons";
import { PhrasedText } from "@/components/upload/phrased-text";

interface Props {
  view: RecordConfirmView;
  fieldLabel: string;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RecordConfirmSheet({ view, fieldLabel, submitting, onConfirm, onCancel }: Props) {
  return (
    <Sheet title="この判断を記録しますか？" onClose={submitting ? () => undefined : onCancel}>
      <p className="confirm-lead">
        <PhrasedText text="記録すると、委員の LINE のグループにこの内容が届きます。" />
      </p>
      <figure className="confirm-preview" aria-label="LINE に届く内容">
        <div className="confirm-bubble">
          {view.lines.map((line, i) => (
            <p key={i} className={i === 0 ? "confirm-line confirm-line-head" : "confirm-line"}>
              {line}
            </p>
          ))}
          <p className="confirm-line confirm-line-url">
            <IconLink />
            <span>
              <PhrasedText text={view.urlNote} />
            </span>
          </p>
          {view.thumbnailPhotoId !== null ? (
            <div className="confirm-thumb">
              <Image
                src={`/api/photo-files/${encodeURIComponent(view.thumbnailPhotoId)}`}
                alt={`${fieldLabel}の根拠の写真（LINE のサムネイルになる）`}
                fill
                sizes="320px"
              />
            </div>
          ) : (
            <p className="confirm-thumb-none">
              <PhrasedText text="根拠の写真が無いので、LINE には文字だけが届きます" />
            </p>
          )}
        </div>
        <figcaption className="confirm-caption">メモは LINE には出ません</figcaption>
      </figure>
      <div className="confirm-actions">
        <button type="button" className="button" onClick={onCancel} disabled={submitting}>
          いいえ
        </button>
        <button type="button" className="button button-primary" onClick={onConfirm} disabled={submitting} aria-busy={submitting}>
          {submitting ? "記録しています…" : "はい、記録する"}
        </button>
      </div>
    </Sheet>
  );
}
