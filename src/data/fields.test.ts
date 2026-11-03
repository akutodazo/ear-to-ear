import { describe, expect, it } from "vitest";
import { FICTIONAL_AREA, FIELD_ID_PATTERN } from "@/config";
import { distanceMeters } from "@/services/candidates";
import type { Field } from "@/types";
import data from "./fields.json";

// 架空の 12 圃場（T09、P15）。4列×3行を北西から横に番号を振る（11-03 本人決定）
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

  it("行ごとに緯度がそろい、北から南へ並ぶ", () => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 1; col < COLS; col++) expect(at(row, col).lat).toBe(at(row, 0).lat);
      if (row > 0) expect(at(row, 0).lat).toBeLessThan(at(row - 1, 0).lat);
    }
  });

  it("列ごとに経度がそろい、西から東へ並ぶ", () => {
    for (let col = 0; col < COLS; col++) {
      for (let row = 1; row < ROWS; row++) expect(at(row, col).lng).toBe(at(0, col).lng);
      if (col > 0) expect(at(0, col).lng).toBeGreaterThan(at(0, col - 1).lng);
    }
  });

  it("隣の圃場の中心は 300〜500m 離れている（重ならず、範囲に収まる）", () => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (col > 0) {
          const d = distanceMeters(at(row, col - 1), at(row, col));
          expect(d).toBeGreaterThanOrEqual(300);
          expect(d).toBeLessThanOrEqual(500);
        }
        if (row > 0) {
          const d = distanceMeters(at(row - 1, col), at(row, col));
          expect(d).toBeGreaterThanOrEqual(300);
          expect(d).toBeLessThanOrEqual(500);
        }
      }
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
