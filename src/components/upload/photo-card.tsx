/** 送る前の写真1枚（プレビュー・撮影日・候補・番号の選択・結果）。props だけで受け取る */
import Image from "next/image";
import type { UploadItem } from "@/lib/upload-steps";
import { candidateSummary, takenAtLabel } from "@/services/photo-labels";
import type { Field } from "@/types";

export function PhotoCard({
  item,
  fields,
  disabled,
  onChoose,
  onRemove,
}: {
  item: UploadItem;
  fields: Field[];
  disabled: boolean;
  onChoose: (key: string, fieldId: string | null) => void;
  onRemove: (key: string) => void;
}) {
  const locked = disabled || item.status === "sending" || item.status === "sent" || item.status === "duplicate";
  const unusable = item.status === "unusable";
  const candidates = candidateSummary(item.candidates);
  return (
    <article className="card">
      <div className="thumb">
        {unusable ? (
          <p className="thumb-empty">開けない写真</p>
        ) : (
          <Image src={item.previewUrl} alt={item.fileName} fill sizes="(max-width: 600px) 100vw, 400px" />
        )}
      </div>
      <div className="stack-tight">
        {!unusable && (
          <>
            <p>撮影日: {item.info ? takenAtLabel(item.info.takenAt) : "読み取り中…"}</p>
            {candidates === null ? (
              <p>候補: なし（位置が取れない写真は、管理者が番号を付けます）</p>
            ) : (
              <>
                <p>
                  候補: <span className="label nowrap">{candidates.primary}</span>
                </p>
                {candidates.others && <p className="note">ほかの候補: {candidates.others}</p>}
              </>
            )}
            <label className="stack-tight">
              番号を選ぶ（分かるときだけ）
              <select
                className="input"
                value={item.chosenFieldId ?? ""}
                disabled={locked}
                onChange={(e) => onChoose(item.key, e.target.value === "" ? null : e.target.value)}
              >
                <option value="">選ばない</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} {f.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {item.message && (
          <p
            className={
              item.status === "sent"
                ? "note note-ok"
                : item.status === "sending" || item.status === "duplicate"
                  ? "note"
                  : "note note-alert"
            }
          >
            {item.message}
          </p>
        )}
        {!locked && (
          <button type="button" className="button button-small" onClick={() => onRemove(item.key)}>
            外す
          </button>
        )}
      </div>
    </article>
  );
}
