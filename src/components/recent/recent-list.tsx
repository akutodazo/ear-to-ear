/** 新着の一覧。一覧では番号・日付・写真だけ（数字は控えめに。docs/spec.md §7）。props だけで受け取る */
import Image from "next/image";
import type { UploadedPhoto } from "@/types";
import { assignmentLabel, takenAtLabel } from "@/services/photo-labels";

export function RecentList({ photos }: { photos: UploadedPhoto[] }) {
  return (
    <ul className="cards">
      {photos.map((photo) => (
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
  );
}
