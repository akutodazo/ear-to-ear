"use client";

/**
 * 航空写真の上の圃場の輪郭（L1 の地図）。Leaflet はブラウザでしか動かないので、開いてから読み込む。
 * props だけで受け取り、押された圃場を親に返す（AGENTS.md §4）。
 * 11-05 のデザインの引き継ぎ: 最初の視線を畑に向ける。輪郭は細い白線（下に薄い影）、塗りは人の判断
 * （収穫可能＝黄緑、収穫済＝暗い破線）、未確認は塗らず文字も出さない。札は箱に入れず、影つきの文字だけ。
 * 目安の畑は金の輪郭、選んだ畑は黄緑の太い輪郭。
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
}

interface Props {
  parcels: MapParcel[];
  /** 地図を合わせる相手（見ている地区の区画）。fitKey が変わったときにこれらが入るように動かす */
  fitItems: MapParcel[];
  fitKey: string;
  onSelect: (fieldId: string | null) => void;
}

/** この倍率より縮小しているときは札を番号（と目安）だけにする。1 地区に合わせた倍率（約 15.75）では名前まで出し、全地区（約 15）では番号だけ */
const COMPACT_BELOW_ZOOM = 15.5;
/** 地区に合わせるときの上限の倍率（1 つの地区が画面いっぱいより寄らない） */
const FIT_MAX_ZOOM = 17.25;

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

/** 輪郭の線。選んだ畑は黄緑の太線、目安の畑は金、ほかは細い白 */
function lineStyle(appearance: ParcelAppearance): { color: string; weight: number } {
  if (appearance.selected) return { color: LIME, weight: 3.5 };
  if (appearance.benchmark) return { color: GOLD, weight: 2.5 };
  return { color: "#ffffff", weight: 1.5 };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

/**
 * 札の中身。箱に入れず、影つきの白い文字だけ（航空写真の上で読める）。
 * 「目安」（金）／番号（と未確定の点）／名前／判断（塗りがあるときだけ。未確認は文字にしない）。
 * 縮小しているときは名前と判断を隠す（CSS の .map-zoom-compact）
 */
function labelHtml(item: MapParcel): string {
  const { appearance, labelLines } = item;
  const [id, ...nameParts] = labelLines[0].split(" ");
  const benchmark = appearance.benchmark ? '<span class="map-label-benchmark">目安</span>' : "";
  const dot = appearance.unconfirmed ? '<span class="map-label-dot" title="未確定の写真あり"></span>' : "";
  const name = nameParts.length > 0 ? `<span class="map-label-name">${escapeHtml(nameParts.join(" "))}</span>` : "";
  const status =
    appearance.fill !== "none" && labelLines[1] !== undefined
      ? `<span class="map-label-status map-label-status-${appearance.fill}">${escapeHtml(labelLines[1])}</span>`
      : "";
  return `${benchmark}<span class="map-label-id">${escapeHtml(id)}${dot}</span>${name}${status}`;
}

function ariaLabel(item: MapParcel): string {
  const parts = [...item.labelLines];
  if (item.appearance.benchmark) parts.push("目安の畑");
  if (item.appearance.unconfirmed) parts.push("未確定の写真あり");
  return parts.join("、");
}

/** 区画・札を描き直す（12 区画なので全部消して描く） */
function draw(L: Leaflet, layers: LayerGroup, items: MapParcel[], onSelect: (fieldId: string) => void) {
  layers.clearLayers();
  for (const item of items) {
    const latlngs = item.parcel.polygon.map(([lat, lng]) => L.latLng(lat, lng));
    const { appearance } = item;
    const line = lineStyle(appearance);
    // 下の薄い影（明るい畑の上でも白線が見える。太い黒枠にはしない）
    L.polygon(latlngs, {
      color: "rgba(0,0,0,0.45)",
      weight: line.weight + (appearance.selected ? 4 : 2.5),
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

export function FieldMap({ parcels, fitItems, fitKey, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const layersRef = useRef<LayerGroup | null>(null);
  const fittedRef = useRef<string | null>(null);
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
  }, [ready, parcels, fitItems, fitKey]);

  return <div ref={containerRef} className="field-map" role="application" aria-label="圃場の航空写真の地図" />;
}
