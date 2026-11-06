/**
 * 日本語の文を、折り返してよい塊（文節ふう）に分ける（純粋関数）。
 * Safari（iOS 18 まで）は CSS の `word-break: auto-phrase` に対応しておらず、語の途中で折り返される（Issue #180）。
 * 塊ごとに折り返さない指定を付けて使う。`Intl.Segmenter` の語の切れ目を、次の決まりでまとめる:
 * - 平仮名だけの語は前の塊に付ける（助詞・活用語尾）
 * - 数字の後ろの語は同じ塊（「3」と「枚」を離さない）
 * - 英数字とハイフンの並びは分けない（圃場番号 A-03 など）
 * - 開き括弧は後ろの塊に付ける。それ以外の語でないもの（句読点・閉じ括弧・空白など）は前の塊に付ける
 * `Intl.Segmenter` が無い環境は、文全体を 1 つの塊にする（折り返しは今までどおり）
 */
const HIRAGANA_ONLY = /^[ぁ-ゟ]+$/;
const DIGITS_ONLY = /^[0-9０-９]+$/;
const OPENING = /^[（「『【〔(［[〈《｛{]+$/;
const ASCII_WORD_END = /[A-Za-z0-9-]$/;
const ASCII_WORD_START = /^[A-Za-z0-9-]/;

export function splitIntoPhrases(text: string): string[] {
  if (text === "") return [];
  if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") return [text];

  const phrases: string[] = [];
  let previous: string | null = null;
  // 直前が開き括弧で、次の語をその塊に付けるところ
  let opened = false;
  for (const { segment, isWordLike } of new Intl.Segmenter("ja", { granularity: "word" }).segment(text)) {
    const opening = !isWordLike && OPENING.test(segment);
    const attach =
      previous !== null &&
      (opened ||
        (!opening &&
          (!isWordLike ||
            HIRAGANA_ONLY.test(segment) ||
            DIGITS_ONLY.test(previous) ||
            (ASCII_WORD_END.test(previous) && ASCII_WORD_START.test(segment)))));
    if (attach) {
      phrases[phrases.length - 1] += segment;
    } else {
      phrases.push(segment);
    }
    // 開き括弧が続くとき（「（「」）も、まとめて次の語に付ける
    opened = opening;
    previous = segment;
  }
  return phrases;
}
