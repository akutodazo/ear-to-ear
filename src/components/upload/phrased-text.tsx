/**
 * 日本語の文を、塊（文節ふう）の途中で折り返さずに出す。props だけで受け取る。
 * Safari が `word-break: auto-phrase` に未対応なため（Issue #180）。塊の分け方は services/text-phrases.ts
 */
import { phrasesKeepingParens } from "@/services/paren-phrases";
import { splitIntoPhrases } from "@/services/text-phrases";

/** keepParens: 短い括弧の中（「（管理者）」など）を 1 つの塊にし、折るなら括弧の前で折る（#221） */
export function PhrasedText({ text, keepParens = false }: { text: string; keepParens?: boolean }) {
  const phrases = keepParens ? phrasesKeepingParens(text) : splitIntoPhrases(text);
  return (
    <>
      {phrases.map((phrase, index) => {
        // 塊の終わりの空白は塊の外に出す（inline-block の中の行末の空白は消え、「11/6 13:30」が「11/613:30」になるため、#221）
        const body = phrase.trimEnd();
        const space = phrase.slice(body.length);
        return (
          // 同じ塊が並んでも区別できるよう、位置を鍵にする（並びは変わらない）
          <span key={index}>
            <span className="phrase">{body}</span>
            {space}
          </span>
        );
      })}
    </>
  );
}
