"use client";

/**
 * 判断を残す（docs/design/screen-spec.md §2-2、DS §12-12）。状態の切り替え 2 つ、理由の切り替え、メモ、根拠の写真、主ボタン。
 * 入力の中身と結果は Presenter（useFieldStatus）が持つ。ここは props だけで受け取る。
 * 結果は押したボタンの直下に 1 行（DS §7-6）
 */
import Image from "next/image";
import type { StatusEvent, UploadedPhoto } from "@/types";
import { STATUS_REASONS, STATUS_REF_PHOTOS_MAX, type StatusReasonCode } from "@/config";
import type { StatusDraft } from "@/hooks/use-field-status";
import { noteCountLabel, statusLabel } from "@/services/status-view";
import { takenAtLabel } from "@/services/photo-labels";

const STATUSES: StatusEvent["status"][] = ["ready", "done"];

export function StatusForm({
  draft,
  photos,
  submitting,
  message,
  onChooseStatus,
  onToggleReason,
  onSetNote,
  onToggleRefPhoto,
  onSubmit,
}: {
  draft: StatusDraft;
  /** 根拠に選べる写真（この圃場に確定済み） */
  photos: UploadedPhoto[];
  submitting: boolean;
  message: { text: string; ok: boolean } | null;
  onChooseStatus: (status: StatusEvent["status"]) => void;
  onToggleReason: (code: StatusReasonCode) => void;
  onSetNote: (note: string) => void;
  onToggleRefPhoto: (photoId: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="panel stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!submitting) onSubmit();
      }}
    >
      <h2 className="day-heading">判断を残す</h2>

      <fieldset className="stack-tight" disabled={submitting}>
        <legend className="label">状態</legend>
        <div className="row">
          {STATUSES.map((status) => {
            const on = draft.status === status;
            return (
              <button
                key={status}
                type="button"
                className={on ? "button button-toggle button-toggle-on" : "button button-toggle"}
                aria-pressed={on}
                onClick={() => onChooseStatus(status)}
              >
                {statusLabel(status)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="stack-tight" disabled={submitting}>
        <legend className="label">理由（いくつでも。無くても残せます）</legend>
        <div className="row">
          {STATUS_REASONS.map((reason) => {
            const on = draft.reasons.includes(reason.code);
            return (
              <button
                key={reason.code}
                type="button"
                className={on ? "button button-small button-toggle button-toggle-on" : "button button-small button-toggle"}
                aria-pressed={on}
                onClick={() => onToggleReason(reason.code)}
              >
                {reason.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="stack-tight">
        <span className="label">メモ（任意）</span>
        <textarea
          className="input"
          rows={3}
          value={draft.note}
          disabled={submitting}
          onChange={(e) => onSetNote(e.target.value)}
        />
        <span className="note">{noteCountLabel(draft.note)}</span>
      </label>

      {photos.length > 0 && (
        <fieldset className="stack-tight" disabled={submitting}>
          <legend className="label">
            根拠の写真（{STATUS_REF_PHOTOS_MAX}枚まで、{draft.refPhotoIds.length}枚選択）
          </legend>
          <ul className="photo-grid">
            {photos.map((photo) => {
              const on = draft.refPhotoIds.includes(photo.id);
              const day = takenAtLabel(photo.takenAt);
              return (
                <li key={photo.id}>
                  <button
                    type="button"
                    className={on ? "thumb thumb-selected" : "thumb"}
                    aria-pressed={on}
                    aria-label={`${day}の写真を根拠に${on ? "選んでいます" : "選ぶ"}`}
                    onClick={() => onToggleRefPhoto(photo.id)}
                  >
                    <Image
                      src={`/api/photo-files/${encodeURIComponent(photo.id)}`}
                      alt=""
                      fill
                      sizes="(max-width: 600px) 33vw, 200px"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <button type="submit" className="button button-primary" disabled={submitting} aria-busy={submitting}>
        {submitting ? "残しています…" : "判断を残す"}
      </button>
      {message && <p className={message.ok ? "note note-ok" : "note note-alert"}>{message.text}</p>}
    </form>
  );
}
