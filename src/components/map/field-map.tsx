"use client";

/**
 * 航空写真の上の圃場の輪郭（L1 の地図）。Leaflet はブラウザでしか動かないので、開いてから読み込む。
 * props だけで受け取り、押された圃場を親に返す（AGENTS.md §4）。
 * 輪郭は白と黒の二重線、塗りは人の判断（収穫可能＝黄緑、収穫済＝灰の破線）、未確認は塗らない。
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

/** この倍率より縮小しているときは札を番号だけにする */
const COMPACT_BELOW_ZOOM = 16;

type Leaflet = typeof import("leaflet");

const FILL_COLOR: Record<ParcelAppearance["fill"], string | null> = {
  none: null,
  ready: "#d8f178",
  done: "#5a6670",
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

function labelHtml(item: MapParcel): string {
  const { appearance, labelLines } = item;
  const chip = appearance.benchmark ? '<span class="map-label-benchmark">目安</span>' : "";
  const dot = appearance.unconfirmed ? '<span class="map-label-dot" title="未確定の写真あり"></span>' : "";
  // 1 行目は「A-03 北の3」。縮小しているときは名前を隠して番号だけにする（CSS の .map-zoom-compact）
  const [id, ...nameParts] = labelLines[0].split(" ");
  const first = `<span class="map-label-line map-label-id">${escapeHtml(id)}<span class="map-label-name"> ${escapeHtml(nameParts.join(" "))}</span></span>`;
  const lines = first + labelLines.slice(1).map((line) => `<span class="map-label-line">${escapeHtml(line)}</span>`).join("");
  return `${chip}<span class="map-label-box map-label-${appearance.fill}">${lines}${dot}</span>`;
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
    // 下の黒線（明るい畑の上でも白線が見える）
    L.polygon(latlngs, { color: "rgba(0,0,0,0.55)", weight: appearance.selected ? 8 : 6, fill: false, interactive: false }).addTo(layers);
    const fillColor = FILL_COLOR[appearance.fill];
    const top = L.polygon(latlngs, {
      color: "#ffffff",
      weight: appearance.selected ? 4 : 2,
      dashArray: appearance.fill === "done" ? "6 8" : undefined,
      fill: true,
      fillColor: fillColor ?? "#000000",
      fillOpacity: fillColor === null ? 0 : appearance.fill === "done" ? 0.35 : 0.45,
      className: `map-parcel map-parcel-${appearance.fill}${appearance.selected ? " map-parcel-selected" : ""}`,
    }).addTo(layers);
    if (appearance.selected) {
      L.polygon(latlngs, { color: "#2d6441", weight: 3, fill: false, interactive: false }).addTo(layers);
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
    { padding: [12, 12], animate: false },
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
        attributionControl: true,
        minZoom: MAP_TILES.minZoom,
        maxZoom: MAP_TILES.maxZoom,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
      });
      L.tileLayer(MAP_TILES.url, { attribution: MAP_TILES.attribution, minZoom: MAP_TILES.minZoom, maxZoom: MAP_TILES.maxZoom }).addTo(map);
      L.control.zoom({ position: "topright", zoomInTitle: "拡大", zoomOutTitle: "縮小" }).addTo(map);
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
