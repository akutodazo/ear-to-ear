/** 送る前の写真1枚（プレビュー・撮影日・候補・番号の選択・結果）。props だけで受け取る */
import Image from "next/image";
import type { UploadItem } from "@/hooks/use-upload";
import { candidateLabel, takenAtLabel } from "@/services/photo-labels";
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
  const locked = disabled || item.status === "sending" || item.status === "sent";
  return (
    <article className="card">
      <div className="thumb">
        <Image src={item.previewUrl} alt={item.fileName} fill sizes="(max-width: 600px) 100vw, 400px" />
      </div>
      <div className="stack-tight">
        <p>撮影日: {item.info ? takenAtLabel(item.info.takenAt) : "読み取り中…"}</p>
        <p>
          候補:{" "}
          {item.candidates.length === 0
            ? "なし（位置が取れない写真は、管理者が番号を付けます）"
            : item.candidates.map((c) => candidateLabel(c.fieldId, c.meters)).join("・")}
        </p>
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
        {item.message && <p className={item.status === "sent" ? "note note-ok" : "note"}>{item.message}</p>}
        {!locked && (
          <button type="button" className="button button-small" onClick={() => onRemove(item.key)}>
            外す
          </button>
        )}
      </div>
    </article>
  );
}
