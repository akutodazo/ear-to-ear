import { describe, expect, it } from "vitest";
import { SESSION_DAYS } from "@/config";
import { buildClearSessionCookie, buildSessionCookie, readCookie, SESSION_COOKIE_NAME } from "./cookies";

describe("readCookie", () => {
  it.each([
    ["ヘッダが無い", null],
    ["ヘッダが空", ""],
    ["名前が無い", "other=1"],
    ["値が空", "session="],
  ])("%s は null", (_name, header) => {
    expect(readCookie(header, "session")).toBeNull();
  });

  it("複数の Cookie から名前で取る", () => {
    expect(readCookie("a=1; session=abc.def; b=2", "session")).toBe("abc.def");
  });

  it("同名が複数なら最初", () => {
    expect(readCookie("session=first; session=second", "session")).toBe("first");
  });

  it("前後の空白を除く", () => {
    expect(readCookie("  a=1 ;   session=abc  ; b=2", "session")).toBe("abc");
  });

  it("値の中の = は最初の = で分けて残す", () => {
    expect(readCookie("session=a=b=c", "session")).toBe("a=b=c");
  });

  it("名前は完全一致（前方一致しない）", () => {
    expect(readCookie("sessionx=1; xsession=2", "session")).toBeNull();
  });

  it("値は復号しない", () => {
    expect(readCookie("session=a%20b", "session")).toBe("a%20b");
  });
});

describe("buildSessionCookie", () => {
  it("名前は session", () => {
    expect(SESSION_COOKIE_NAME).toBe("session");
  });

  it("属性が仕様どおり（30 日、Domain と Expires は付けない）", () => {
    expect(SESSION_DAYS).toBe(30);
    expect(buildSessionCookie("abc.def")).toBe(
      "session=abc.def; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax",
    );
  });

  it("作った Cookie を readCookie で読み戻せる", () => {
    const header = buildSessionCookie("abc.def").split(";")[0];
    expect(readCookie(header, SESSION_COOKIE_NAME)).toBe("abc.def");
  });
});

describe("buildClearSessionCookie（出る。11-08）", () => {
  it("同じ名前・Path・属性で、値を空にして Max-Age=0", () => {
    expect(buildClearSessionCookie()).toBe("session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
  });

  it("消した Cookie は readCookie で null", () => {
    expect(readCookie(buildClearSessionCookie().split(";")[0], SESSION_COOKIE_NAME)).toBeNull();
  });
});
