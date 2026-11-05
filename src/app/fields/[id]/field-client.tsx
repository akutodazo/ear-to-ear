"use client";

/**
 * /fields/[id] の配線（11-05: 見比べる）。目安の畑の写真を上に固定し、この畑の写真を縦に送る。
 * 判断を残す（useFieldStatus）と昨年の同じ頃（last-season）もここで配る（AGENTS.md §4）
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import fieldsData from "@/data/fields.json";
import benchmarksData from "@/data/benchmarks.json";
import seasonsData from "@/data/seasons.json";
import type { Benchmark, Field } from "@/types";
import { useFieldPhotos } from "@/hooks/use-field-photos";
import { useFieldStatus } from "@/hooks/use-field-status";
import { useLatestPhoto } from "@/hooks/use-latest-photo";
import { benchmarkFor, monthDayJst } from "@/services/parcel-geometry";
import { lastSeasonFor, lastSeasonLines, type SeasonRecord } from "@/services/last-season";
import { statusLabel } from "@/services/status-view";
import { BenchmarkPane } from "@/components/compare/benchmark-pane";
import { FieldSwitcher } from "@/components/compare/field-switcher";
import { PhotoStream } from "@/components/compare/photo-stream";
import { LastSeasonNote } from "@/components/compare/last-season-note";
import { StatusPanel } from "@/components/compare/status-panel";
import { StatusHistory } from "@/components/compare/status-history";
import { AppNav } from "@/components/app-nav";
import { IconMap, IconPen } from "@/components/icons";

const fields: Field[] = fieldsData;
const benchmarks: Benchmark[] = benchmarksData;
const seasons: SeasonRecord[] = seasonsData;
/** 今年。作付けの年の層はまだ無いので、固定（地図と同じ） */
const SEASON = "2026";

export function FieldClient({ field }: { field: Field }) {
  const districtFields = useMemo(() => fields.filter((f) => f.district === field.district), [field.district]);
  const benchmarkId = benchmarkFor(benchmarks, SEASON, field.district);
  const benchmarkField = districtFields.find((f) => f.id === benchmarkId) ?? null;
  const isBenchmark = benchmarkId === field.id;

  const photos = useFieldPhotos(field.id);
  const bench = useLatestPhoto(benchmarkField && !isBenchmark ? benchmarkField.id : null);
  const status = useFieldStatus(field.id, photos.confirmedPhotoIds);
  const [writing, setWriting] = useState(false);

  const latestTakenAt = photos.groups[0]?.photos[0]?.takenAt ?? null;
  const seasonLines = lastSeasonLines(lastSeasonFor(seasons, field.id, SEASON), SEASON, latestTakenAt);
  const latestJudgment = useMemo(() => {
    const live = status.history.filter((e) => e.revokedAt === null);
    return live.length === 0 ? null : live.reduce((a, b) => (a.at > b.at || (a.at === b.at && a.id > b.id) ? a : b));
  }, [status.history]);

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
      {isBenchmark ? <BenchmarkPane kind="self" field={field} /> : benchmarkField ? <BenchmarkPane kind="other" field={benchmarkField} latest={bench} /> : <BenchmarkPane kind="none" />}
      <main className="compare-body">
        <section className="target">
          <div className="target-head">
            <h1 className="target-title">
              <span className="dock-id">{field.id}</span> {field.name}
            </h1>
            <button type="button" className="button button-small target-write" onClick={() => setWriting((w) => !w)} aria-expanded={writing}>
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
          {writing && (
            <StatusPanel
              draft={status.draft}
              onChooseStatus={status.chooseStatus}
              onToggleReason={status.toggleReason}
              onNote={status.setNote}
              onSubmit={status.submit}
              onCancel={() => {
                status.resetDraft();
                setWriting(false);
              }}
              submitting={status.submitting}
              message={status.formMessage}
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
          loading={photos.loading}
          message={photos.message}
          onRetry={photos.refresh}
          refs={writing ? { selected: refSet, onToggle: status.toggleRefPhoto } : undefined}
        />
        <LastSeasonNote lines={seasonLines} />
        <StatusHistory history={status.history} loading={status.historyLoading} message={status.historyMessage} revokeStatus={status.revokeStatus} onRevoke={status.revoke} onRetry={status.refreshHistory} />
        <p className="map-fictional-note compare-fictional">番号・判断・昨年の記録は架空のもの</p>
      </main>
      <AppNav current="compare" compareHref={`/fields/${field.id}`} />
    </div>
  );
}
