// 檻の判定（#14）。fs・git に触らない純粋関数だけを置く。
// 誤操作の経路を消すためのもの。悪意のあるコードを防ぐ保証ではない（docs/dev/cage.md の既知の抜け）。
import { normalize } from "node:path";
import ts from "typescript";

// AGENTS.md §4 の「Service は純粋関数」を書き込みの条件にする
// 各区切りの先頭は英数字か - だけ。.. と隠しファイルと ?raw を通さない
const ALLOWED_IMPORT = /^(@\/types|@\/config|\.\.\/types|\.\.\/config|(@\/services|\.)(\/[\w-][\w.-]*)+)$/;
const BANNED_NAMES = new Set([
  "process",
  "fetch",
  "eval",
  "Function",
  "require",
  "globalThis",
  "global",
  "window",
  "self",
  "document",
  "module",
  "Reflect",
  "WebSocket",
  "XMLHttpRequest",
  "Worker",
  "importScripts",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "navigator",
  "location",
  "crypto",
  "Deno",
  "Bun",
]);
const BANNED_MEMBERS = new Set(["constructor", "__proto__", "prototype"]);

export function cleanPath(path) {
  return normalize(String(path)).replaceAll("\\", "/");
}

export function checkWrite(path, allow) {
  return typeof path === "string" && path !== "" && allow.has(cleanPath(path));
}

export function checkCommitMessage(message) {
  return /^T\d+ GREEN: \S[^\n]*$/.test(message);
}

// { process: 1 } や a.process は外に触らないので通す
function isOnlyAName(node) {
  const p = node.parent;
  if (ts.isPropertyAccessExpression(p)) return p.name === node;
  if (ts.isBindingElement(p)) return p.propertyName === node;
  return (
    (ts.isPropertyAssignment(p) ||
      ts.isPropertySignature(p) ||
      ts.isPropertyDeclaration(p) ||
      ts.isMethodSignature(p) ||
      ts.isMethodDeclaration(p)) &&
    p.name === node
  );
}

// 引数や変数として自分で宣言した名前は、グローバルを指さない
function declaredNames(file) {
  const names = new Set();
  const visit = (node) => {
    if (
      (ts.isParameter(node) || ts.isVariableDeclaration(node) || ts.isBindingElement(node)) &&
      ts.isIdentifier(node.name)
    ) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return names;
}

export function checkPurity(source) {
  const file = ts.createSourceFile("x.ts", source, ts.ScriptTarget.Latest, true);
  const problems = [];
  const declared = declaredNames(file);
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (!ALLOWED_IMPORT.test(node.moduleSpecifier.text)) problems.push(`import ${node.moduleSpecifier.text}`);
    } else if (ts.isImportEqualsDeclaration(node)) {
      problems.push("import =");
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      problems.push("import()");
    } else if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword) {
      problems.push("import.meta");
    } else if (ts.isIdentifier(node)) {
      if (BANNED_NAMES.has(node.text) && !declared.has(node.text) && !isOnlyAName(node)) problems.push(node.text);
      if (BANNED_MEMBERS.has(node.text)) problems.push(node.text);
    } else if (ts.isStringLiteralLike(node) && BANNED_MEMBERS.has(node.text)) {
      problems.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return problems;
}
