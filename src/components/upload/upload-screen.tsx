"use client";

/**
 * /upload の画面（docs/spec.md §7）。配線は useUpload、部品は props だけで受け取る。
 * 屋外・手袋を想定して、ボタンは大きく、数字は控えめに。
 */
import Image from "next/image";
import { useState } from "react";
import { useUpload, type UploadItem } from "@/hooks/use-upload";
import { candidateLabel, takenAtLabel } from "@/services/photo-labels";
import type { Field } from "@/types";

export function UploadScreen() {
  const upload = useUpload();
  const readyCount = upload.items.filter((i) => i.status === "ready" || i.status === "failed").length;

  return (
    <div className="stack">
      {upload.needsPassphrase && <PassphraseForm onSubmit={upload.login} message={upload.loginMessage} />}

      <label className="button button-primary">
        写真を選ぶ
        <input
          type="file"
          accept="image/jpeg"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) upload.addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <ul className="cards">
        {upload.items.map((item) => (
          <li key={item.key}>
            <PhotoCard item={item} fields={upload.fields} onChoose={upload.choose} onRemove={upload.remove} />
          </li>
        ))}
      </ul>

      {upload.items.length > 0 && (
        <button type="button" className="button button-primary" disabled={readyCount === 0} onClick={upload.sendAll}>
          送る（{readyCount}枚）
        </button>
      )}
    </div>
  );
}

function PassphraseForm({
  onSubmit,
  message,
}: {
  onSubmit: (passphrase: string) => void;
  message: string | null;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="panel stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <label className="stack-tight">
        合言葉
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      {message && <p className="note">{message}</p>}
      <button type="submit" className="button">
        入る
      </button>
    </form>
  );
}

function PhotoCard({
  item,
  fields,
  onChoose,
  onRemove,
}: {
  item: UploadItem;
  fields: Field[];
  onChoose: (key: string, fieldId: string | null) => void;
  onRemove: (key: string) => void;
}) {
  const sending = item.status === "sending";
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
            disabled={sending || item.status === "sent"}
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
        {item.status !== "sent" && !sending && (
          <button type="button" className="button button-small" onClick={() => onRemove(item.key)}>
            外す
          </button>
        )}
      </div>
    </article>
  );
}
