/**
 * 新着の一覧。1枚を1行（左に小さな写真、右に印・番号・日付）にして、1画面で多く見られるようにする。
 * 一覧では番号・日付・写真だけ（数字は控えめに。docs/spec.md §7）。props だけで受け取る
 */
import Image from "next/image";
import type { Field, UploadedPhoto } from "@/types";
import type { AssignStatus } from "@/hooks/use-recent";
import { assignmentLabel, takenAtLabel } from "@/services/photo-labels";
import { assignmentBadge } from "@/services/recent-view";
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
      {photos.map((photo) => {
        const badge = assignmentBadge(photo);
        return (
          <li key={photo.id}>
            <article className={`card card-row card-${badge.tone}`}>
              <div className="thumb thumb-small">
                <Image
                  src={`/api/photo-files/${encodeURIComponent(photo.id)}`}
                  alt={assignmentLabel(photo)}
                  fill
                  sizes="120px"
                />
              </div>
              <div className="stack-tight">
                <p>
                  <span className={`badge badge-${badge.tone}`}>{badge.badge}</span>
                </p>
                <p className="label">{badge.text}</p>
                <p className="note">{takenAtLabel(photo.takenAt)}</p>
              </div>
              {admin && (
                <div className="card-row-full">
                  <AssignmentForm
                    photo={photo}
                    fields={admin.fields}
                    status={admin.status[photo.id]}
                    onAssign={admin.onAssign}
                  />
                </div>
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
