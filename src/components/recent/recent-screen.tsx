"use client";

/**
 * /recent の画面（docs/spec.md §7）。「更新」と最終取得時刻。一覧では番号・日付・写真だけ（数字は控えめに）。
 */
import Image from "next/image";
import { useRecent } from "@/hooks/use-recent";
import { assignmentLabel, takenAtLabel } from "@/services/photo-labels";

export function RecentScreen() {
  const recent = useRecent();

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="button button-primary" onClick={recent.refresh} disabled={recent.loading}>
          {recent.loading ? "読み込み中…" : "更新"}
        </button>
        {recent.fetchedAt && (
          <span className="note">
            {recent.fetchedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 時点
          </span>
        )}
      </div>
      {recent.message && <p className="note">{recent.message}</p>}
      <ul className="cards">
        {recent.photos.map((photo) => (
          <li key={photo.id}>
            <article className="card">
              <div className="thumb">
                <Image
                  src={`/api/photo-files/${encodeURIComponent(photo.id)}`}
                  alt={assignmentLabel(photo)}
                  fill
                  sizes="(max-width: 600px) 100vw, 400px"
                />
              </div>
              <p className="label">{assignmentLabel(photo)}</p>
              <p className="note">{takenAtLabel(photo.takenAt)}</p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
