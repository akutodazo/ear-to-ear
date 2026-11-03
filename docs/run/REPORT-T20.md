# T20 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 135955c..HEAD
```
src/services/upload-form.ts
worker/uploads.ts

```

## C3 vitest run（T20 のテスト）
```

[1m[30m[46m RUN [49m[39m[22m [36mv5.0.5 [39m[90m<作業フォルダ>/t20-run[39m

 [32m✓[39m src/services/upload-form.test.ts [2m([22m[2m52 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m worker/test-bucket.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 69[2mms[22m[39m
 [32m✓[39m worker/body.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 46[2mms[22m[39m
 [32m✓[39m worker/uploads-config.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 84[2mms[22m[39m
 [32m✓[39m worker/app.test.ts [2m([22m[2m29 tests[22m[2m)[22m[32m 60[2mms[22m[39m
 [32m✓[39m worker/uploads.test.ts [2m([22m[2m41 tests[22m[2m)[22m[32m 180[2mms[22m[39m

[2m Test Files [22m [1m[32m6 passed[39m[22m[90m (6)[39m
[2m      Tests [22m [1m[32m139 passed[39m[22m[90m (139)[39m
[2m   Start at [22m 17:29:55
[2m   Duration [22m 605ms[2m (tests 50%, import 25%, transform 20%, worker 5%)[22m


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 177 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）

> ear-to-ear@0.1.0 lint
> eslint


C:\Users\<ユーザー>\AppData\Local\Temp\claude\<作業フォルダ>\<セッション>\scratchpad\t20-run\src\services\upload-meta.test.ts
  25:18  warning  '_removed' is assigned a value but never used  @typescript-eslint/no-unused-vars

C:\Users\<ユーザー>\AppData\Local\Temp\claude\<作業フォルダ>\<セッション>\scratchpad\t20-run\worker\index.ts
  10:1  warning  Assign object to a variable before exporting as module default  import/no-anonymous-default-export

✖ 2 problems (0 errors, 2 warnings)


> ear-to-ear@0.1.0 typecheck
> next typegen && tsc --noEmit

Generating route types...
✓ Types generated successfully

> ear-to-ear@0.1.0 test
> vitest run


[1m[30m[46m RUN [49m[39m[22m [36mv5.0.5 [39m[90m<作業フォルダ>/t20-run[39m

 [32m✓[39m worker/migrations.test.ts [2m([22m[2m49 tests[22m[2m)[22m[32m 83[2mms[22m[39m
 [32m✓[39m src/services/session-token.test.ts [2m([22m[2m56 tests[22m[2m)[22m[32m 38[2mms[22m[39m
 [32m✓[39m src/services/upload-form.test.ts [2m([22m[2m52 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/services/upload-meta.test.ts [2m([22m[2m110 tests[22m[2m)[22m[32m 32[2mms[22m[39m
 [32m✓[39m src/repositories/implementations/http-photo-repository.test.ts [2m([22m[2m38 tests[22m[2m)[22m[32m 93[2mms[22m[39m
 [32m✓[39m scripts/safety-rules.test.ts [2m([22m[2m64 tests[22m[2m)[22m[32m 38[2mms[22m[39m
 [32m✓[39m src/services/prepared-photo.test.ts [2m([22m[2m16 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m src/services/assignment.test.ts [2m([22m[2m26 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m src/services/photo-meta.test.ts [2m([22m[2m32 tests[22m[2m)[22m[33m 323[2mms[22m[39m
 [32m✓[39m worker/env.test.ts [2m([22m[2m25 tests[22m[2m)[22m[32m 107[2mms[22m[39m
 [32m✓[39m src/services/jpeg-segments.test.ts [2m([22m[2m54 tests[22m[2m)[22m[32m 28[2mms[22m[39m
 [32m✓[39m worker/app.test.ts [2m([22m[2m29 tests[22m[2m)[22m[32m 164[2mms[22m[39m
 [32m✓[39m worker/uploads.test.ts [2m([22m[2m41 tests[22m[2m)[22m[33m 376[2mms[22m[39m
 [32m✓[39m worker/session.test.ts [2m([22m[2m54 tests[22m[2m)[22m[33m 409[2mms[22m[39m
 [32m✓[39m src/services/photo-labels.test.ts [2m([22m[2m30 tests[22m[2m)[22m[32m 17[2mms[22m[39m
 [32m✓[39m src/services/session-request.test.ts [2m([22m[2m43 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m scripts/fixtures/jpeg-encoder.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 130[2mms[22m[39m
 [32m✓[39m src/services/candidates.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m worker/router.test.ts [2m([22m[2m33 tests[22m[2m)[22m[32m 25[2mms[22m[39m
 [32m✓[39m src/services/usage-limit.test.ts [2m([22m[2m24 tests[22m[2m)[22m[32m 21[2mms[22m[39m
 [32m✓[39m src/lib/upload-steps.test.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 112[2mms[22m[39m
 [32m✓[39m worker/auth.test.ts [2m([22m[2m23 tests[22m[2m)[22m[32m 72[2mms[22m[39m
 [32m✓[39m src/data/fields.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m scripts/cage/policy.test.ts [2m([22m[2m76 tests[22m[2m)[22m[32m 125[2mms[22m[39m
 [32m✓[39m worker/http.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 107[2mms[22m[39m
 [32m✓[39m src/services/recent-view.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m worker/uploads-config.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 113[2mms[22m[39m
 [32m✓[39m worker/test-db.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 24[2mms[22m[39m
 [32m✓[39m src/services/upload-request.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m worker/test-bucket.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 107[2mms[22m[39m
 [32m✓[39m worker/session-config.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 99[2mms[22m[39m
 [32m✓[39m scripts/experiments/stop-report-lib.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m worker/cookies.test.ts [2m([22m[2m13 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m worker/body.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 67[2mms[22m[39m
 [32m✓[39m worker/routes.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 66[2mms[22m[39m
 [32m✓[39m src/services/usage-limit-config.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 26[2mms[22m[39m
 [32m✓[39m src/lib/sha256.test.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 19[2mms[22m[39m
 [32m✓[39m src/config.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/services/resize-plan.test.ts [2m([22m[2m8 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m worker/cookies-days.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 13[2mms[22m[39m
 [32m✓[39m scripts/roles/stub-impl.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 41[2mms[22m[39m
 [32m✓[39m scripts/experiments/rule-ab-lib.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 2437[2mms[22m[39m
   [32m✓[39m 条件 [2m(3)[22m
     [33m[2m✓[22m[39m 2通りの違いは決まりのファイルの有無だけ[33m 1162[2mms[22m[39m
     [33m[2m✓[22m[39m 決まりの無い方は .claude も CLAUDE.md も置かない[33m 804[2mms[22m[39m
     [33m[2m✓[22m[39m 用意した直後はコミット済みで差分が無い[33m 465[2mms[22m[39m
 [32m✓[39m scripts/hooks/ask-before-edit.test.ts [2m([22m[2m22 tests[22m[2m)[22m[33m 2431[2mms[22m[39m
 [32m✓[39m scripts/fixtures/fixture-catalog.test.ts [2m([22m[2m15 tests[22m[2m)[22m[33m 7844[2mms[22m[39m
   [32m✓[39m buildFixtures（合成写真の一覧） [2m(7)[22m
     [33m[2m✓[22m[39m 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409）[33m 2752[2mms[22m[39m
 [32m✓[39m scripts/roles/build-brief.test.ts [2m([22m[2m12 tests[22m[2m)[22m[33m 12488[2mms[22m[39m
   [32m✓[39m 攻撃役 [2m(3)[22m
     [33m[2m✓[22m[39m テスト・空の実装・型・設定だけが渡る[33m 1791[2mms[22m[39m
     [33m[2m✓[22m[39m 本物の実装は渡らない[33m 1126[2mms[22m[39m
     [33m[2m✓[22m[39m Git 管理外のファイルは渡せない[33m 901[2mms[22m[39m
   [32m✓[39m 来年の委員役・人の役 [2m(2)[22m
     [33m[2m✓[22m[39m 来年の委員役にはメモだけが渡る[33m 873[2mms[22m[39m
     [33m[2m✓[22m[39m 人の役には QUESTIONS だけが渡る[33m 890[2mms[22m[39m
   [32m✓[39m レビュー役 [2m(2)[22m
     [33m[2m✓[22m[39m リポジトリの複製と、PR の番号だけの文面が渡る[33m 1221[2mms[22m[39m
     [33m[2m✓[22m[39m PR の番号でない値は受け付けない[33m 831[2mms[22m[39m
   [32m✓[39m 余計な情報 [2m(5)[22m
     [33m[2m✓[22m[39m 知らない引数で経緯を足せない[33m 819[2mms[22m[39m
     [33m[2m✓[22m[39m attacker の文面に NOTES.md の経緯が入らない[33m 1172[2mms[22m[39m
     [33m[2m✓[22m[39m reviewer の文面に NOTES.md の経緯が入らない[33m 1137[2mms[22m[39m
     [33m[2m✓[22m[39m 知らない役は受け付けない[33m 861[2mms[22m[39m
     [33m[2m✓[22m[39m 空でないフォルダには作らない[33m 863[2mms[22m[39m
 [32m✓[39m scripts/cage/server.test.ts [2m([22m[2m21 tests[22m[2m)[22m[33m 21770[2mms[22m[39m
   [32m✓[39m 道具 [2m(1)[22m
     [33m[2m✓[22m[39m 5つだけを見せる[33m 1543[2mms[22m[39m
   [32m✓[39m 正常系 [2m(1)[22m
     [33m[2m✓[22m[39m 読む → 書く → テスト → コミットができ、変更は許可リストだけ[33m 1543[2mms[22m[39m
   [32m✓[39m 拒否 [2m(8)[22m
     [33m[2m✓[22m[39m 秘密を読む[33m 932[2mms[22m[39m
     [33m[2m✓[22m[39m 外を読む[33m 913[2mms[22m[39m
     [33m[2m✓[22m[39m テストを書き換える[33m 917[2mms[22m[39m
     [33m[2m✓[22m[39m 迂回して書き換える[33m 913[2mms[22m[39m
     [33m[2m✓[22m[39m 大文字で迂回[33m 861[2mms[22m[39m
     [33m[2m✓[22m[39m git のフック[33m 833[2mms[22m[39m
     [33m[2m✓[22m[39m 形式違いのコミット[33m 848[2mms[22m[39m
     [33m[2m✓[22m[39m 知らない道具[33m 881[2mms[22m[39m
   [32m✓[39m run_tests の抜け穴 [2m(3)[22m
     [33m[2m✓[22m[39m 実装に秘密を読むコードを書こうとすると、書く前に拒否する[33m 791[2mms[22m[39m
     [33m[2m✓[22m[39m テストの実行に檻の環境変数を渡さない[33m 919[2mms[22m[39m
     [33m[2m✓[22m[39m コード以外のファイルは純粋関数の検査をしない[33m 837[2mms[22m[39m
   [32m✓[39m report [2m(2)[22m
     [33m[2m✓[22m[39m 検査を自分で実行して REPORT.md に残し、Txx REPORT でコミットする[33m 1088[2mms[22m[39m
     [33m[2m✓[22m[39m task の形が違うと拒否する[33m 727[2mms[22m[39m
   [32m✓[39m レビューの指摘: 検査が空の report [2m(1)[22m
     [33m[2m✓[22m[39m 検査が0件なら REPORT を作らない[33m 1187[2mms[22m[39m
   [32m✓[39m レビューの指摘: 時間の上限 [2m(2)[22m
     [33m[2m✓[22m[39m 止まらないテストを打ち切って FAILED を返す[33m 1663[2mms[22m[39m
     [33m[2m✓[22m[39m 起動できない検査でも原因が見える[33m 1404[2mms[22m[39m
   [32m✓[39m レビューの指摘: REPORT と QUESTIONS [2m(3)[22m
     [33m[2m✓[22m[39m REPORT.md は write_file で書けない[33m 724[2mms[22m[39m
     [33m[2m✓[22m[39m CAGE_ALLOW に REPORT.md があっても write_file で書けない[33m 1143[2mms[22m[39m
     [33m[2m✓[22m[39m QUESTIONS.md は書けるが、commit_green には入らない[33m 1097[2mms[22m[39m

[2m Test Files [22m [1m[32m46 passed[39m[22m[90m (46)[39m
[2m      Tests [22m [1m[32m1105 passed[39m[22m[90m (1105)[39m
[2m   Start at [22m 17:30:14
[2m   Duration [22m 22.41s[2m (tests 85%, transform 9%, import 5%, worker 1%)[22m


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 52ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.6s
  Running TypeScript ...
  Finished TypeScript in 4.3s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/7) ...
  Generating static pages using 8 workers (1/7) 
  Generating static pages using 8 workers (3/7) 
  Generating static pages using 8 workers (5/7) 
✓ Generating static pages using 8 workers (7/7) in 1011ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /icon.svg
├ ○ /manifest.webmanifest
├ ○ /recent
└ ○ /upload


○  (Static)  prerendered as static content


```

## C5 git status --porcelain --untracked-files=all
```

```
