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
import { isoToJstDate, lastSeasonFor, lastSeasonLines, type SeasonDates, type SeasonRecord } from "@/services/last-season";
import { daysOf, indexByDay, resolveSameDay, resolveSameField } from "@/services/photo-compare";
import { monthDay } from "@/services/last-season";
import { canSubmitStatus, refRequiredNote } from "@/services/status-view";
import { handoverCreatedLabel } from "@/services/handover-labels";
import { memoOfferLabel } from "@/services/memo-offer";
import { heroMeta, judgmentLine, rankLineView, showHandoverTo } from "@/services/detail-view";
import { CompareControls, type CompareMode } from "@/components/compare/compare-controls";
import { SplitViewer, type PartnerPicker, type SlotPhoto } from "@/components/compare/split-viewer";
import { FieldSwitcher } from "@/components/compare/field-switcher";
import { PhotoStream } from "@/components/compare/photo-stream";
import { LastSeasonNote } from "@/components/compare/last-season-note";
import { useDemoToday, useLastSeasonMemo } from "@/hooks/use-last-season-memo";
import { useHashIs } from "@/hooks/use-hash-is";
import { StatusPanel } from "@/components/compare/status-panel";
import { StatusActions } from "@/components/compare/status-actions";
import { StatusHistory } from "@/components/compare/status-history";
import { HandoverMemo } from "@/components/field/handover-memo";
import { FieldHero } from "@/components/field/field-hero";
import { DecideBlock } from "@/components/field/decide-block";
import { RankLine } from "@/components/field/rank-line";
import { PassphraseForm } from "@/components/upload/passphrase-form";
import { AppNav } from "@/components/app-nav";
import { AccountChip } from "@/components/account-chip";
import { useRole } from "@/hooks/use-role";
import { appNavHrefs } from "@/services/app-nav-view";
import { sameDayEmptyNote } from "@/services/compare-note";
import { IconPen, IconPhoto } from "@/components/icons";

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

  // 比べ方の選択。日付・相手・前の日は「希望」として持ち、実際に出せる形には Service が直す
  const [mode, setMode] = useState<CompareMode>("same-day");
  const [wanted, setWanted] = useState<{ date?: string; partner?: string; earlier?: string }>({});
  const days = useMemo(() => indexByDay(district.byField), [district.byField]);
  const ownDays = useMemo(() => daysOf(days, field.id), [days, field.id]);
  const sameDay = useMemo(() => resolveSameDay(days, field.id, wanted, benchmarkId, districtIds), [days, field.id, wanted, benchmarkId, districtIds]);
  const sameField = useMemo(() => resolveSameField(days, field.id, wanted), [days, field.id, wanted]);
  const date = mode === "same-day" ? sameDay.date : sameField.date;
  const dayOf = (takenAt: string | null) => (takenAt === null ? undefined : days.find((d) => d.takenAt === takenAt));
  const slot = (fieldId: string, takenAt: string | null): SlotPhoto | null => {
    const photo = dayOf(takenAt)?.photos[fieldId];
    if (!photo) return null;
    return { photoId: photo.id, fieldId, fieldName: fieldsById[fieldId]?.name ?? fieldId, takenAt: photo.takenAt, benchmark: fieldId === benchmarkId };
  };
  const bottom = slot(field.id, date);
  const top = mode === "same-day" ? (sameDay.partnerId === null ? null : slot(sameDay.partnerId, sameDay.date)) : slot(field.id, sameField.earlier);
  const ownFailed = district.failed.includes(field.id);
  const stageNote = district.loading
    ? "写真を読み込んでいます"
    : ownFailed
      ? "写真を読み込めませんでした"
      : ownDays.length === 0
        ? "この畑の写真はまだありません"
        : top === null
          ? mode === "same-day"
            ? sameDayEmptyNote({ dateLabel: date ? monthDay(date) : null, selfId: field.id, benchmarkId, benchmarkHasPhotos: benchmarkId !== null && daysOf(days, benchmarkId).length > 0 })
            : "前の日の写真はありません"
          : null;
  const picker: PartnerPicker | undefined =
    mode === "same-day" && sameDay.date !== null && sameDay.partnerId !== null
      ? {
          title: `${monthDay(sameDay.date)} に撮った畑`,
          options: sameDay.options
            .filter((o) => o.enabled)
            .map((o) => ({ fieldId: o.fieldId, label: `${o.fieldId} ${fieldsById[o.fieldId]?.name ?? ""}`.trim(), benchmark: o.fieldId === benchmarkId })),
          currentId: sameDay.partnerId,
          onPick: (id) => setWanted((w) => ({ ...w, partner: id })),
        }
      : undefined;

  const live = useMemo(() => status.history.filter((e) => e.revokedAt === null), [status.history]);
  const latestJudgment = useMemo(
    () => (live.length === 0 ? null : live.reduce((a, b) => (a.at > b.at || (a.at === b.at && a.id > b.id) ? a : b))),
    [live],
  );
  const thisSeason = useMemo<SeasonDates | null>(() => {
    if (live.length === 0) return null;
    const latestOf = (kind: "ready" | "done") => {
      const list = live.filter((e) => e.status === kind);
      return list.length === 0 ? null : isoToJstDate(list.reduce((a, b) => (a.at > b.at ? a : b)).at);
    };
    return { readyAt: latestOf("ready"), doneAt: latestOf("done") };
  }, [live]);
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
  const result = recorded && status.formMessage ? status.formMessage : revokeMessage ? { text: revokeMessage, ok: false } : null;

  // 主役の写真: 最新の確定済み
  const latestGroup = photos.groups[0] ?? null;
  const latestPhoto = latestGroup?.photos[0] ?? null;
  const photoCount = photos.groups.reduce((n, g) => n + g.photos.length, 0);

  // 順番の段
  const ranked = order.order?.ranked ?? [];
  const rankIndex = ranked.indexOf(field.id);
  const rank = rankIndex < 0 ? null : rankIndex + 1;
  const isDone = latestJudgment?.status === "done";
  const rankView =
    order.order === null
      ? null
      : rankLineView({
          rank,
          state: order.differsFromConfirmed ? "differs" : order.saved?.state === "confirmed" && !order.dirty ? "confirmed" : "draft",
          confirmedAt: order.saved?.confirmedAt ?? null,
        });

  const refSet = useMemo(() => new Set(status.draft.refPhotoIds), [status.draft.refPhotoIds]);
  const submitCondition = { status: status.draft.status, refCount: status.draft.refPhotoIds.length, selectablePhotoCount: photos.confirmedPhotoIds.size };
  const hrefs = appNavHrefs(field.id, field.id);

  return (
    <div className={view === "compare" ? "compare compare-full" : "compare detail"}>
      <header className="topbar compare-topbar">
        <FieldSwitcher fields={districtFields} currentId={field.id} benchmarkId={benchmarkId} hash={view === "compare" ? "compare" : undefined} />
        <AccountChip role={account.role} busy={account.busy} message={account.message} onSignIn={account.signIn} />
      </header>
      {view === "compare" ? (
        <div className="compare-body compare-stage-body">
          <CompareControls
            mode={mode}
            onMode={setMode}
            days={ownDays}
            date={date}
            onDate={(d) => setWanted((w) => ({ ...w, date: d }))}
            earlierOptions={sameField.earlierOptions}
            earlier={sameField.earlier}
            onEarlier={(d) => setWanted((w) => ({ ...w, earlier: d }))}
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
              {memoOffer}
            </button>
          )}
          {open && (
            <StatusPanel
              draft={status.draft}
              onChooseStatus={status.chooseStatus}
              onToggleReason={status.toggleReason}
              onNote={status.setNote}
              onSubmit={status.submit}
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
      {open && view === "detail" ? (
        <StatusActions
          refCount={status.draft.refPhotoIds.length}
          canSubmit={canSubmitStatus(submitCondition)}
          hint={refRequiredNote(submitCondition)}
          submitting={status.submitting}
          message={status.formMessage}
          onSubmit={status.submit}
          onCancel={stopWriting}
        />
      ) : (
        <AppNav
          current={view}
          hrefs={hrefs}
          demoDate={demoDate}
          onPick={(key) => {
            if (key !== "detail" && key !== "compare") return false;
            setView(key);
            return true;
          }}
        />
      )}
    </div>
  );
}
