/**
 * 圃場ページの写真。撮影日ごとの枠（新しい日が先、日付不明は最後）に、小さな写真を並べる。
 * 写真を押すと元の大きさで開く。props だけで受け取る
 */
import Image from "next/image";
import type { PhotoGroup } from "@/services/photo-groups";
import { takenAtLabel } from "@/services/photo-labels";

export function PhotoGroupsView({ groups, fieldId }: { groups: PhotoGroup[]; fieldId: string }) {
  return (
    <div className="stack">
      {groups.map((group) => {
        const day = takenAtLabel(group.takenAt);
        return (
          <section key={group.takenAt ?? "unknown"} className="stack-tight">
            <h2 className="day-heading">
              {day}
              <span className="note"> {group.photos.length}枚</span>
            </h2>
            <ul className="photo-grid">
              {group.photos.map((photo) => {
                const src = `/api/photo-files/${encodeURIComponent(photo.id)}`;
                return (
                  <li key={photo.id}>
                    <a className="thumb" href={src} target="_blank" rel="noreferrer">
                      <Image src={src} alt={`${fieldId} ${day}の写真`} fill sizes="(max-width: 600px) 33vw, 200px" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
