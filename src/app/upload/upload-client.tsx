"use client";

/** /upload の配線: Presenter（useUpload）を呼び、部品に props で配る（AGENTS.md §4） */
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useUpload } from "@/hooks/use-upload";
import { PassphraseForm } from "@/components/upload/passphrase-form";
import { PhotoCard } from "@/components/upload/photo-card";
import { PhrasedText } from "@/components/upload/phrased-text";

export function UploadClient() {
  const upload = useUpload();
  const summaryRef = useRef<HTMLDivElement>(null);

  // 送り終わったら、まとめを画面の中へ
  useEffect(() => {
    if (upload.summary) summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [upload.summary]);

  return (
    <div className="stack">
      <label className="button button-primary">
        {upload.items.length === 0 ? "写真を選ぶ" : "写真を足す"}
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
      {/* 撮影位置の約束は、読ませる前置きにせず、ボタンの下に小さく（11-07 精査 6 回目 #3） */}
      <p className="note upload-promise">撮影した場所は端末の外に出しません。送るのは近い畑の番号だけです</p>

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

      {/* 合言葉とまとめは一覧の下（送るボタンのすぐ上）に出し、出たら画面の中へ動かす */}
      {upload.needsPassphrase && (
        <PassphraseForm onSubmit={upload.login} message={upload.loginMessage} busy={upload.loggingIn} />
      )}

      {upload.summary && (
        <div ref={summaryRef} className="panel panel-ok stack">
          {/* 文ごとに行を分ける（途中で折れて読みにくくならないように） */}
          <div className="stack-tight">
            {upload.summary.split("。").map((sentence) => (
              <p key={sentence} className="label balance">
                <PhrasedText text={sentence} />
              </p>
            ))}
          </div>
          <Link className="button button-primary" href="/recent">
            新着を見る
          </Link>
          <button type="button" className="button" onClick={upload.clearSent}>
            続けて送る
          </button>
        </div>
      )}

      {(upload.sendableCount > 0 || upload.sending) && (
        <div className="action-bar">
          <button
            type="button"
            className="button button-primary button-block"
            disabled={upload.sending || upload.loggingIn}
            aria-busy={upload.sending}
            onClick={upload.sendAll}
          >
            {upload.sending ? (upload.progressLabel ?? "送っています…") : `送る（${upload.sendableCount}枚）`}
          </button>
        </div>
      )}
    </div>
  );
}
