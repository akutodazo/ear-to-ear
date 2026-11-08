"use client";

/**
 * /order の配線（11-05、3 段目「刈る順番」。11-07 に作り直し、#196）。上の小さな地図はやめ（順位の丸は地図の画面で見る）、
 * 大きな写真のカードの一覧 1 本（順位なしも同じ一覧の下に）と、下の固定の帯の主ボタン 1 つ（保存／確定／LINE で送る）。
 * 並べ替えは持ち手だけ。持ち手を押すだけなら動かし方のシート。まれな操作（記録から並べ直す・確定した順に戻す・送る絵を見る）は … のシート（AGENTS.md §4）
 */
import { useEffect, useMemo, useRef, useState } from "react";
import fieldsData from "@/data/fields.json";
import parcelsData from "@/data/parcels.json";
import benchmarksData from "@/data/benchmarks.json";
import seasonsData from "@/data/seasons.json";
import type { Benchmark, Field, Parcel } from "@/types";
import type { SeasonRecord } from "@/services/last-season";
import { useFieldMap } from "@/hooks/use-field-map";
import { useFieldSelection } from "@/hooks/use-field-selection";
import { useDistrictPhotos } from "@/hooks/use-district-photos";
import { useHarvestOrder } from "@/hooks/use-harvest-order";
import { useLastDistrict } from "@/hooks/use-last-district";
import { benchmarkFor } from "@/services/parcel-geometry";
import { draftOrder, nextToShoot, orderRows } from "@/services/harvest-order";
import { orderImageTitle, orderMessageText } from "@/services/order-message";
import { moveOptions, orderBarAction, orderHeadline, shareButtonLabel, shouldAutoPrepare } from "@/services/order-view";
import { lineShareHref } from "@/services/order-share-view";
import { useOrderShare } from "@/hooks/use-order-share";
import type { OrderShareMeta } from "@/services/order-share-meta";
import type { OrderImageInput } from "@/lib/order-image";
import { indexByDay } from "@/services/photo-compare";
import { OrderCards } from "@/components/order/order-cards";
import { OrderBar } from "@/components/order/order-bar";
import { NextToShoot } from "@/components/order/next-to-shoot";
import { LineShare } from "@/components/order/line-share";
import { Sheet } from "@/components/sheet";
import { AppNav } from "@/components/app-nav";
import { AccountChip } from "@/components/account-chip";
import { useRole } from "@/hooks/use-role";
import { appNavHrefs } from "@/services/app-nav-view";
import { PassphraseForm } from "@/components/upload/passphrase-form";
import { useDemoToday } from "@/hooks/use-last-season-memo";

const fields: Field[] = fieldsData;
const parcels: Parcel[] = parcelsData.map((p) => ({ fieldId: p.fieldId, polygon: p.polygon.map(([lat, lng]) => [lat, lng] as [number, number]) }));
const benchmarks: Benchmark[] = benchmarksData;
const seasons: SeasonRecord[] = seasonsData;
/** 今年（地図・詳細と同じ） */
const SEASON = "2026";
const districts = [...new Set(fields.map((f) => f.district))];

type OpenSheet = { kind: "move"; fieldId: string } | { kind: "more" } | null;

export function OrderClient() {
  // デモで今日を差し替えているときの表示（精査 4 回目 #5）
  const demoDate = useDemoToday();
  const account = useRole();
  const map = useFieldMap();
  const { selectedId, selected, select: selectField } = useFieldSelection();
  const [districtChoice, setDistrictChoice] = useState<string | null>(null);
  // 畑を選ばずに開いたときは、最後に見た地区から（11-06 地図の精査 #2）
  const lastDistrict = useLastDistrict(districts);
  const district = districtChoice ?? selected?.district ?? lastDistrict.last ?? districts[0];
  const districtFields = useMemo(() => fields.filter((f) => f.district === district), [district]);
  const districtIds = useMemo(() => districtFields.map((f) => f.id), [districtFields]);
  const fieldsById = useMemo(() => Object.fromEntries(districtFields.map((f) => [f.id, f])) as Record<string, Field>, [districtFields]);
  const benchmarkId = benchmarkFor(benchmarks, SEASON, district);
  const photos = useDistrictPhotos(districtIds);

  // 判断のまとめが読めてから下書きを作る（読めないのに「判断なし」と並べない）
  const summariesReady = !map.loading && map.message === null;
  const rows = useMemo(
    () => orderRows({ fields: districtFields, summaries: map.summaries, benchmarkId, season: SEASON, lastSeason: seasons, photosByField: photos.byField }),
    [districtFields, map.summaries, benchmarkId, photos.byField],
  );
  const base = useMemo(() => (summariesReady && !photos.loading ? draftOrder(rows, districtFields) : null), [summariesReady, photos.loading, rows, districtFields]);
  const order = useHarvestOrder(district, SEASON, base);
  const shoot = useMemo(() => nextToShoot(rows), [rows]);
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [resetArmed, setResetArmed] = useState(false);

  // 畑ごとの最新の写真（カードの写真）
  const photoIdByField = useMemo(() => {
    const out: Record<string, string> = {};
    for (const day of indexByDay(photos.byField)) {
      for (const [id, p] of Object.entries(day.photos)) if (out[id] === undefined) out[id] = p.id;
    }
    return out;
  }, [photos.byField]);

  const confirmedView = order.saved?.state === "confirmed" && !order.differsFromConfirmed;

  // LINE に 1 枚（4 段目）: 確定した順だけを絵と文にする（下書きは送らない）
  const confirmedOrder = order.saved?.state === "confirmed" && !order.differsFromConfirmed ? order.saved : null;
  const shareImage = useMemo<OrderImageInput | null>(() => {
    if (confirmedOrder === null || confirmedOrder.confirmedAt === null) return null;
    const ranks = new Map(confirmedOrder.ranked.map((id, i) => [id, i + 1]));
    const byField = new Map(parcels.map((p) => [p.fieldId, p]));
    return {
      title: orderImageTitle(district, confirmedOrder.confirmedAt),
      note: "番号・順番は架空",
      parcels: districtFields.flatMap((f) => {
        const parcel = byField.get(f.id);
        if (!parcel) return [];
        const row = rows[f.id];
        return [{ fieldId: f.id, name: f.name, polygon: parcel.polygon, fill: row?.status ?? "none", benchmark: f.id === benchmarkId, rank: ranks.get(f.id) ?? null }];
      }),
    };
  }, [confirmedOrder, district, districtFields, rows, benchmarkId]);
  const shareText =
    confirmedOrder && confirmedOrder.confirmedAt
      ? orderMessageText({ district, confirmedAt: confirmedOrder.confirmedAt, ranked: confirmedOrder.ranked, fieldsById, benchmarkId })
      : "";
  const shareFile = `order-${SEASON}-${districtIds[0] ?? "district"}.jpg`;
  // 共有の URL を作るときに送るもの（番号の並びだけ。座標・距離は送らない、K6）
  const shareMeta = useMemo<OrderShareMeta | null>(
    () =>
      confirmedOrder && confirmedOrder.confirmedAt && confirmedOrder.ranked.length > 0
        ? { season: SEASON, district, confirmedAt: confirmedOrder.confirmedAt, ranked: [...confirmedOrder.ranked], benchmarkId: benchmarkId && confirmedOrder.ranked.includes(benchmarkId) ? benchmarkId : null }
        : null,
    [confirmedOrder, district, benchmarkId],
  );
  const share = useOrderShare(shareImage, shareMeta, shareText, shareFile);
  // 確定の直後に 1 回だけ共有の URL を作る（#198。委員長は「LINE で送る」を 1 回押すだけ）
  const [justConfirmed, setJustConfirmed] = useState(false);
  const autoAttempted = useRef(false);
  const imageReady = share.state.kind === "ready" && shareMeta !== null;
  const linkKind = share.link.kind;
  const { prepare } = share;
  useEffect(() => {
    if (!shouldAutoPrepare({ justConfirmed, imageReady, link: linkKind, attempted: autoAttempted.current })) return;
    autoAttempted.current = true;
    void prepare();
  }, [justConfirmed, imageReady, linkKind, prepare]);

  // 詳細から来たとき（#A-01）は、そのカードを画面の真ん中へ
  const listReady = order.order !== null;
  useEffect(() => {
    if (selectedId === null || !listReady) return;
    document.querySelector(`.order-card[data-field="${selectedId}"]`)?.scrollIntoView({ block: "center" });
  }, [selectedId, listReady]);

  const isAdmin = account.role === "admin";
  const action = orderBarAction({
    loading: order.order === null,
    hasRanked: (order.order?.ranked.length ?? 0) > 0,
    dirty: order.dirty,
    savedState: order.saved?.state ?? null,
    differsFromConfirmed: order.differsFromConfirmed,
    isAdmin,
  });
  const headline = orderHeadline({ savedState: order.saved?.state ?? null, savedAt: order.saved?.savedAt ?? null, differsFromConfirmed: order.differsFromConfirmed, dirty: order.dirty });
  const shareLink = share.link.kind === "ready" ? share.link : null;
  const shareLabel = shareButtonLabel(share.state.kind, share.link.kind);
  const shareHref = shareLink && !share.canShare ? lineShareHref(shareText, shareLink.url) : null;

  const ranked = order.order?.ranked ?? [];
  const moving = sheet?.kind === "move" ? sheet.fieldId : null;
  const movingIndex = moving === null ? -1 : ranked.indexOf(moving);
  const closeSheet = () => {
    setSheet(null);
    setResetArmed(false);
  };

  return (
    <div className="order">
      <header className="topbar order-topbar">
        <label className="topbar-district order-district">
          <span className="sr-only">地区</span>
          <select
            className="input"
            value={district}
            onChange={(e) => {
              selectField(null);
              setDistrictChoice(e.target.value);
              lastDistrict.remember(e.target.value);
            }}
          >
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <AccountChip
          role={account.role}
          pending={account.pending}
          signInMessage={account.signInMessage}
          signOutMessage={account.signOutMessage}
          onSignIn={account.signIn}
          onSignOut={account.signOut}
        />
      </header>
      <main className="order-body">
        {map.message ? (
          <div className="order-failed">
            <p>判断を読み込めませんでした</p>
            <button type="button" className="button button-small" onClick={map.refresh} disabled={map.loading}>
              もう一度読み込む
            </button>
          </div>
        ) : order.order === null ? (
          <>
            <span className="skeleton skeleton-line" aria-label="記録を読み込んでいます" />
            <span className="skeleton order-card-skeleton" />
            <span className="skeleton order-card-skeleton" />
          </>
        ) : (
          <>
            <div className="order-head">
              <span className={confirmedView ? "rank rank-small rank-confirmed" : "rank rank-small"} aria-hidden="true" />
              <div className="order-head-text">
                <p className="order-head-title">{headline}</p>
                <p className="order-head-sub">保存先はこの端末だけです</p>
              </div>
              <button type="button" className="order-more" aria-label="ほかの操作" onClick={() => setSheet({ kind: "more" })}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
            </div>
            {share.needsPassphrase && (
              <PassphraseForm
                lead="共有の URL を作るには合言葉が要ります。入った後に、もう一度「LINE で送る準備」を押してください。"
                submitLabel="入る"
                message={share.loginMessage}
                busy={share.loggingIn}
                onSubmit={share.login}
              />
            )}
            <OrderCards
              order={order.order}
              rows={rows}
              fieldsById={fieldsById}
              photoIdByField={photoIdByField}
              confirmed={confirmedView}
              selectedId={selectedId}
              onMoveTo={order.moveTo}
              onOpenMove={(fieldId) => setSheet({ kind: "move", fieldId })}
            />
            <NextToShoot ids={shoot} rows={rows} fieldsById={fieldsById} onSelect={(id) => selectField(id)} selectedId={selectedId} />
          </>
        )}
      </main>
      <OrderBar
        action={action}
        busy={order.busy}
        message={order.message ?? (share.message ? { text: share.message, ok: false } : null)}
        onSave={order.saveDraft}
        onConfirm={() => {
          autoAttempted.current = false;
          setJustConfirmed(true);
          void order.confirm();
        }}
        share={{
          label: shareLabel,
          enabled: share.state.kind === "ready" && share.link.kind !== "uploading",
          href: shareHref,
          onPress: () => (share.link.kind === "ready" ? share.send() : void share.prepare()),
          note: null,
        }}
      />
      {moving !== null && (
        <Sheet title={`${moving} ${fieldsById[moving]?.name ?? ""}${movingIndex >= 0 ? `（${movingIndex + 1} 番目）` : "（順位なし）"}`} onClose={closeSheet}>
          <div className="sheet-rows">
            {movingIndex >= 0 &&
              moveOptions(movingIndex, ranked.length).map((o) => (
                <button
                  key={o.label}
                  type="button"
                  className="sheet-row"
                  disabled={o.disabled}
                  onClick={() => {
                    order.moveTo(movingIndex, o.to);
                    closeSheet();
                  }}
                >
                  {o.label}
                </button>
              ))}
            <button
              type="button"
              className="sheet-row"
              onClick={() => {
                order.toggle(moving);
                closeSheet();
              }}
            >
              {movingIndex >= 0 ? "順位を外す" : "順位を付ける（最後へ）"}
            </button>
          </div>
        </Sheet>
      )}
      {sheet?.kind === "more" && (
        <Sheet title="刈る順番のほかの操作" onClose={closeSheet}>
          <div className="sheet-rows">
            <button
              type="button"
              className={resetArmed ? "sheet-row sheet-row-armed" : "sheet-row"}
              onClick={() => {
                if (!resetArmed) {
                  setResetArmed(true);
                  return;
                }
                order.resetToRecords();
                closeSheet();
              }}
            >
              {resetArmed ? "もう一度押すと並べ直します（並べた順は消えます）" : "記録から並べ直す"}
            </button>
            {order.differsFromConfirmed && (
              <button
                type="button"
                className="sheet-row"
                onClick={() => {
                  order.revert();
                  closeSheet();
                }}
              >
                確定した順に戻す
              </button>
            )}
            {isAdmin && order.dirty && (
              <button
                type="button"
                className="sheet-row"
                onClick={() => {
                  order.saveDraft();
                  closeSheet();
                }}
              >
                下書きとして保存
              </button>
            )}
          </div>
          {shareImage && (
            <LineShare
              state={share.state}
              link={share.link}
              text={shareText}
              fileName={shareFile}
              canShare={share.canShare}
              message={share.message}
              needsPassphrase={share.needsPassphrase}
              loginMessage={share.loginMessage}
              loggingIn={share.loggingIn}
              onPrepare={share.prepare}
              onSend={share.send}
              onCopy={share.copyUrl}
              onLogin={share.login}
            />
          )}
          <p className="sheet-foot">いまの保存先はこの端末だけです（委員で共有する保存先は準備中）</p>
        </Sheet>
      )}
      <AppNav current="order" hrefs={appNavHrefs(selectedId ?? benchmarkId ?? districtIds[0] ?? "A-01", selectedId)} demoDate={demoDate} />
    </div>
  );
}
