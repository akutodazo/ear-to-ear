/**
 * 日本語の文を、塊（文節ふう）の途中で折り返さずに出す。props だけで受け取る。
 * Safari が `word-break: auto-phrase` に未対応なため（Issue #180）。塊の分け方は services/text-phrases.ts
 */
import { splitIntoPhrases } from "@/services/text-phrases";

export function PhrasedText({ text }: { text: string }) {
  return (
    <>
      {splitIntoPhrases(text).map((phrase, index) => (
        // 同じ塊が並んでも区別できるよう、位置を鍵にする（並びは変わらない）
        <span key={index} className="phrase">
          {phrase}
        </span>
      ))}
    </>
  );
}
