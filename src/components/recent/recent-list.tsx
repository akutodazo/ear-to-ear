/** 新着の一覧。一覧では番号・日付・写真だけ（数字は控えめに。docs/spec.md §7）。props だけで受け取る */
import Image from "next/image";
import type { Field, UploadedPhoto } from "@/types";
import type { AssignStatus } from "@/hooks/use-recent";
import { assignmentLabel, takenAtLabel } from "@/services/photo-labels";
import { AssignmentForm } from "./assignment-form";

/** 管理者の端末のときだけ渡す */
export interface RecentAdmin {
  fields: Field[];
  status: Record<string, AssignStatus>;
  onAssign: (photoId: string, fieldId: string) => void;
}

export function RecentList({ photos, admin = null }: { photos: UploadedPhoto[]; admin?: RecentAdmin | null }) {
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
            {admin && (
              <AssignmentForm
                photo={photo}
                fields={admin.fields}
                status={admin.status[photo.id]}
                onAssign={admin.onAssign}
              />
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
