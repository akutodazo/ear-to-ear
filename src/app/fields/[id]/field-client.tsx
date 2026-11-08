"use client";

/**
 * /fields/[id] の配線。下の帯の「詳細」と「比較」（#compare）を同じ画面で切り替える（#195。西田 PM 11-07「それぞれがメインになるように」）。
 * 詳細: 主役の写真 → 判断の段（今の判断・2 ボタン・取り消し）→ 順番の段（付ける・外す）→ 写真の流れ → 昨年の同じ頃 → 判断の履歴（畳む）→ 引き継ぎメモ（委員長だけ）。
 * 比較: 「同じ日に撮った別の畑と」（上下 2 つの窓）と「この畑の前の日と」（重ねる）を帯の間いっぱいに。判断の操作は置かない（AGENTS.md §4）
 */
import { useEffect, useMemo, useRef, useState } from "react";
import fieldsData from "@/data/fields.json";
import benchmarksData from "@/data/benchmarks.json";
import seasonsData from "@/data/seasons.json";
import type { Benchmark, Field, StatusEvent } from "@/types";
import { useFieldPhotos } from "@/hooks/use-field-photos";
import { useFieldStatus } from "@/hooks/use-field-status";
import { useHandover } from "@/hooks/use-handover";
import { useDistrictOrder } from "@/hooks/use-district-order";
import { useFieldView } from "@/hooks/use-field-view";
import { benchmarkFor } from "@/services/parcel-geometry";
import { lastSeasonFor, lastSeasonLines, monthDay, seasonDatesFromEvents, type SeasonRecord } from "@/services/last-season";
import { compareSlots, daysOf, partnerOptions } from "@/services/photo-compare";
import { useCompareSelection } from "@/hooks/use-compare-selection";
import { canSubmitStatus, refRequiredNote } from "@/services/status-view";
import { handoverCreatedLabel } from "@/services/handover-labels";
import { memoOfferLabel } from "@/services/memo-offer";
import {
  decideResult,
  heroMeta,
  judgmentLine,
  latestLiveEvent,
  rankLineState,
  rankLineView,
  rankOf,
  showHandoverTo,
} from "@/services/detail-view";
import { CompareControls } from "@/components/compare/compare-controls";
import { SplitViewer, type PartnerPicker } from "@/components/compare/split-viewer";
import { FieldSwitcher } from "@/components/compare/field-switcher";
import { PhotoStream } from "@/components/compare/photo-stream";
import { LastSeasonNote } from "@/components/compare/last-season-note";
import { useDemoToday, useLastSeasonMemo } from "@/hooks/use-last-season-memo";
import { useHashIs } from "@/hooks/use-hash-is";
import { StatusPanel } from "@/components/compare/status-panel";
import { StatusActions } from "@/components/compare/status-actions";
import { RecordConfirmSheet } from "@/components/compare/record-confirm-sheet";
import { recordConfirmView } from "@/services/record-confirm-view";
import { StatusHistory } from "@/components/compare/status-history";
import { HandoverMemo } from "@/components/field/handover-memo";
import { FieldHero } from "@/components/field/field-hero";
import { DecideBlock } from "@/components/field/decide-block";
import { RankLine } from "@/components/field/rank-line";
import { PassphraseForm } from "@/components/upload/passphrase-form";
import { AppNav } from "@/components/app-nav";
import { AccountChip } from "@/components/account-chip";
import { useRole } from "@/hooks/use-role";
import { appNavHrefs, navCurrent } from "@/services/app-nav-view";
import { compareStageNote } from "@/services/compare-note";
import { IconDetail, IconPen, IconPhoto } from "@/components/icons";
import { PhrasedText } from "@/components/upload/phrased-text";

const fields: Field[] = fieldsData;
const benchmarks: Benchmark[] = benchmarksData;
const seasons: SeasonRecord[] = seasonsData;
/** 今年。作付けの年の層はまだ無いので、固定（地図と同じ） */
const SEASON = "2026";

export function FieldClient({ field }: { field: Field }) {
  // デモで今日を差し替えているときの表示（精査 4 回目 #5）
  const demoDate = useDemoToday();
  const account = useRole();
  const [view, setView] = useFieldView();
  const districtFields = useMemo(() => fields.filter((f) => f.district === field.district), [field.district]);
  const fieldsById = useMemo(() => Object.fromEntries(districtFields.map((f) => [f.id, f])) as Record<string, Field>, [districtFields]);
  const benchmarkId = benchmarkFor(benchmarks, SEASON, field.district);

  const photos = useFieldPhotos(field.id);
  // 地区の写真・判断のまとめ・刈る順番（順番の段と比較が使う）
  const districtOrder = useDistrictOrder(field.district, SEASON);
  const district = districtOrder.photos;
  const districtIds = districtOrder.districtIds;
  const order = districtOrder.order;
  const status = useFieldStatus(field.id, photos.confirmedPhotoIds);
  const handover = useHandover(field.id);
  const isAdmin = showHandoverTo(account.role);
  // 来年の引き継ぎ（5 段目）: 昨年の判断の頃だけ、昨年のメモを「昨年の同じ頃」の下に（委員長だけ）
  const lastMemo = useLastSeasonMemo(field.id, SEASON);
  // 地図の板の「昨年の引き継ぎ あり」から来たら、畳んだ全文を開いておく
  const fromDock = useHashIs("last-season");
  const scrolledToMemo = useRef(false);
  const contentReady = !photos.loading && !district.loading;
  useEffect(() => {
    if (!fromDock || lastMemo === null || !contentReady || scrolledToMemo.current) return;
    scrolledToMemo.current = true;
    document.getElementById("last-season")?.scrollIntoView({ block: "start" });
  }, [fromDock, lastMemo, contentReady]);
  const [writing, setWriting] = useState(false);

  // 比べ方の選択（詳細と切り替えても残す）。並べる写真と空の文は Service が決める
  const { mode, setMode, days, ownDays, sameDay, sameField, setDate, setPartner, setEarlier } = useCompareSelection(
    district.byField,
    field.id,
    benchmarkId,
    districtIds,
  );
  const { date, top, bottom } = compareSlots({ days, selfId: field.id, mode, sameDay, sameField, fieldsById, benchmarkId });
  const stageNote = compareStageNote({
    loading: district.loading,
    ownFailed: district.failed.includes(field.id),
    ownDayCount: ownDays.length,
    hasPartner: top !== null,
    mode,
    date,
    selfId: field.id,
    benchmarkId,
    benchmarkHasPhotos: benchmarkId !== null && daysOf(days, benchmarkId).length > 0,
  });
  const picker: PartnerPicker | undefined =
    mode === "same-day" && sameDay.date !== null && sameDay.partnerId !== null
      ? {
          title: `${monthDay(sameDay.date)} に撮った畑`,
          options: partnerOptions(sameDay, fieldsById, benchmarkId),
          currentId: sameDay.partnerId,
          onPick: setPartner,
        }
      : undefined;

  const latestJudgment = useMemo(() => latestLiveEvent(status.history), [status.history]);
  const thisSeason = useMemo(() => seasonDatesFromEvents(status.history), [status.history]);
  const seasonLines = lastSeasonLines(lastSeasonFor(seasons, field.id, SEASON), SEASON, thisSeason);
  const recorded = status.formMessage?.ok === true;
  const open = writing && !recorded;
  // 判断の入力を開いたら、判断の行を上の帯のすぐ下へ
  useEffect(() => {
    if (open) document.querySelector(".decide")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [open]);
  const [memoAsked, setMemoAsked] = useState(false);
  const memoOffer = isAdmin ? memoOfferLabel({ recorded, asked: memoAsked, hasMemo: handover.sentences.length > 0 }) : null;
  const createMemoFromRecord = () => {
    setMemoAsked(true);
    document.getElementById("handover-memo")?.scrollIntoView({ block: "start", behavior: "smooth" });
    handover.create();
  };
  // 2 ボタン: 押した状態で入力を開く。開いている間に反対を押すと状態だけ切り替える
  const choose = (kind: StatusEvent["status"]) => {
    if (!open) {
      status.resetDraft();
      setMemoAsked(false);
      setWriting(true);
    }
    status.chooseStatus(kind);
  };
  const stopWriting = () => {
    status.resetDraft();
    setWriting(false);
  };
  // 取り消しの結果の 1 行（判断の行の下）
  const [revokedId, setRevokedId] = useState<number | null>(null);
  const revokeMessage = revokedId === null ? null : (status.revokeStatus[revokedId]?.message ?? null);
  const revoke = (id: number) => {
    setRevokedId(id);
    status.revoke(id);
  };
  const result = decideResult({ recorded, formMessage: status.formMessage, revokeMessage });

  // 主役の写真: 最新の確定済み
  const latestGroup = photos.groups[0] ?? null;
  const latestPhoto = latestGroup?.photos[0] ?? null;
  const photoCount = photos.groups.reduce((n, g) => n + g.photos.length, 0);

  // 順番の段
  const rank = rankOf(order.order?.ranked ?? [], field.id);
  const isDone = latestJudgment?.status === "done";
  const rankView =
    order.order === null
      ? null
      : rankLineView({
          rank,
          state: rankLineState({ differsFromConfirmed: order.differsFromConfirmed, savedState: order.saved?.state ?? null, dirty: order.dirty }),
          confirmedAt: order.saved?.confirmedAt ?? null,
        });

  const refSet = useMemo(() => new Set(status.draft.refPhotoIds), [status.draft.refPhotoIds]);
  const submitCondition = { status: status.draft.status, refCount: status.draft.refPhotoIds.length, selectablePhotoCount: photos.confirmedPhotoIds.size };
  const hrefs = appNavHrefs(field.id, field.id);
  // 「記録する」を押した後の確かめるシート（LINE に届く内容、#219）
  const confirmView =
    status.confirmingAt === null ? null : recordConfirmView({ fieldId: field.id, draft: status.draft, nowMs: status.confirmingAt });

  return (
    <div className={view === "compare" ? "compare compare-full" : "compare detail"}>
      <header className="topbar compare-topbar">
        <FieldSwitcher fields={districtFields} currentId={field.id} benchmarkId={benchmarkId} hash={view === "compare" ? "compare" : undefined} />
        {/* 詳細は下の帯に無いので、比較からはここで戻る（#216） */}
        {view === "compare" && (
          <button type="button" className="topbar-detail" onClick={() => setView("detail")}>
            <IconDetail />
            詳細
          </button>
        )}
        <AccountChip
          role={account.role}
          pending={account.pending}
          signInMessage={account.signInMessage}
          signOutMessage={account.signOutMessage}
          onSignIn={account.signIn}
          onSignOut={account.signOut}
        />
      </header>
      {view === "compare" ? (
        <div className="compare-body compare-stage-body">
          <CompareControls
            mode={mode}
            onMode={setMode}
            days={ownDays}
            date={date}
            onDate={setDate}
            earlierOptions={sameField.earlierOptions}
            earlier={sameField.earlier}
            onEarlier={setEarlier}
          />
          <div className="compare-stage">
            {top && bottom ? (
              <SplitViewer kind={mode === "same-day" ? "stack" : "overlay"} top={top} bottom={bottom} topTag={mode === "same-field" ? "前の日" : undefined} picker={picker} />
            ) : (
              <div className="stage-empty stage-empty-dark">
                <IconPhoto />
                {stageNote}
                {district.failed.length > 0 && (
                  <button type="button" className="button button-small" onClick={district.refresh}>
                    もう一度読み込む
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="compare-body detail-body">
          <FieldHero
            fieldId={field.id}
            fieldName={field.name}
            benchmark={field.id === benchmarkId}
            photoId={latestPhoto?.id ?? null}
            meta={latestGroup ? heroMeta(latestGroup.takenAt, photoCount, SEASON) : null}
            loading={photos.loading}
            failed={!photos.loading && photos.groups.length === 0 && photos.message !== null && photos.message !== "まだ確定した写真はありません"}
            onRetry={photos.refresh}
          />
          <DecideBlock
            line={judgmentLine(latestJudgment)}
            status={latestJudgment?.status ?? null}
            loading={status.historyLoading && latestJudgment === null}
            revocableId={latestJudgment?.id ?? null}
            revoking={latestJudgment !== null && (status.revokeStatus[latestJudgment.id]?.busy ?? false)}
            onRevoke={revoke}
            choosing={open ? status.draft.status : null}
            onChoose={choose}
            result={result}
          />
          {status.needsPassphrase && !open && (
            <PassphraseForm
              lead="判断を取り消すには合言葉が要ります。入った後に、もう一度押してください。"
              submitLabel="入る"
              message={status.loginMessage}
              busy={status.loggingIn}
              onSubmit={status.login}
            />
          )}
          {memoOffer && (
            <button type="button" className="button button-small memo-offer" onClick={createMemoFromRecord} disabled={handover.creating}>
              <IconPen />
              <span>
                <PhrasedText keepParens text={memoOffer} />
              </span>
            </button>
          )}
          {open && (
            <StatusPanel
              draft={status.draft}
              onChooseStatus={status.chooseStatus}
              onToggleReason={status.toggleReason}
              onNote={status.setNote}
              onSubmit={status.requestSubmit}
              needsPassphrase={status.needsPassphrase}
              loginMessage={status.loginMessage}
              loggingIn={status.loggingIn}
              onLogin={status.login}
              showStatusChoice={false}
            />
          )}
          {!isDone && (
            <RankLine
              view={rankView}
              rank={rank}
              href={`/order#${field.id}`}
              loading={order.order === null && !districtOrder.failed}
              failed={districtOrder.failed}
              onToggle={() => order.toggle(field.id)}
            />
          )}
          <PhotoStream
            groups={photos.groups}
            fieldId={field.id}
            fieldName={field.name}
            loading={photos.loading}
            message={photos.message}
            onRetry={photos.refresh}
            refs={open ? { selected: refSet, onToggle: status.toggleRefPhoto } : undefined}
          />
          <LastSeasonNote lines={seasonLines} memo={isAdmin ? lastMemo : null} memoOpen={fromDock} />
          {status.history.length > 0 && (
            <details className="history-fold">
              <summary className="history-summary">
                判断の履歴<span className="history-count">{status.history.length} 件</span>
              </summary>
              <StatusHistory history={status.history} loading={status.historyLoading} message={status.historyMessage} revokeStatus={status.revokeStatus} onRevoke={status.revoke} onRetry={status.refreshHistory} />
            </details>
          )}
          {isAdmin && (
            <HandoverMemo
              sentences={handover.sentences}
              createdLabel={handover.note ? handoverCreatedLabel(handover.note) : null}
              loading={handover.loading}
              message={handover.message}
              creating={handover.creating}
              createMessage={handover.createMessage}
              onCreate={handover.create}
            />
          )}
          {isAdmin && handover.needsPassphrase && (
            <PassphraseForm
              lead="メモを作るには管理者の合言葉が要ります。入った後に、もう一度「メモを作る」を押してください。"
              submitLabel="入る"
              message={handover.loginMessage}
              busy={handover.loggingIn}
              onSubmit={handover.login}
            />
          )}
          <p className="detail-fictional">番号・判断・昨年の記録・メモは架空のもの</p>
        </div>
      )}
      {confirmView && (
        <RecordConfirmSheet
          view={confirmView}
          fieldLabel={`${field.id} ${field.name}`}
          submitting={status.submitting}
          onConfirm={status.submit}
          onCancel={status.cancelConfirm}
        />
      )}
      {open && view === "detail" ? (
        <StatusActions
          refCount={status.draft.refPhotoIds.length}
          canSubmit={canSubmitStatus(submitCondition)}
          hint={refRequiredNote(submitCondition)}
          submitting={status.submitting}
          message={status.formMessage}
          onSubmit={status.requestSubmit}
          onCancel={stopWriting}
        />
      ) : (
        <AppNav
          current={navCurrent(view)}
          hrefs={hrefs}
          demoDate={demoDate}
          onPick={(key) => {
            if (key !== "compare") return false;
            setView("compare");
            return true;
          }}
        />
      )}
    </div>
  );
}
