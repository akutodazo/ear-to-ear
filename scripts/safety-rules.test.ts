import { describe, expect, it } from "vitest";
import { FICTIONAL_AREA } from "../src/config";
import { checkDemoJpeg, checkFieldsArea, checkFileName, findSecretLikeLines } from "./safety-rules";

// このファイル自身も安全検査にかかる。秘密らしい文字列は、そのままの形で書かず、つないで作る
const ANT = "sk-" + "ant-";
const SECRET_NAME = "SESSION_" + "SECRET";
const MEMBER_NAME = "MEMBER_" + "PASSPHRASE";
const ADMIN_NAME = "ADMIN_" + "PASSPHRASE";
const KEY_HEAD = "-----BEGIN " + "PRIVATE KEY-----";

describe("checkFileName（名前で分かる危ないファイル）", () => {
  it.each([".dev.vars", "worker/.dev.vars", ".dev.vars.example"])("%s は開発用の秘密", (path) => {
    expect(checkFileName(path)).not.toBeNull();
  });

  it.each([".env", ".env.local", "worker/.env.production"])("%s は環境変数ファイル", (path) => {
    expect(checkFileName(path)).not.toBeNull();
  });

  it.each(["data/fields.csv", "docs/A.CSV"])("%s は CSV（番号対応表などの疑い）", (path) => {
    expect(checkFileName(path)).not.toBeNull();
  });

  it("private/ の中身", () => {
    expect(checkFileName("private/fixtures/a.txt")).not.toBeNull();
  });

  it.each(["src/a.jpg", "public/a.jpeg", "public/demo2/a.jpg", "docs/demo/a.jpg"])(
    "%s: public/demo/ の外の JPEG は許さない",
    (path) => {
      expect(checkFileName(path)).not.toBeNull();
    },
  );

  it.each(["public/demo/a.jpg", "public/demo/A.JPEG", "public/demo/sub/b.jpg"])(
    "%s: public/demo/ の下の JPEG は名前では止めない（中身を別に見る）",
    (path) => {
      expect(checkFileName(path)).toBeNull();
    },
  );

  it.each(["public/demo/a.heic", "public/demo/a.dng", "src/a.HEIC"])("%s: HEIC・DNG はどこでも許さない", (path) => {
    expect(checkFileName(path)).not.toBeNull();
  });

  it.each(["src/services/candidates.ts", "docs/env.md", "public/logo.svg", "migrations/0001_init.sql"])(
    "%s は問題なし",
    (path) => {
      expect(checkFileName(path)).toBeNull();
    },
  );
});

describe("checkDemoJpeg（デモの写真のメタデータ）", () => {
  const bytes = new Uint8Array([0xff, 0xd8]);

  it("APP1〜15 が無ければ問題なし", () => {
    expect(checkDemoJpeg(bytes, () => ({ appSegments: [] }))).toBeNull();
  });

  it("APP1（EXIF・XMP）があれば止める", () => {
    expect(checkDemoJpeg(bytes, () => ({ appSegments: [1] }))).toMatch(/APP1/);
  });

  it("APP2〜15 も止める", () => {
    expect(checkDemoJpeg(bytes, () => ({ appSegments: [2, 13] }))).not.toBeNull();
  });

  it("JPEG として読めなければ止める（見られないものは通さない）", () => {
    const broken = () => {
      throw new Error("JPEG ではない");
    };
    expect(checkDemoJpeg(bytes, broken)).not.toBeNull();
  });
});

describe("checkFieldsArea（圃場の一覧の座標が架空の範囲の中か）", () => {
  const f = (id: string, lat: unknown, lng: unknown) => ({ id, name: `圃場 ${id}`, lat, lng, district: "A" });

  it("すべて範囲の中なら空（端を含む）", () => {
    const data = [f("A-01", 41.8, 144.5), f("A-02", 41.815, 144.52), f("A-03", 41.807, 144.51)];
    expect(checkFieldsArea(data, FICTIONAL_AREA)).toEqual([]);
  });

  it("緯度が外の圃場を、番号つきで1件返す", () => {
    const data = [f("A-01", 41.807, 144.51), f("A-02", 42.6, 144.51)];
    const result = checkFieldsArea(data, FICTIONAL_AREA);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/A-02/);
  });

  it("経度が外の圃場も返す", () => {
    const data = [f("A-05", 41.807, 143.2)];
    expect(checkFieldsArea(data, FICTIONAL_AREA)).toHaveLength(1);
  });

  it("座標が数でなければ返す（範囲を確かめられないものは通さない）", () => {
    const data = [f("A-06", "41.807", 144.51), f("A-07", 41.807, null)];
    expect(checkFieldsArea(data, FICTIONAL_AREA)).toHaveLength(2);
  });

  it("配列でなければ1件返す", () => {
    expect(checkFieldsArea({ fields: [] }, FICTIONAL_AREA)).toHaveLength(1);
  });

  it("空の配列は空", () => {
    expect(checkFieldsArea([], FICTIONAL_AREA)).toEqual([]);
  });
});

describe("findSecretLikeLines（秘密らしい文字列）", () => {
  it("Anthropic の API キーの形", () => {
    const text = `const key = "${ANT}${"a1B2".repeat(10)}";`;
    expect(findSecretLikeLines(text)).toEqual([{ line: 1, kind: "anthropic-key" }]);
  });

  it(".dev.vars の形の代入（名前=値）", () => {
    const text = `${SECRET_NAME}=${"0f".repeat(32)}`;
    expect(findSecretLikeLines(text)).toEqual([{ line: 1, kind: "secret-assignment" }]);
  });

  it("空白と引用符つきの代入", () => {
    const text = `${MEMBER_NAME} = "mugi-2026-abc"`;
    expect(findSecretLikeLines(text)).toEqual([{ line: 1, kind: "secret-assignment" }]);
  });

  it("オブジェクトの書き方（名前: \"値\"）", () => {
    const text = `  ${ADMIN_NAME}: "harvest-admin-01",`;
    expect(findSecretLikeLines(text)).toEqual([{ line: 1, kind: "secret-assignment" }]);
  });

  it("秘密鍵の見出し", () => {
    expect(findSecretLikeLines(KEY_HEAD)).toEqual([{ line: 1, kind: "private-key" }]);
  });

  it("行の番号は 1 始まりで、見つかった行だけ", () => {
    const text = ["# 設定", "", `${SECRET_NAME}=${"ab".repeat(32)}`, "PORT=8787"].join("\n");
    expect(findSecretLikeLines(text)).toEqual([{ line: 3, kind: "secret-assignment" }]);
  });

  it.each([
    [`  ${SECRET_NAME}: string;`, "型の宣言"],
    [`const s = env.${SECRET_NAME};`, "環境からの読み出し"],
    [`\`${SECRET_NAME}\` は node で作る`, "文書の中の名前"],
    [`${SECRET_NAME}=<生成した値>`, "置き換える前の見本"],
    [`${MEMBER_NAME}=`, "値が空"],
    [`${ANT}xxx`, "短すぎるキー"],
  ])("%s（%s）は止めない", (text) => {
    expect(findSecretLikeLines(text)).toEqual([]);
  });

  it("結果に秘密の値そのものを含めない", () => {
    const value = "mugi-2026-abc";
    const text = `${MEMBER_NAME}=${value}`;
    expect(JSON.stringify(findSecretLikeLines(text))).not.toContain(value);
  });
});
