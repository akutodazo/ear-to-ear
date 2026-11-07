/**
 * 「記録する」の前に確かめるシートの中身（みっきぃ 6、#219）。LINE のグループに届くのと同じ文を見せる。純粋関数。
 * 文は lineNoticeText に任せて二重に書かない。URL（判断のページ）は記録の後に番号が決まるので、代わりの一言を出す。
 * メモは LINE に出ないので載せない
 */
import type { StatusDraft } from "@/hooks/use-field-status";
import { lineNoticeText } from "./line-notice";

export const RECORD_CONFIRM_URL_NOTE = "この判断のページの URL（記録すると付きます）";

export interface RecordConfirmView {
  /** LINE の本文の URL より前の行（番号と状態・理由・日時） */
  lines: string[];
  urlNote: string;
  /** 根拠の写真の 1 枚目（LINE のサムネイルになる）。無ければ null */
  thumbnailPhotoId: string | null;
}

export function recordConfirmView(input: { fieldId: string; draft: StatusDraft; nowMs: number }): RecordConfirmView | null {
  const { fieldId, draft, nowMs } = input;
  if (draft.status === null) return null;
  const text = lineNoticeText(
    {
      id: 0,
      fieldId,
      status: draft.status,
      reasons: draft.reasons,
      note: null,
      refPhotoIds: draft.refPhotoIds,
      actorDevice: "",
      at: new Date(nowMs).toISOString(),
      revokedAt: null,
    },
    "recorded",
    "",
  );
  return {
    lines: text.split("\n").slice(0, 3),
    urlNote: RECORD_CONFIRM_URL_NOTE,
    thumbnailPhotoId: draft.refPhotoIds[0] ?? null,
  };
}
