"use client";

/**
 * /fields/[id] の配線: Presenter（写真・判断・引き継ぎメモ）を呼び、部品に props で配る（AGENTS.md §4）。
 * 並びは docs/design/screen-spec.md §2-2 のうち、いまある API で作れる節だけ: 写真 → 判断を残す → 記録（履歴・メモ）。
 * 目安の畑との比較・昨年の同じ週・順番は、仕様が決まってから足す
 */
import { useMemo } from "react";
import { useFieldPhotos } from "@/hooks/use-field-photos";
import { useFieldStatus } from "@/hooks/use-field-status";
import { useHandover } from "@/hooks/use-handover";
import { PhotoGroupsView } from "@/components/field/photo-groups-view";
import { StatusForm } from "@/components/field/status-form";
import { StatusHistory } from "@/components/field/status-history";
import { HandoverMemo } from "@/components/field/handover-memo";
import { PassphraseForm } from "@/components/upload/passphrase-form";
import { handoverCreatedLabel } from "@/services/handover-labels";

export function FieldClient({ fieldId }: { fieldId: string }) {
  const field = useFieldPhotos(fieldId);
  const status = useFieldStatus(fieldId, field.confirmedPhotoIds);
  const handover = useHandover(fieldId);
  const photos = useMemo(() => field.groups.flatMap((g) => g.photos), [field.groups]);

  const refreshAll = () => {
    void field.refresh();
    void status.refreshHistory();
    void handover.refresh();
  };
  const loading = field.loading || status.historyLoading || handover.loading;

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="button button-primary" onClick={refreshAll} disabled={loading}>
          {loading ? "読み込み中…" : "更新"}
        </button>
        {field.fetchedAt && (
          <span className="note">
            {field.fetchedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 時点
          </span>
        )}
      </div>

      <section className="stack-tight">
        <h2 className="day-heading">今年の写真</h2>
        {field.message && <p className="note">{field.message}</p>}
        <PhotoGroupsView groups={field.groups} fieldId={fieldId} />
      </section>

      <StatusForm
        draft={status.draft}
        photos={photos}
        submitting={status.submitting}
        message={status.formMessage}
        onChooseStatus={status.chooseStatus}
        onToggleReason={status.toggleReason}
        onSetNote={status.setNote}
        onToggleRefPhoto={status.toggleRefPhoto}
        onSubmit={status.submit}
      />
      {status.needsPassphrase && (
        <PassphraseForm
          lead="判断を残す・取り消すには合言葉が要ります。入った後に、もう一度押してください。"
          submitLabel="入る"
          message={status.loginMessage}
          busy={status.loggingIn}
          onSubmit={status.login}
        />
      )}

      <StatusHistory
        events={status.history}
        loading={status.historyLoading}
        message={status.historyMessage}
        revokeStatus={status.revokeStatus}
        onRevoke={status.revoke}
      />

      <HandoverMemo
        sentences={handover.sentences}
        createdLabel={handover.note ? handoverCreatedLabel(handover.note) : null}
        loading={handover.loading}
        message={handover.message}
        creating={handover.creating}
        createMessage={handover.createMessage}
        onCreate={handover.create}
      />
      {handover.needsPassphrase && (
        <PassphraseForm
          lead="メモを作るには管理者の合言葉が要ります。入った後に、もう一度「メモを作る」を押してください。"
          submitLabel="入る"
          message={handover.loginMessage}
          busy={handover.loggingIn}
          onSubmit={handover.login}
        />
      )}
    </div>
  );
}
