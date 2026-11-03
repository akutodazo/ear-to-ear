import { describe, expect, it } from "vitest";
import { LOGIN_WINDOW_MINUTES } from "../config";
import {
  LOGIN_WINDOW_MS,
  loginCounterKey,
  loginWindow,
  retryAfterSec,
  utcDay,
} from "./usage-limit";

const at = (iso: string) => Date.parse(iso);

describe("LOGIN_WINDOW_MS", () => {
  it("config の分から作る（10 分）", () => {
    expect(LOGIN_WINDOW_MS).toBe(LOGIN_WINDOW_MINUTES * 60_000);
    expect(LOGIN_WINDOW_MS).toBe(600_000);
  });
});

describe("utcDay", () => {
  it.each([
    ["2026-10-26T07:33:20.000Z", "2026-10-26"],
    ["2026-11-03T23:59:59.999Z", "2026-11-03"],
    ["2026-11-04T00:00:00.000Z", "2026-11-04"],
    // 日本時間ではもう 11-04 だが、UTC では 11-03
    ["2026-11-03T15:00:00.000Z", "2026-11-03"],
  ])("%s は %s（UTC）", (iso, day) => {
    expect(utcDay(at(iso))).toBe(day);
  });
});

describe("loginWindow", () => {
  it("テストの時刻（2026-10-26T07:33:20Z）は 07:30 の枠", () => {
    expect(loginWindow(1_793_000_000_000)).toStrictEqual({
      slot: "2026-10-26T07:30",
      startMs: at("2026-10-26T07:30:00.000Z"),
      endMs: at("2026-10-26T07:40:00.000Z"),
      expiresAt: "2026-10-26T07:40:00.000Z",
    });
  });

  it.each([
    ["2026-11-03T00:00:00.000Z", "2026-11-03T00:00"],
    ["2026-11-03T00:09:59.999Z", "2026-11-03T00:00"],
    ["2026-11-03T00:10:00.000Z", "2026-11-03T00:10"],
    ["2026-11-03T23:59:59.999Z", "2026-11-03T23:50"],
  ])("%s は %s の枠（10 分で切り下げる）", (iso, slot) => {
    expect(loginWindow(at(iso)).slot).toBe(slot);
  });

  it("終わりは始まりの 10 分後で、expiresAt はその ISO", () => {
    const window = loginWindow(at("2026-11-03T23:55:00.000Z"));
    expect(window.endMs - window.startMs).toBe(LOGIN_WINDOW_MS);
    expect(window.expiresAt).toBe("2026-11-04T00:00:00.000Z");
  });
});

describe("loginCounterKey", () => {
  it("login:<IPのハッシュ>:<枠>", () => {
    expect(loginCounterKey("abc_-123", "2026-11-03T00:10")).toBe("login:abc_-123:2026-11-03T00:10");
  });
});

describe("retryAfterSec", () => {
  // loginWindow に頼らず枠を直接書く（loginWindow が壊れていても retryAfterSec だけを確かめる）
  const window = {
    slot: "2026-11-03T00:10",
    startMs: at("2026-11-03T00:10:00.000Z"),
    endMs: at("2026-11-03T00:20:00.000Z"),
    expiresAt: "2026-11-03T00:20:00.000Z",
  };

  it.each([
    ["2026-11-03T00:10:00.000Z", 600],
    ["2026-11-03T00:15:00.000Z", 300],
    ["2026-11-03T00:19:58.001Z", 2],
    ["2026-11-03T00:19:59.001Z", 1],
    ["2026-11-03T00:19:59.999Z", 1],
  ])("%s なら %i 秒（切り上げ）", (iso, sec) => {
    expect(retryAfterSec(window, at(iso))).toBe(sec);
  });

  it("枠の終わりちょうど・過ぎていても最小 1", () => {
    expect(retryAfterSec(window, window.endMs)).toBe(1);
    expect(retryAfterSec(window, window.endMs + 5_000)).toBe(1);
  });

  it("整数", () => {
    expect(Number.isInteger(retryAfterSec(window, at("2026-11-03T00:12:34.567Z")))).toBe(true);
  });
});
