import { describe, expect, it } from "vitest";
import { FICTIONAL_AREA } from "../src/config";
import {
  checkDemoJpeg,
  checkFieldsArea,
  checkFileName,
  decodeText,
  findSecretLikeLines,
  looksLikeJpeg,
} from "./safety-rules";

// このファイル自身も安全検査にかかる。秘密らしい文字列は、そのままの形で書かず、つないで作る
const ANT = "sk-" + "ant-";
const SECRET_NAME = "SESSION_" + "SECRET";
const MEMBER_NAME = "MEMBER_" + "PASSPHRASE";
const ADMIN_NAME = "ADMIN_" + "PASSPHRASE";
const KEY_HEAD = "-----BEGIN " + "PRIVATE KEY-----";
const CLAUDE_NAME = "CLAUDE_" + "API_KEY";
const CF_NAME = "CLOUDFLARE_" + "API_TOKEN";
const CF_USER = "cf" + "ut_";
const CF_ACCOUNT = "cf" + "at_";
const LINE_TOKEN_NAME = "LINE_CHANNEL_" + "ACCESS_TOKEN";
const LINE_SECRET_NAME = "LINE_CHANNEL_" + "SECRET";

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

  it("中に別の JPEG（FF D8 FF）がつながっていれば止める（最初の画像の見出ししか読まないため）", () => {
    const joined = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0xff, 0xd9, 0xff, 0xd8, 0xff, 0xe1]);
    expect(checkDemoJpeg(joined, () => ({ appSegments: [] }))).not.toBeNull();
  });
});

describe("looksLikeJpeg（拡張子によらず中身で JPEG を見分ける）", () => {
  it("先頭が FF D8 FF なら JPEG", () => {
    expect(looksLikeJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe(true);
  });

  it("PNG の先頭は JPEG ではない", () => {
    expect(looksLikeJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });

  it("3バイトに満たなければ JPEG ではない", () => {
    expect(looksLikeJpeg(new Uint8Array([0xff, 0xd8]))).toBe(false);
  });
});

describe("decodeText（文字のファイルを読む。文字でなければ null）", () => {
  const MARK = "ear-to-ear の確認用の文字";

  it("UTF-8 はそのまま読む", () => {
    expect(decodeText(new TextEncoder().encode(MARK))).toBe(MARK);
  });

  it("UTF-8 の BOM は外す", () => {
    const body = new TextEncoder().encode(MARK);
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...body]);
    expect(decodeText(bytes)).toBe(MARK);
  });

  it("UTF-16LE（BOM FF FE）を読む（Windows PowerShell 5.1 の既定）", () => {
    const units = Array.from(MARK, (c) => c.charCodeAt(0));
    const bytes = new Uint8Array([0xff, 0xfe, ...units.flatMap((u) => [u & 0xff, u >> 8])]);
    expect(decodeText(bytes)).toBe(MARK);
  });

  it("UTF-16BE（BOM FE FF）を読む", () => {
    const units = Array.from(MARK, (c) => c.charCodeAt(0));
    const bytes = new Uint8Array([0xfe, 0xff, ...units.flatMap((u) => [u >> 8, u & 0xff])]);
    expect(decodeText(bytes)).toBe(MARK);
  });

  it("BOM が無く NUL を含むものは文字ではない（画像・フォントなど）", () => {
    expect(decodeText(new Uint8Array([0x89, 0x50, 0x00, 0x47]))).toBeNull();
  });
});

describe("checkFieldsArea（圃場の一覧の座標が架空の範囲の中か）", () => {
  const f = (id: string, lat: unknown, lng: unknown) => ({ id, name: `圃場 ${id}`, lat, lng, district: "A" });

  it("すべて範囲の中なら空（端を含む）", () => {
    const data = [f("A-01", 43.235, 141.74), f("A-02", 43.25, 141.76), f("A-03", 43.242, 141.75)];
    expect(checkFieldsArea(data, FICTIONAL_AREA)).toEqual([]);
  });

  it("緯度が外の圃場を、番号つきで1件返す", () => {
    const data = [f("A-01", 43.242, 141.75), f("A-02", 44.1, 141.75)];
    const result = checkFieldsArea(data, FICTIONAL_AREA);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/A-02/);
  });

  it("経度が外の圃場も返す", () => {
    const data = [f("A-05", 43.242, 140.9)];
    expect(checkFieldsArea(data, FICTIONAL_AREA)).toHaveLength(1);
  });

  it("緯度が下限のすぐ外・経度が上限のすぐ外も返す（4つの端をすべて確かめる）", () => {
    const data = [f("A-08", 43.234, 141.75), f("A-09", 43.242, 141.761)];
    expect(checkFieldsArea(data, FICTIONAL_AREA)).toHaveLength(2);
  });

  it("座標が数でなければ返す（範囲を確かめられないものは通さない）", () => {
    const data = [f("A-06", "43.242", 141.75), f("A-07", 43.242, null)];
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
    [`const ${SECRET_NAME} = env.${SECRET_NAME};`, "環境の値を入れ直す"],
    [`const ${ADMIN_NAME} = c.env.${ADMIN_NAME}`, "Hono の環境から入れ直す"],
    [`const ${MEMBER_NAME} = process.env.${MEMBER_NAME};`, "Node の環境から入れ直す"],
    [`if (env.${SECRET_NAME}===undefined) return;`, "比べるだけ"],
    [`${ADMIN_NAME}=\${${ADMIN_NAME}}`, "シェルの変数で渡す"],
    [`${SECRET_NAME}=$(node -e "x")`, "コマンドの結果で渡す"],
  ])("%s（%s）は止めない", (text) => {
    expect(findSecretLikeLines(text)).toEqual([]);
  });

  it("文書の中のコード（バッククォート）は、閉じる所までを値として数える", () => {
    expect(findSecretLikeLines(`例: \`${MEMBER_NAME}=abc\`（3文字）は止めない`)).toEqual([]);
  });

  it("値は8文字から止める（7文字は止めない）", () => {
    expect(findSecretLikeLines(`${MEMBER_NAME}=abcdefg`)).toEqual([]);
    expect(findSecretLikeLines(`${MEMBER_NAME}=abcdefgh`)).toEqual([{ line: 1, kind: "secret-assignment" }]);
  });

  it.each([
    [`${CLAUDE_NAME}=${"k9".repeat(10)}`, "Claude の API キーの名前（11-04）"],
    [`${CF_NAME}=${"t7".repeat(10)}`, "Cloudflare のトークンの名前（11-04）"],
    [`  ${CF_NAME}: "abcdefgh12"`, "Cloudflare のトークンの名前（オブジェクト）"],
    [`${LINE_TOKEN_NAME}=${"q8".repeat(10)}`, "LINE のアクセストークンの名前（11-05、#135）"],
    [`${LINE_SECRET_NAME}=${"w4".repeat(10)}`, "LINE のチャネルシークレットの名前（11-05、#135）"],
    [`  ${LINE_SECRET_NAME}: "abcdefgh12"`, "LINE のチャネルシークレットの名前（オブジェクト）"],
  ])("%s（%s）は止める", (text) => {
    expect(findSecretLikeLines(text)).toEqual([{ line: 1, kind: "secret-assignment" }]);
  });

  it.each([
    [`curl -H "Authorization: Bearer ${CF_USER}${"Ab3d".repeat(10)}"`, "ユーザーのトークン"],
    [`token=${CF_ACCOUNT}${"Zx9Q".repeat(10)}`, "アカウントのトークン"],
  ])("Cloudflare のトークンの形（%s、%s）は名前が無くても止める", (text) => {
    expect(findSecretLikeLines(text)).toEqual([{ line: 1, kind: "cloudflare-token" }]);
  });

  it.each([
    [`${CF_USER}xxx`, "短すぎる"],
    [`\`${CF_NAME}\` を Environment の秘密に置く`, "文書の中の名前"],
    [`CLOUDFLARE_API_TOKEN: \${{ secrets.${CF_NAME} }}`, "Actions で秘密から渡す"],
    [`const k = env.${CLAUDE_NAME};`, "環境からの読み出し"],
    [`const s = env.${LINE_SECRET_NAME};`, "LINE の秘密の環境からの読み出し"],
  ])("%s（%s）は止めない", (text) => {
    expect(findSecretLikeLines(text)).toEqual([]);
  });

  it("結果に秘密の値そのものを含めない", () => {
    const value = "mugi-2026-abc";
    const text = `${MEMBER_NAME}=${value}`;
    expect(JSON.stringify(findSecretLikeLines(text))).not.toContain(value);
  });
});
