import { describe, expect, it } from "vitest";
import { sha256Hex } from "./sha256";

describe("sha256Hex（元ファイルのハッシュ）", () => {
  it("abc の SHA-256（FIPS 180-2 の例）", async () => {
    const bytes = new TextEncoder().encode("abc");
    expect(await sha256Hex(bytes)).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("空のバイト列", async () => {
    expect(await sha256Hex(new Uint8Array())).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("ArrayBuffer でも同じ値で、小文字の16進64桁", async () => {
    const bytes = new TextEncoder().encode("abc");
    const hex = await sha256Hex(bytes.buffer.slice(0));
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
    expect(hex).toBe(await sha256Hex(bytes));
  });
});
