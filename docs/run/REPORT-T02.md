# T02 REPORT（検査済み・人の確認待ち）

- START: `eed9b9fd8fb37485409dc95acbd03b53f7c0399d`
- GREEN: `ecb262b T02 GREEN: candidates をハバーサインで近い順に実装`
- ブランチ: `run/1103-a`（切り替えなし）
- 変えたファイル: `src/services/candidates.ts` のみ

## 実装の要点
- `distanceMeters`: ハバーサイン、地球の半径 6,371,000m（Service 内の定数）
- `candidateFieldIds`: null なら `[]`。距離の昇順、同じ距離なら番号の昇順。新しい配列で並べ替え（引数は変えない）。`slice(0, Math.max(0, max))` で件数を切る（負の max は 0 件扱い。テストには無い）

## 実行のしかたについての申告
- C2・C3・C4 は1回のメッセージで続けて出したため、前の終了を待たずに並行して走った可能性がある（順番は C2→C3→C4 で出した）
- C4 は終了コードを見るため `npm run check; echo "EXIT=$?"` として実行した（`echo` を1つつなげた）

## C1: `git status --porcelain --untracked-files=all`
```
（出力なし）
```

## C2: `git diff --name-only eed9b9fd8fb37485409dc95acbd03b53f7c0399d..HEAD`
```
src/services/candidates.ts
```

## C3: `npx vitest run src/services/candidates.test.ts`
```
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.

 RUN  v5.0.5 C:/Users/tanaka/projects/ear-to-ear


 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  09:14:06
   Duration  394ms (import 39%, transform 29%, tests 24%, worker 8%)
```

## C4: `npm run check`
```
> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 42 ファイルを確認
check:safety: OK（名前の検査のみ。中身の検査は T17）

> ear-to-ear@0.1.0 lint
> eslint


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


 Test Files  5 passed (5)
      Tests  176 passed (176)
   Start at  09:14:20
   Duration  307ms (tests 37%, import 34%, transform 16%, worker 12%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 71ms
Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry


  Creating an optimized production build ...
✓ Compiled successfully in 422ms
  Running TypeScript ...
  Finished TypeScript in 2.1s ...
  Collecting page data using 4 workers ...
  Generating static pages using 4 workers (0/3) ...
✓ Generating static pages using 4 workers (3/3) in 823ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
└ ○ /_not-found


○  (Static)  prerendered as static content

EXIT=0
```

## C5: `git status --porcelain --untracked-files=all`
```
（出力なし）
```

## 終了条件
| 条件 | 結果 |
|---|---|
| C1 が空 | ○ |
| C2 が `src/services/candidates.ts` だけ | ○ |
| C3 が 13 件成功・失敗 0・飛ばし 0 | ○ |
| C4 の終了コード 0 | ○ |
| C5 が空 | ○ |
