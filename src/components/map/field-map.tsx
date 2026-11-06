"use client";

/**
 * 航空写真の上の圃場の輪郭（L1 の地図）。Leaflet はブラウザでしか動かないので、開いてから読み込む。
 * props だけで受け取り、押された圃場を親に返す（AGENTS.md §4）。
 * 11-05 のデザインの引き継ぎ: 最初の視線を畑に向ける。輪郭は細い白線（下に薄い影）、塗りは人の判断
 * （収穫可能＝黄緑、収穫済＝暗い破線）、未確認は塗らず文字も出さない。札は箱に入れず、影つきの文字だけ。
 * 目安の畑は金の輪郭、選んだ畑は白の太い輪郭＋濃い影（黄緑は収穫可能だけに使う。精査 #2）。
 */
import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_TILES } from "@/config";
import type { Field, Parcel } from "@/types";
import { polygonBounds, polygonCentroid, unionBounds, type ParcelAppearance } from "@/services/parcel-geometry";

export interface MapParcel {
  field: Field;
  parcel: Parcel;
  appearance: ParcelAppearance;
  /** 札の行（1 行目は番号と名前、2 行目は判断） */
  labelLines: string[];
  /** 刈る順番の順位（刈る順番の画面だけ）。下書きは破線の丸、確定は実線の丸 */
  rank?: { n: number; confirmed: boolean } | null;
}

interface Props {
  parcels: MapParcel[];
  /** 選んだ畑を隠さない余白（px）。既定は地図の画面の板の高さ。刈る順番の地図は板が無いので小さく */
  keepVisiblePadding?: { top: number; bottom: number };
  /** 地図を合わせる相手（見ている地区の区画）。fitKey が変わったときにこれらが入るように動かす */
  fitItems: MapParcel[];
  fitKey: string;
  onSelect: (fieldId: string | null) => void;
}

/** この倍率より縮小しているときは札を番号（と目安）だけにする。1 地区に合わせた倍率（約 15.75）では名前まで出し、全地区（約 15）では番号だけ */
const COMPACT_BELOW_ZOOM = 15.5;
/** 地区に合わせるときの上限の倍率（1 つの地区が画面いっぱいより寄らない） */
const FIT_MAX_ZOOM = 17.25;
/** 選んだ畑が板や上の帯に隠れるときだけ、最小限だけ動かす。下は板の高さ、上は注記の分 */
const KEEP_VISIBLE_PADDING = { top: 56, bottom: 240 };

type Leaflet = typeof import("leaflet");

const LIME = "#d8f178";
const GOLD = "#f1cc65";
const INK = "#253326";

/** 塗りの色と濃さ。未確認は塗らない（0 だと押せないので、ごく薄い透明） */
function fillStyle(appearance: ParcelAppearance): { fillColor: string; fillOpacity: number } {
  switch (appearance.fill) {
    case "ready":
      return { fillColor: LIME, fillOpacity: appearance.selected ? 0.5 : 0.4 };
    case "done":
      return { fillColor: INK, fillOpacity: appearance.selected ? 0.5 : 0.4 };
    case "none":
      return { fillColor: "#ffffff", fillOpacity: appearance.selected ? 0.14 : 0.001 };
  }
}

/** 輪郭の線。選んだ畑は白の太線（影で浮かせる）、目安の畑は金、ほかは細い白。目安を選んだら金は内側に残す */
function lineStyle(appearance: ParcelAppearance): { color: string; weight: number } {
  if (appearance.selected) return { color: "#ffffff", weight: 4 };
  if (appearance.benchmark) return { color: GOLD, weight: 2.5 };
  return { color: "#ffffff", weight: 1.5 };
}

const STATUS_WORD = { ready: "収穫可能", done: "収穫済" } as const;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

/**
 * 札の中身。箱に入れず、影つきの白い文字だけ（航空写真の上で読める）。
 * 「目安」（金）／番号（と未確定の点）／名前。判断は塗りで分かるので文字にしない（日付は板で意味をつけて言う。精査 #8）。
 * 縮小しているときは名前を隠す（CSS の .map-zoom-compact）
 */
function labelHtml(item: MapParcel): string {
  const { appearance, labelLines } = item;
  const [id, ...nameParts] = labelLines[0].split(" ");
  const benchmark = appearance.benchmark ? '<span class="map-label-benchmark">目安</span>' : "";
  const dot = appearance.unconfirmed ? '<span class="map-label-dot" title="未確定の写真あり"></span>' : "";
  const name = nameParts.length > 0 ? `<span class="map-label-name">${escapeHtml(nameParts.join(" "))}</span>` : "";
  const rank = item.rank ? `<span class="rank${item.rank.confirmed ? " rank-confirmed" : ""} map-rank">${item.rank.n}</span>` : "";
  return `${rank}${benchmark}<span class="map-label-id">${escapeHtml(id)}${dot}</span>${name}`;
}

/** 読み上げ。「可 7/21」は「7/21 に収穫可能と判断」と言葉で言う */
function ariaLabel(item: MapParcel): string {
  const { appearance, labelLines } = item;
  const parts = [labelLines[0]];
  if (appearance.fill !== "none") {
    const date = labelLines[1]?.split(" ")[1];
    parts.push(date ? `${date}に${STATUS_WORD[appearance.fill]}と判断` : STATUS_WORD[appearance.fill]);
  } else if (labelLines[1] !== undefined) {
    parts.push("判断はまだありません");
  }
  if (appearance.benchmark) parts.push("目安の畑");
  if (appearance.unconfirmed) parts.push("未確定の写真あり");
  if (item.rank) parts.push(`刈る順番 ${item.rank.n} 番目${item.rank.confirmed ? "（確定）" : "（下書き）"}`);
  return parts.join("、");
}

/** 区画・札を描き直す（12 区画なので全部消して描く） */
function draw(L: Leaflet, layers: LayerGroup, items: MapParcel[], onSelect: (fieldId: string) => void) {
  layers.clearLayers();
  for (const item of items) {
    const latlngs = item.parcel.polygon.map(([lat, lng]) => L.latLng(lat, lng));
    const { appearance } = item;
    const line = lineStyle(appearance);
    // 下の薄い影（明るい畑の上でも白線が見える。太い黒枠にはしない）。選んだ畑は影を濃く太くして浮かせる
    L.polygon(latlngs, {
      color: appearance.selected ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.45)",
      weight: line.weight + (appearance.selected ? 6 : 2.5),
      fill: false,
      interactive: false,
      lineJoin: "round",
    }).addTo(layers);
    const top = L.polygon(latlngs, {
      ...line,
      ...fillStyle(appearance),
      opacity: 0.95,
      dashArray: appearance.fill === "done" ? "5 7" : undefined,
      fill: true,
      lineJoin: "round",
      className: `map-parcel map-parcel-${appearance.fill}${appearance.selected ? " map-parcel-selected" : ""}`,
    }).addTo(layers);
    if (appearance.selected && appearance.benchmark) {
      // 目安を選んでも「目安」の金が消えないよう、白の太線の内側に金を重ねる
      L.polygon(latlngs, { color: GOLD, weight: 2, fill: false, interactive: false, lineJoin: "round" }).addTo(layers);
    }
    top.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      onSelect(item.field.id);
    });
    const el = top.getElement();
    if (el instanceof SVGElement) {
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", ariaLabel(item));
      el.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item.field.id);
        }
      });
    }
    const [lat, lng] = polygonCentroid(item.parcel.polygon);
    L.marker([lat, lng], {
      interactive: false,
      keyboard: false,
      // 選んだ畑の札は隣の札より手前に
      zIndexOffset: appearance.selected ? 1000 : 0,
      icon: L.divIcon({ className: `map-label${appearance.selected ? " map-label-selected" : ""}`, html: labelHtml(item), iconSize: undefined }),
    }).addTo(layers);
  }
}

/** 選んだ畑の中心が板や帯に隠れるなら、見える所まで最小限だけ動かす（地区を飛ばない。精査 #1） */
function keepSelectedVisible(L: Leaflet, map: LeafletMap, items: MapParcel[], shown: { current: string | null }, padding: { top: number; bottom: number }) {
  const selected = items.find((i) => i.appearance.selected) ?? null;
  const id = selected?.field.id ?? null;
  if (id === shown.current) return;
  shown.current = id;
  if (!selected) return;
  const [lat, lng] = polygonCentroid(selected.parcel.polygon);
  map.panInside(L.latLng(lat, lng), {
    paddingTopLeft: L.point(0, padding.top),
    paddingBottomRight: L.point(0, padding.bottom),
    animate: true,
  });
}

/** 区画たちが入るように動かす（同じ key では 1 回だけ） */
function fitIfNeeded(map: LeafletMap, items: MapParcel[], key: string, fitted: { current: string | null }) {
  if (fitted.current === key) return;
  const bounds = unionBounds(items.map((p) => polygonBounds(p.parcel.polygon)));
  if (!bounds) return;
  fitted.current = key;
  // 置いた直後は容れ物の大きさを測り直してから合わせる（高さが決まる前に測ると中心がずれる）
  map.invalidateSize({ animate: false });
  map.fitBounds(
    [
      [bounds.latMin, bounds.lngMin],
      [bounds.latMax, bounds.lngMax],
    ],
    { padding: [16, 16], maxZoom: FIT_MAX_ZOOM, animate: false },
  );
}

export function FieldMap({ parcels, fitItems, fitKey, onSelect, keepVisiblePadding = KEEP_VISIBLE_PADDING }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const layersRef = useRef<LayerGroup | null>(null);
  const fittedRef = useRef<string | null>(null);
  const shownRef = useRef<string | null>(null);
  const onSelectRef = useRef<Props["onSelect"]>(onSelect);
  const [ready, setReady] = useState(false);

  // 押されたときの相手は、描き直さずに最新のものを使う
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // 地図を 1 回だけ作る
  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) return;
    import("leaflet").then((mod) => {
      if (disposed) return;
      const L: Leaflet = "map" in mod ? mod : (mod as unknown as { default: Leaflet }).default;
      leafletRef.current = L;
      // 倍率は 0.25 刻み（地区の 4 区画が画面の幅にちょうど入る倍率を選べる。整数刻みだと 1 段小さくなる）
      const map = L.map(container, {
        zoomControl: false,
        attributionControl: false,
        minZoom: MAP_TILES.minZoom,
        maxZoom: MAP_TILES.maxZoom,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
      });
      L.tileLayer(MAP_TILES.url, { attribution: MAP_TILES.attribution, minZoom: MAP_TILES.minZoom, maxZoom: MAP_TILES.maxZoom }).addTo(map);
      L.control.zoom({ position: "topright", zoomInTitle: "拡大", zoomOutTitle: "縮小" }).addTo(map);
      // 出典は拡大・縮小の下（右上）。下は凡例と選んだ畑の板に使う
      L.control.attribution({ position: "topright", prefix: false }).addTo(map);
      map.on("click", () => onSelectRef.current(null));
      const updateCompact = () => container.classList.toggle("map-zoom-compact", map.getZoom() < COMPACT_BELOW_ZOOM);
      map.on("zoomend", updateCompact);
      updateCompact();
      layersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
      setReady(false);
    };
  }, []);

  // 地図ができたあと、区画・判断・選択が変わるたびに描き直す
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!ready || !L || !map || !layers) return;
    draw(L, layers, parcels, (id) => onSelectRef.current(id));
    fitIfNeeded(map, fitItems, fitKey, fittedRef);
    keepSelectedVisible(L, map, parcels, shownRef, keepVisiblePadding);
  }, [ready, parcels, fitItems, fitKey, keepVisiblePadding]);

  return <div ref={containerRef} className="field-map" role="application" aria-label="圃場の航空写真の地図" />;
}
