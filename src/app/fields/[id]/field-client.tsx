"use client";

/**
 * /fields/[id] の配線（11-05: 見比べる）。2 つの比べ方を上の段に置く:
 * 「同じ日に撮った別の畑と」（相手の既定は目安。日をまたいで比べない。上下 2 つの窓）と「この畑の前の日と」（重ねる）。境目を指で動かす。
 * 上の段は本文と一緒に送り、札の段は流れ去って 2 枚の写真だけが上に残る（精査 3 回目 #1）。
 * 下はこの畑の写真の流れ（根拠を選ぶ）、判断を残す（useFieldStatus）、昨年の同じ頃（last-season）、履歴、引き継ぎメモ（useHandover、L6）（AGENTS.md §4）
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import fieldsData from "@/data/fields.json";
import benchmarksData from "@/data/benchmarks.json";
import seasonsData from "@/data/seasons.json";
import type { Benchmark, Field } from "@/types";
import { useFieldPhotos } from "@/hooks/use-field-photos";
import { useFieldStatus } from "@/hooks/use-field-status";
import { useDistrictPhotos } from "@/hooks/use-district-photos";
import { useHandover } from "@/hooks/use-handover";
import { benchmarkFor, monthDayJst } from "@/services/parcel-geometry";
import { isoToJstDate, lastSeasonFor, lastSeasonLines, type SeasonDates, type SeasonRecord } from "@/services/last-season";
import { daysOf, indexByDay, resolveSameDay, resolveSameField } from "@/services/photo-compare";
import { monthDay } from "@/services/last-season";
import { statusLabel } from "@/services/status-view";
import { handoverCreatedLabel } from "@/services/handover-labels";
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
import { PassphraseForm } from "@/components/upload/passphrase-form";
import { AppNav } from "@/components/app-nav";
import { IconMap, IconPen, IconPhoto } from "@/components/icons";

const fields: Field[] = fieldsData;
const benchmarks: Benchmark[] = benchmarksData;
const seasons: SeasonRecord[] = seasonsData;
/** 今年。作付けの年の層はまだ無いので、固定（地図と同じ） */
const SEASON = "2026";

export function FieldClient({ field }: { field: Field }) {
  // デモで今日を差し替えているときの表示（精査 4 回目 #5）
  const demoDate = useDemoToday();
  const districtFields = useMemo(() => fields.filter((f) => f.district === field.district), [field.district]);
  const districtIds = useMemo(() => districtFields.map((f) => f.id), [districtFields]);
  const fieldsById = useMemo(() => Object.fromEntries(districtFields.map((f) => [f.id, f])) as Record<string, Field>, [districtFields]);
  const benchmarkId = benchmarkFor(benchmarks, SEASON, field.district);

  const photos = useFieldPhotos(field.id);
  const district = useDistrictPhotos(districtIds);
  const status = useFieldStatus(field.id, photos.confirmedPhotoIds);
  const handover = useHandover(field.id);
  // 来年の引き継ぎ（5 段目）: 昨年の判断の頃だけ、昨年のメモを「昨年の同じ頃」の下に
  const lastMemo = useLastSeasonMemo(field.id, SEASON);
  // 地図の板の「昨年の引き継ぎ あり」から来たら、畳んだ全文を開いておく
  const fromDock = useHashIs("last-season");
  // 写真を読み込むと段の位置が変わり、# で飛んだ先がずれる。読み込みが済んでから 1 回だけ「昨年の同じ頃」へ送る
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
  // 失敗と「写真が無い」を取り違えない（精査 3 回目 #6）。この畑に写真が 1 枚も無ければ上の段ごと出さない
  const ownFailed = district.failed.includes(field.id);
  const showStage = district.loading || ownFailed || ownDays.length > 0;
  const stageNote = district.loading
    ? "写真を読み込んでいます"
    : ownFailed
      ? "写真を読み込めませんでした"
      : top === null
        ? mode === "same-day"
          ? `${date ? monthDay(date) : "この日"} に撮った別の畑の写真はありません`
          : "前の日の写真はありません"
        : null;
  // 相手は上の写真の帯から選ぶ。並べるのはその日に撮った別の畑だけ（薄い札を並べない。精査 3 回目 #5）
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
  // 今年の判断の日（取り消していないもののうち、最新の収穫可能・収穫済）。昨年と同じ形で並べる
  const thisSeason = useMemo<SeasonDates | null>(() => {
    if (live.length === 0) return null;
    const latestOf = (kind: "ready" | "done") => {
      const list = live.filter((e) => e.status === kind);
      return list.length === 0 ? null : isoToJstDate(list.reduce((a, b) => (a.at > b.at ? a : b)).at);
    };
    return { readyAt: latestOf("ready"), doneAt: latestOf("done") };
  }, [live]);
  const seasonLines = lastSeasonLines(lastSeasonFor(seasons, field.id, SEASON), SEASON, thisSeason);
  // 記録できたら入力を閉じる（成功の文は上の判断の行の下に出す）
  const recorded = status.formMessage?.ok === true;
  const open = writing && !recorded;
  // 判断の入力を開いたら、入力の下の端（理由の「その他」など）まで見える所へ送る（精査 5 回目 #3）
  useEffect(() => {
    if (open) document.querySelector(".status-panel")?.scrollIntoView({ block: "nearest" });
  }, [open]);
  const startWriting = () => {
    status.resetDraft();
    setWriting(true);
  };
  const stopWriting = () => {
    status.resetDraft();
    setWriting(false);
  };

  const refSet = useMemo(() => new Set(status.draft.refPhotoIds), [status.draft.refPhotoIds]);

  return (
    <div className="compare">
      <header className="topbar compare-topbar">
        <Link href={`/#${field.id}`} className="topbar-back">
          <IconMap />
          地図
        </Link>
        <FieldSwitcher fields={districtFields} currentId={field.id} benchmarkId={benchmarkId} />
      </header>
      <main className="compare-body">
        {showStage && (
          <section className={open ? "stage stage-compact" : "stage"} aria-label="見比べる">
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
            {top && bottom ? (
              <SplitViewer kind={mode === "same-day" ? "stack" : "overlay"} top={top} bottom={bottom} topTag={mode === "same-field" ? "前の日" : undefined} picker={picker} />
            ) : (
              <div className="stage-empty">
                <IconPhoto />
                {stageNote}
                {district.failed.length > 0 && (
                  <button type="button" className="button button-small" onClick={district.refresh}>
                    もう一度読み込む
                  </button>
                )}
              </div>
            )}
          </section>
        )}
        <section className="target">
          <div className="target-head">
            <h1 className="target-title">
              <span className="dock-id">{field.id}</span> {field.name}
            </h1>
            <button type="button" className="button button-small target-write" onClick={open ? stopWriting : startWriting} aria-expanded={open}>
              <IconPen />
              判断を残す
            </button>
          </div>
          <p className={latestJudgment ? "target-status" : "target-status dock-status-none"}>
            {latestJudgment ? (
              <>
                <i className={`mark mark-${latestJudgment.status}`} aria-hidden="true" />
                {monthDayJst(latestJudgment.at)}に{statusLabel(latestJudgment.status)}と判断
              </>
            ) : status.historyLoading ? (
              "判断を読み込んでいます"
            ) : (
              "判断はまだありません"
            )}
          </p>
          {recorded && status.formMessage && <p className="note note-ok">{status.formMessage.text}</p>}
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
            />
          )}
        </section>
        <PhotoStream
          groups={photos.groups}
          fieldId={field.id}
          fieldName={field.name}
          loading={photos.loading}
          message={photos.message}
          onRetry={photos.refresh}
          refs={open ? { selected: refSet, onToggle: status.toggleRefPhoto } : undefined}
        />
        <LastSeasonNote lines={seasonLines} memo={lastMemo} memoOpen={fromDock} />
        <StatusHistory history={status.history} loading={status.historyLoading} message={status.historyMessage} revokeStatus={status.revokeStatus} onRevoke={status.revoke} onRetry={status.refreshHistory} />
        {/* 取り消しで合言葉を聞かれたとき（判断の入力を閉じていても出す。main の #120 と同じ） */}
        {status.needsPassphrase && !open && (
          <PassphraseForm
            lead="判断を取り消すには合言葉が要ります。入った後に、もう一度押してください。"
            submitLabel="入る"
            message={status.loginMessage}
            busy={status.loggingIn}
            onSubmit={status.login}
          />
        )}
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
        <p className="map-fictional-note compare-fictional">番号・判断・昨年の記録・メモは架空のもの</p>
      </main>
      {open && (
        <StatusActions
          refCount={status.draft.refPhotoIds.length}
          canSubmit={status.draft.status !== null}
          submitting={status.submitting}
          message={status.formMessage}
          onSubmit={status.submit}
          onCancel={stopWriting}
        />
      )}
      <AppNav current="compare" compareHref={`/fields/${field.id}`} orderHref={`/order#${field.id}`} demoDate={demoDate} />
    </div>
  );
}
