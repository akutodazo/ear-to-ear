# T01 REPORT（検査済み・人の確認待ち）

- ブランチ: run/1103-b、START 5b7cb5f → GREEN 520875b
- 変えたファイル: src/services/photo-meta.ts のみ
- モデル: Opus 5.5（/goal）
- 各検査は1回ずつ、他のコマンドとつながずに実行。下の出力は会話の出力をそのまま写したもの。C4 の終了コードはツールの表示で 0（エラーの表示なし）

## C1 `git status --porcelain --untracked-files=all`
```
(出力なし)
```

## C2 `git diff --name-only 5b7cb5f5af55abcdbc67ad3b1bae0e78d0d68873..HEAD`
```
src/services/photo-meta.ts
```

## C3 `npx vitest run src/services/photo-meta.test.ts`
```
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.

 RUN  v5.0.5 C:/Users/tanaka/projects/ear-to-ear


 Test Files  1 passed (1)
      Tests  23 passed (23)
   Start at  12:16:23
   Duration  199ms (import 38%, tests 28%, transform 21%, worker 13%)
```

## C4 `npm run check`
```
> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

(node:4856) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/Users/tanaka/projects/ear-to-ear/scripts/safety-rules.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \?\C:\Users\tanaka\projects\ear-to-ear\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
check:safety: 120 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）

> ear-to-ear@0.1.0 lint
> eslint


C:\Users\tanaka\projects\ear-to-ear\src\services\upload-meta.test.ts
  25:18  warning  '_removed' is assigned a value but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)


> ear-to-ear@0.1.0 typecheck
> next typegen && tsc --noEmit

Generating route types...
✓ Types generated successfully

> ear-to-ear@0.1.0 test
> vitest run

(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.

 RUN  v5.0.5 C:/Users/tanaka/projects/ear-to-ear

warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'NOTES.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/config.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.test.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/services/a.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/types/index.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/add.test.mjs', LF will be replaced by CRLF the next time Git touches it

 Test Files  22 passed (22)
      Tests  613 passed (613)
   Start at  12:16:35
   Duration  13.04s (tests 91%, import 6%, transform 2%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 34ms

  Creating an optimized production build ...
✓ Compiled successfully in 494ms
  Running TypeScript ...
  Finished TypeScript in 2.6s ...
  Collecting page data using 6 workers ...
  Generating static pages using 6 workers (0/5) ...
  Generating static pages using 6 workers (1/5) 
  Generating static pages using 6 workers (2/5) 
  Generating static pages using 6 workers (3/5) 
✓ Generating static pages using 6 workers (5/5) in 878ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /recent
└ ○ /upload


○  (Static)  prerendered as static content
```

## C5 `git status --porcelain --untracked-files=all`
```
(出力なし)
```

## 判定
C1 空／C2 は photo-meta.ts だけ／C3 23 件成功・失敗 0・飛ばし 0／C4 終了コード 0／C5 空。5つともそろった。**検査済み・人の確認待ち**。

## 人に見てほしい点（弱点候補）
1. C4 のテスト中に `warning: in the working copy of ... LF will be replaced by CRLF` が多数出る（`src/add.mjs`・`src/services/a.ts` などはこのリポジトリに無い名前）。別のテストが一時フォルダに git を作っている出力と推定。C5 は空なので作業ツリーには残っていない。REPORT ではこの繰り返しの行を会話の出力から並びどおりに書き起こした（色の制御文字は外した）
2. EXIF の GPS で N/S・E/W の参照が無い・不正なときは位置を null にした（仕様に明記なし。「推測しない」に合わせた。テストは参照ありだけ）
3. XMP の数は `+41.807` のような10進表記だけを受け付け、`1e2` などの指数表記は null（DJI の書き方にない前提）
4. 時差は ±14:00 まで。範囲外や読めない `OffsetTimeOriginal` は日付を不明にした（日本時間とみなして推測しない）
5. 同じ種類の APP1 が複数あれば、先に見つかった有効な値を使う。EXIF の位置と日付は片方が壊れていても、もう片方は使う
