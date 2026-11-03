"use client";

/** /upload の配線: Presenter（useUpload）を呼び、部品に props で配る（AGENTS.md §4） */
import { useUpload } from "@/hooks/use-upload";
import { PassphraseForm } from "@/components/upload/passphrase-form";
import { PhotoCard } from "@/components/upload/photo-card";

export function UploadClient() {
  const upload = useUpload();
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
          disabled={upload.sending}
          onChange={(e) => {
            if (e.target.files) upload.addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <ul className="cards">
        {upload.items.map((item) => (
          <li key={item.key}>
            <PhotoCard
              item={item}
              fields={upload.fields}
              disabled={upload.sending}
              onChoose={upload.choose}
              onRemove={upload.remove}
            />
          </li>
        ))}
      </ul>

      {upload.items.length > 0 && (
        <button
          type="button"
          className="button button-primary"
          disabled={upload.sending || upload.sendableCount === 0}
          onClick={upload.sendAll}
        >
          {upload.sending ? "送っています…" : `送る（${upload.sendableCount}枚）`}
        </button>
      )}
    </div>
  );
}
