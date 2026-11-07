"use client";

/** 管理者の「確定・変更」（写真1枚ぶん）。候補を「推定」として先に出す。props だけで受け取る */
import { useState } from "react";
import type { Field, UploadedPhoto } from "@/types";
import type { AssignStatus } from "@/hooks/use-recent";
import { PhrasedText } from "@/components/upload/phrased-text";
import { assignButtonLabel, assignmentOptionGroups, canAssign, initialAssignment } from "@/services/assignment";

export function AssignmentForm({
  photo,
  fields,
  status,
  onAssign,
}: {
  photo: UploadedPhoto;
  fields: Field[];
  status: AssignStatus | undefined;
  onAssign: (photoId: string, fieldId: string) => void;
}) {
  const [selected, setSelected] = useState(() => initialAssignment(photo, fields));
  const busy = status?.busy ?? false;
  return (
    <form
      className="stack-tight"
      onSubmit={(e) => {
        e.preventDefault();
        if (canAssign(photo, selected, fields)) onAssign(photo.id, selected);
      }}
    >
      <label className="stack-tight">
        <span>
          <PhrasedText keepParens text="番号を決める（管理者）" />
        </span>
        <select className="input" value={selected} disabled={busy} onChange={(e) => setSelected(e.target.value)}>
          {selected === "" && <option value="">選んでください</option>}
          {assignmentOptionGroups(photo, fields).map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((o) => (
                <option key={o.fieldId} value={o.fieldId}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <button type="submit" className="button" disabled={busy || !canAssign(photo, selected, fields)}>
        {busy ? "送っています…" : assignButtonLabel(photo)}
      </button>
      {status?.message && <p className={status.ok ? "note note-ok" : "note"}>{status.message}</p>}
    </form>
  );
}
