import { describe, expect, it } from "vitest";
import { declaredTooLarge, readBodyLimited } from "./body";

function streamOf(chunks: Uint8Array[]): { req: Request; pulled: () => number } {
  let index = 0;
  let pulled = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      pulled += chunks[index].byteLength;
      controller.enqueue(chunks[index++]);
    },
  });
  const req = new Request("https://example.test/", { method: "POST", body, duplex: "half" } as RequestInit);
  return { req, pulled: () => pulled };
}

describe("declaredTooLarge", () => {
  it.each([
    [null, false],
    ["", false],
    ["abc", false],
    ["-1", false],
    ["1.5", false],
    ["10", false],
    ["11", true],
  ])("content-length %s は上限 10 を超えるか: %s", (header, expected) => {
    expect(declaredTooLarge(header, 10)).toBe(expected);
  });
});

describe("readBodyLimited", () => {
  it("本文が無ければ空のバイト列", async () => {
    expect(await readBodyLimited(new Request("https://example.test/"), 10)).toStrictEqual(new Uint8Array(0));
  });

  it("小分けの本文をつないで返す（上限ちょうどまで）", async () => {
    const { req } = streamOf([new Uint8Array([1, 2]), new Uint8Array([3]), new Uint8Array([4, 5, 6, 7, 8, 9, 10])]);
    expect(await readBodyLimited(req, 10)).toStrictEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  });

  it("上限を超えたら null で、残りは読まない", async () => {
    const { req, pulled } = streamOf(Array.from({ length: 100 }, () => new Uint8Array(1024)));
    expect(await readBodyLimited(req, 4096)).toBeNull();
    expect(pulled()).toBeLessThanOrEqual(8 * 1024);
  });
});
