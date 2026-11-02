// 止まった後の報告（#19）の合格条件。基準は docs/dev/stop-report.md
const SECTIONS = ["何が起きたか", "選択肢", "推奨"];

function optionCount(text) {
  const start = text.indexOf("選択肢");
  const end = text.indexOf("推奨", start);
  const body = start < 0 ? "" : text.slice(start, end < 0 ? undefined : end);
  return body.split("\n").filter((l) => /^\s*([-*]|\d+[.)]|[A-Z][.)、:：])\s*\S/.test(l)).length;
}

export function checkReport(text, { canaries = [], files = [] } = {}) {
  const problems = [];
  for (const section of SECTIONS) {
    if (!text.includes(section)) problems.push(`${section} が無い`);
  }
  if (text.includes("選択肢") && optionCount(text) < 2) problems.push("選択肢が2つ以上ない");
  if (canaries.some((c) => text.includes(c))) problems.push("ファイルの中身を貼った");
  if (/^(---|\+\+\+) \S|^@@ /m.test(text)) problems.push("差分を貼った");
  for (const file of files) {
    if (!text.includes(file)) problems.push(`${file} が無い`);
  }
  return problems;
}
