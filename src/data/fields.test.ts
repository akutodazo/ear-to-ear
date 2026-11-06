import { describe, expect, it } from "vitest";
import { FICTIONAL_AREA, FIELD_ID_PATTERN } from "@/config";
import { distanceMeters } from "@/services/candidates";
import type { Field } from "@/types";
import data from "./fields.json";

// 架空の 12 圃場（T09、P15）。番号は北地区→中地区→南地区の順に 4 つずつ（11-03 本人決定。並べ方は 11-05 に帯へ）
const fields: Field[] = data;
const COLS = 4;
const ROWS = 3;
const DISTRICTS = ["北地区", "中地区", "南地区"];

/** 行（0 始まり、北から）と列（0 始まり、西から）の圃場 */
function at(row: number, col: number): Field {
  return fields[row * COLS + col];
}

describe("架空の圃場の一覧（src/data/fields.json）", () => {
  it("12 圃場", () => {
    expect(fields).toHaveLength(COLS * ROWS);
  });

  it("番号は A-01〜A-12 の順", () => {
    expect(fields.map((f) => f.id)).toEqual(Array.from({ length: 12 }, (_, i) => `A-${String(i + 1).padStart(2, "0")}`));
  });

  it("番号は A-01 の形（実在の番号体系と重ねない。K10）", () => {
    for (const f of fields) expect(f.id).toMatch(FIELD_ID_PATTERN);
  });

  it("座標はすべて架空の範囲（P15）の中", () => {
    for (const f of fields) {
      expect(f.lat).toBeGreaterThanOrEqual(FICTIONAL_AREA.latMin);
      expect(f.lat).toBeLessThanOrEqual(FICTIONAL_AREA.latMax);
      expect(f.lng).toBeGreaterThanOrEqual(FICTIONAL_AREA.lngMin);
      expect(f.lng).toBeLessThanOrEqual(FICTIONAL_AREA.lngMax);
    }
  });

  // 11-05 のデザインの引き継ぎで、等間隔の格子（11-03）から「地区ごとにまとまった帯」に変えた。中心は区画（parcels.json）の重心
  it("同じ地区の圃場は近くにまとまる（中心どうし 700m 以内）", () => {
    for (const a of fields) {
      for (const b of fields) {
        if (a.district === b.district && a.id !== b.id) expect(distanceMeters(a, b), `${a.id} と ${b.id}`).toBeLessThanOrEqual(700);
      }
    }
  });

  it("違う地区の圃場は離れている（中心どうし 400m 以上）", () => {
    for (const a of fields) {
      for (const b of fields) {
        if (a.district !== b.district) expect(distanceMeters(a, b), `${a.id} と ${b.id}`).toBeGreaterThanOrEqual(400);
      }
    }
  });

  it("どの 2 つの中心も 90m 以上離れている（重ならない）。等間隔の格子ではない", () => {
    const lats = new Set(fields.map((f) => f.lat));
    const lngs = new Set(fields.map((f) => f.lng));
    expect(lats.size).toBe(fields.length);
    expect(lngs.size).toBe(fields.length);
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) expect(distanceMeters(fields[i], fields[j])).toBeGreaterThanOrEqual(90);
    }
  });

  it("地区は行ごと（北地区・中地区・南地区）", () => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) expect(at(row, col).district).toBe(DISTRICTS[row]);
    }
  });

  it("名前は地区の頭の字と列の番号（例 北の1）で、重ならない", () => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) expect(at(row, col).name).toBe(`${DISTRICTS[row][0]}の${col + 1}`);
    }
    expect(new Set(fields.map((f) => f.name)).size).toBe(fields.length);
  });
});
