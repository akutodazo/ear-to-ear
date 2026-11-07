// みっきぃ 1（#214）: 写真を送るのボタンは「送る（n枚）」1 つ。合言葉が要るときも同じボタンで確かめてから送る（純粋関数）
import { describe, expect, it } from "vitest";
import { uploadActionView } from "./upload-action-view";

const BASE = { needsPassphrase: false, passphrase: "", sending: false, loggingIn: false, sendableCount: 3, progressLabel: null };

describe("uploadActionView", () => {
  it("はじめは「送る（3枚）」で、そのまま送る", () => {
    expect(uploadActionView(BASE)).toStrictEqual({ label: "送る（3枚）", disabled: false, step: "send" });
  });

  it("合言葉が要って、まだ空なら押せない（文言は同じ）", () => {
    expect(uploadActionView({ ...BASE, needsPassphrase: true })).toStrictEqual({ label: "送る（3枚）", disabled: true, step: "login-then-send" });
  });

  it("合言葉を入れたら、同じボタンで確かめてから送る（「入って送る」は無い）", () => {
    expect(uploadActionView({ ...BASE, needsPassphrase: true, passphrase: "x" })).toStrictEqual({
      label: "送る（3枚）",
      disabled: false,
      step: "login-then-send",
    });
  });

  it("合言葉を確かめている間は「確かめています…」で押せない", () => {
    expect(uploadActionView({ ...BASE, needsPassphrase: true, passphrase: "x", loggingIn: true })).toStrictEqual({
      label: "確かめています…",
      disabled: true,
      step: "login-then-send",
    });
  });

  it("送っている間は進み具合で押せない", () => {
    expect(uploadActionView({ ...BASE, sending: true, progressLabel: "送っています…（2/3枚）" })).toStrictEqual({
      label: "送っています…（2/3枚）",
      disabled: true,
      step: "send",
    });
  });

  it("送れる写真が無く、送ってもいなければ出さない（null）", () => {
    expect(uploadActionView({ ...BASE, sendableCount: 0 })).toBeNull();
  });

  it("合言葉が通ったら（needsPassphrase が false に戻ったら）また send", () => {
    expect(uploadActionView({ ...BASE, passphrase: "x" })?.step).toBe("send");
  });
});
