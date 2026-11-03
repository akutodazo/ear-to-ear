# T18 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 05810ce..HEAD
```
worker/app.ts
worker/auth.ts
worker/cookies.ts
worker/http.ts
worker/router.ts
worker/routes.ts

```

## C3 vitest run（T18 のテスト）
```

[1m[30m[46m RUN [49m[39m[22m [36mv5.0.5 [39m[90m<作業フォルダ>/t18-run[39m

 [32m✓[39m worker/cookies-days.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m worker/routes.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 48[2mms[22m[39m
 [32m✓[39m worker/http.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 57[2mms[22m[39m
 [32m✓[39m worker/cookies.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m worker/router.test.ts [2m([22m[2m32 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m worker/auth.test.ts [2m([22m[2m23 tests[22m[2m)[22m[32m 48[2mms[22m[39m
 [32m✓[39m worker/app.test.ts [2m([22m[2m29 tests[22m[2m)[22m[32m 64[2mms[22m[39m

[2m Test Files [22m [1m[32m7 passed[39m[22m[90m (7)[39m
[2m      Tests [22m [1m[32m114 passed[39m[22m[90m (114)[39m
[2m   Start at [22m 11:40:05
[2m   Duration [22m 407ms[2m (tests 43%, import 33%, transform 14%, worker 9%)[22m


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 127 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）

> ear-to-ear@0.1.0 lint
> eslint


C:\Users\<ユーザー>\AppData\Local\Temp\claude\<作業フォルダ>\<セッション>\scratchpad\t18-run\src\services\upload-meta.test.ts
  25:18  warning  '_removed' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\<ユーザー>\AppData\Local\Temp\claude\<作業フォルダ>\<セッション>\scratchpad\t18-run\worker\index.ts
  9:1  warning  Assign object to a variable before exporting as module default  import/no-anonymous-default-export

✖ 2 problems (0 errors, 2 warnings)


> ear-to-ear@0.1.0 typecheck
> next typegen && tsc --noEmit

Generating route types...
✓ Types generated successfully

> ear-to-ear@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv5.0.5 [39m[90m<作業フォルダ>/t18-run[39m

 [32m✓[39m worker/migrations.test.ts [2m([22m[2m49 tests[22m[2m)[22m[32m 99[2mms[22m[39m
 [32m✓[39m src/services/session-token.test.ts [2m([22m[2m56 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m src/services/upload-meta.test.ts [2m([22m[2m110 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m scripts/safety-rules.test.ts [2m([22m[2m64 tests[22m[2m)[22m[32m 30[2mms[22m[39m
 [32m✓[39m worker/http.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 70[2mms[22m[39m
 [32m✓[39m src/services/jpeg-segments.test.ts [2m([22m[2m54 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m worker/app.test.ts [2m([22m[2m29 tests[22m[2m)[22m[32m 101[2mms[22m[39m
 [32m✓[39m src/services/photo-labels.test.ts [2m([22m[2m23 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m src/services/candidates.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/repositories/implementations/http-photo-repository.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 80[2mms[22m[39m
 [32m✓[39m src/data/fields.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m worker/routes.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 60[2mms[22m[39m
 [32m✓[39m worker/router.test.ts [2m([22m[2m32 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m worker/auth.test.ts [2m([22m[2m23 tests[22m[2m)[22m[32m 69[2mms[22m[39m
 [32m✓[39m src/services/upload-request.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m scripts/experiments/stop-report-lib.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m worker/cookies-days.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m src/config.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m worker/cookies.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m scripts/cage/policy.test.ts [2m([22m[2m76 tests[22m[2m)[22m[32m 96[2mms[22m[39m
 [32m✓[39m scripts/roles/stub-impl.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 40[2mms[22m[39m
 [32m✓[39m scripts/experiments/rule-ab-lib.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 2137[2mms[22m[39m
   [32m✓[39m 条件 [2m(3)[22m
     [33m[2m✓[22m[39m 2通りの違いは決まりのファイルの有無だけ[33m 958[2mms[22m[39m
     [33m[2m✓[22m[39m 決まりの無い方は .claude も CLAUDE.md も置かない[33m 726[2mms[22m[39m
     [33m[2m✓[22m[39m 用意した直後はコミット済みで差分が無い[33m 447[2mms[22m[39m
 [32m✓[39m scripts/hooks/ask-before-edit.test.ts [2m([22m[2m22 tests[22m[2m)[22m[33m 2094[2mms[22m[39m
 [32m✓[39m scripts/roles/build-brief.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 10936[2mms[22m[39m
   [32m✓[39m 攻撃役 [2m(3)[22m
     [33m[2m✓[22m[39m テスト・空の実装・型・設定だけが渡る[33m 1352[2mms[22m[39m
     [33m[2m✓[22m[39m 本物の実装は渡らない[33m 1063[2mms[22m[39m
     [33m[2m✓[22m[39m Git 管理外のファイルは渡せない[33m 811[2mms[22m[39m
   [32m✓[39m 来年の委員役・人の役 [2m(2)[22m
     [33m[2m✓[22m[39m 来年の委員役にはメモだけが渡る[33m 783[2mms[22m[39m
     [33m[2m✓[22m[39m 人の役には QUESTIONS だけが渡る[33m 779[2mms[22m[39m
   [32m✓[39m レビュー役 [2m(2)[22m
     [33m[2m✓[22m[39m リポジトリの複製と、PR の番号だけの文面が渡る[33m 1074[2mms[22m[39m
     [33m[2m✓[22m[39m PR の番号でない値は受け付けない[33m 763[2mms[22m[39m
   [32m✓[39m 余計な情報 [2m(5)[22m
     [33m[2m✓[22m[39m 知らない引数で経緯を足せない[33m 773[2mms[22m[39m
     [33m[2m✓[22m[39m attacker の文面に NOTES.md の経緯が入らない[33m 975[2mms[22m[39m
     [33m[2m✓[22m[39m reviewer の文面に NOTES.md の経緯が入らない[33m 1048[2mms[22m[39m
     [33m[2m✓[22m[39m 知らない役は受け付けない[33m 748[2mms[22m[39m
     [33m[2m✓[22m[39m 空でないフォルダには作らない[33m 765[2mms[22m[39m
 [32m✓[39m scripts/cage/server.test.ts [2m([22m[2m21 tests[22m[2m)[22m[33m 19120[2mms[22m[39m
   [32m✓[39m 道具 [2m(1)[22m
     [33m[2m✓[22m[39m 5つだけを見せる[33m 1065[2mms[22m[39m
   [32m✓[39m 正常系 [2m(1)[22m
     [33m[2m✓[22m[39m 読む → 書く → テスト → コミットができ、変更は許可リストだけ[33m 1265[2mms[22m[39m
   [32m✓[39m 拒否 [2m(8)[22m
     [33m[2m✓[22m[39m 秘密を読む[33m 824[2mms[22m[39m
     [33m[2m✓[22m[39m 外を読む[33m 812[2mms[22m[39m
     [33m[2m✓[22m[39m テストを書き換える[33m 774[2mms[22m[39m
     [33m[2m✓[22m[39m 迂回して書き換える[33m 765[2mms[22m[39m
     [33m[2m✓[22m[39m 大文字で迂回[33m 769[2mms[22m[39m
     [33m[2m✓[22m[39m git のフック[33m 784[2mms[22m[39m
     [33m[2m✓[22m[39m 形式違いのコミット[33m 784[2mms[22m[39m
     [33m[2m✓[22m[39m 知らない道具[33m 769[2mms[22m[39m
   [32m✓[39m run_tests の抜け穴 [2m(3)[22m
     [33m[2m✓[22m[39m 実装に秘密を読むコードを書こうとすると、書く前に拒否する[33m 721[2mms[22m[39m
     [33m[2m✓[22m[39m テストの実行に檻の環境変数を渡さない[33m 796[2mms[22m[39m
     [33m[2m✓[22m[39m コード以外のファイルは純粋関数の検査をしない[33m 728[2mms[22m[39m
   [32m✓[39m report [2m(2)[22m
     [33m[2m✓[22m[39m 検査を自分で実行して REPORT.md に残し、Txx REPORT でコミットする[33m 992[2mms[22m[39m
     [33m[2m✓[22m[39m task の形が違うと拒否する[33m 745[2mms[22m[39m
   [32m✓[39m レビューの指摘: 検査が空の report [2m(1)[22m
     [33m[2m✓[22m[39m 検査が0件なら REPORT を作らない[33m 1083[2mms[22m[39m
   [32m✓[39m レビューの指摘: 時間の上限 [2m(2)[22m
     [33m[2m✓[22m[39m 止まらないテストを打ち切って FAILED を返す[33m 1552[2mms[22m[39m
     [33m[2m✓[22m[39m 起動できない検査でも原因が見える[33m 1216[2mms[22m[39m
   [32m✓[39m レビューの指摘: REPORT と QUESTIONS [2m(3)[22m
     [33m[2m✓[22m[39m REPORT.md は write_file で書けない[33m 669[2mms[22m[39m
     [33m[2m✓[22m[39m CAGE_ALLOW に REPORT.md があっても write_file で書けない[33m 1060[2mms[22m[39m
     [33m[2m✓[22m[39m QUESTIONS.md は書けるが、commit_green には入らない[33m 942[2mms[22m[39m

[2m Test Files [22m [1m[32m25 passed[39m[22m[90m (25)[39m
[2m      Tests [22m [1m[32m677 passed[39m[22m[90m (677)[39m
[2m   Start at [22m 11:40:21
[2m   Duration [22m 19.72s[2m (tests 88%, transform 7%, import 5%, worker 1%)[22m


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 50ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.2s
  Running TypeScript ...
  Finished TypeScript in 3.5s ...
  Collecting page data using 6 workers ...
  Generating static pages using 6 workers (0/5) ...
  Generating static pages using 6 workers (1/5) 
  Generating static pages using 6 workers (2/5) 
  Generating static pages using 6 workers (3/5) 
✓ Generating static pages using 6 workers (5/5) in 811ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /recent
└ ○ /upload


○  (Static)  prerendered as static content


```

## C5 git status --porcelain --untracked-files=all
```

```
