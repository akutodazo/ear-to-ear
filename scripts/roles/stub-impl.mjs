// 実装のファイルから、形だけを残した空の実装を作る（#16）。攻撃役に本物の実装を見せない。
import ts from "typescript";

const isExported = (node) => node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

export function stubImpl(source) {
  const file = ts.createSourceFile("x.ts", source, ts.ScriptTarget.Latest, true);
  const keep = [];
  for (const node of file.statements) {
    if (ts.isImportDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      keep.push(node.getText());
    } else if (ts.isClassDeclaration(node) && isExported(node)) {
      keep.push(node.getText());
    } else if (ts.isFunctionDeclaration(node) && isExported(node) && node.body) {
      const head = source.slice(node.getStart(), node.body.getStart());
      keep.push(`${head}{\n  throw new Error("not implemented");\n}`);
    }
  }
  return `${keep.join("\n\n")}\n`;
}
