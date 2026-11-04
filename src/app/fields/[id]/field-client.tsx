"use client";

/** /fields/[id] の配線: Presenter（useFieldPhotos）を呼び、部品に props で配る（AGENTS.md §4） */
import { useFieldPhotos } from "@/hooks/use-field-photos";
import { PhotoGroupsView } from "@/components/field/photo-groups-view";

export function FieldClient({ fieldId }: { fieldId: string }) {
  const field = useFieldPhotos(fieldId);
  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="button button-primary" onClick={field.refresh} disabled={field.loading}>
          {field.loading ? "読み込み中…" : "更新"}
        </button>
        {field.fetchedAt && (
          <span className="note">
            {field.fetchedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 時点
          </span>
        )}
      </div>
      {field.message && <p className="note">{field.message}</p>}
      <PhotoGroupsView groups={field.groups} fieldId={fieldId} />
    </div>
  );
}
