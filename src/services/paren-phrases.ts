/**
 * 短い括弧の中を 1 つの塊にして、文を折り返してよい塊に分ける（みっきぃ 8、#221。純粋関数）。
 * 「メモを作る（管理者）」が「（管理」「者）」のように括弧の中で折れないよう、折るなら括弧の前で折る。
 * 括弧の外は splitIntoPhrases のまま。長い括弧（PAREN_KEEP_MAX_CHARS 字を超える）は 1 行に収まらないので、今までどおり中で折ってよい
 */
import { splitIntoPhrases } from "./text-phrases";

/** 1 つの塊にする括弧の長さ（括弧を含む字数）。375px で 1 行に収まる長さ */
export const PAREN_KEEP_MAX_CHARS = 20;

const PAREN = /（[^（）]*）|\([^()]*\)/g;
/** 行の頭に来てはいけない記号（括弧の塊の後ろに付ける） */
const LEADING_PUNCT = /^[、。，．・：:）)」』】〕]+/;

export function phrasesKeepingParens(text: string): string[] {
  const phrases: string[] = [];
  const pushOutside = (part: string) => {
    if (part === "") return;
    const lead = LEADING_PUNCT.exec(part)?.[0] ?? "";
    if (lead !== "" && phrases.length > 0) {
      phrases[phrases.length - 1] += lead;
      phrases.push(...splitIntoPhrases(part.slice(lead.length)));
      return;
    }
    phrases.push(...splitIntoPhrases(part));
  };
  let last = 0;
  for (const match of text.matchAll(PAREN)) {
    const paren = match[0];
    const start = match.index ?? 0;
    if ([...paren].length > PAREN_KEEP_MAX_CHARS) continue;
    pushOutside(text.slice(last, start));
    phrases.push(paren);
    last = start + paren.length;
  }
  pushOutside(text.slice(last));
  return phrases;
}
