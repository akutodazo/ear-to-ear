# T12 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 763599fa42195534ae00cdb1793c9d31faaebd6c..HEAD
```
src/services/status-reason.ts

```

## C3 vitest run（T12 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/status-reason-config.test.ts (3 tests) 4ms
 ✓ src/services/status-reason.test.ts (52 tests) 12ms

 Test Files  2 passed (2)
      Tests  55 passed (55)
   Start at  09:57:07
   Duration  227ms (import 48%, transform 24%, tests 15%, worker 12%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 222 ファイルを確認
check:safety: OK（名前・デモの JPEG・圃場の座標・秘密らしい文字列）

> ear-to-ear@0.1.0 lint
> eslint


<作業フォルダ>\src\services\upload-meta.test.ts
  25:18  warning  '_removed' is assigned a value but never used  @typescript-eslint/no-unused-vars

<作業フォルダ>\worker\index.ts
  10:1  warning  Assign object to a variable before exporting as module default  import/no-anonymous-default-export

✖ 2 problems (0 errors, 2 warnings)


> ear-to-ear@0.1.0 typecheck
> next typegen && tsc --noEmit

Generating route types...
✓ Types generated successfully

> ear-to-ear@0.1.0 test
> vitest run


 RUN  v5.0.5 <作業フォルダ>

 ✓ worker/migrations.test.ts (49 tests) 38ms
 ✓ src/services/session-token.test.ts (56 tests) 21ms
 ✓ src/services/status-reason.test.ts (52 tests) 23ms
 ✓ scripts/safety-rules.test.ts (64 tests) 22ms
 ✓ src/services/upload-meta.test.ts (110 tests) 28ms
 ✓ scripts/relay/relay-lib.test.ts (84 tests) 34ms
 ✓ src/services/upload-form.test.ts (57 tests) 25ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 27ms
 ✓ src/services/photo-meta.test.ts (32 tests) 241ms
 ✓ src/services/photo-query.test.ts (60 tests) 21ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (38 tests) 85ms
 ✓ worker/app.test.ts (27 tests) 78ms
 ✓ worker/assignment.test.ts (19 tests) 123ms
 ✓ src/services/assignment.test.ts (26 tests) 16ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 18ms
 ✓ worker/photos.test.ts (19 tests) 167ms
 ✓ worker/photos-field.test.ts (24 tests) 166ms
 ✓ src/services/photo-labels.test.ts (37 tests) 17ms
 ✓ worker/env.test.ts (25 tests) 96ms
 ✓ worker/session.test.ts (46 tests) 276ms
 ✓ worker/uploads.test.ts (36 tests) 337ms
 ✓ src/services/session-request.test.ts (43 tests) 21ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 90ms
 ✓ src/services/candidates.test.ts (13 tests) 14ms
 ✓ worker/router.test.ts (33 tests) 15ms
 ✓ worker/photo-files.test.ts (10 tests) 66ms
 ✓ src/data/fields.test.ts (9 tests) 15ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 80ms
 ✓ src/services/usage-limit.test.ts (19 tests) 12ms
 ✓ worker/auth.test.ts (23 tests) 47ms
 ✓ worker/http.test.ts (13 tests) 63ms
 ✓ scripts/cage/policy.test.ts (76 tests) 87ms
 ✓ src/services/assignment-request.test.ts (24 tests) 12ms
 ✓ src/services/upload-request.test.ts (4 tests) 8ms
 ✓ worker/photos-config.test.ts (3 tests) 93ms
 ✓ worker/test-bucket.test.ts (5 tests) 160ms
 ✓ worker/test-db.test.ts (5 tests) 18ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 10ms
 ✓ src/services/recent-view.test.ts (11 tests) 9ms
 ✓ worker/cookies.test.ts (13 tests) 9ms
 ✓ worker/session-config.test.ts (2 tests) 101ms
 ✓ src/config.test.ts (7 tests) 9ms
 ✓ src/services/status-reason-config.test.ts (3 tests) 8ms
 ✓ src/services/resize-plan.test.ts (8 tests) 8ms
 ✓ worker/routes.test.ts (4 tests) 46ms
 ✓ src/lib/sha256.test.ts (3 tests) 14ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 20ms
 ✓ worker/uploads-config.test.ts (2 tests) 98ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 42ms
 ✓ worker/body.test.ts (10 tests) 35ms
 ✓ worker/cookies-days.test.ts (1 test) 9ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 1664ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2038ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1073ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 604ms
     ✓ 用意した直後はコミット済みで差分が無い 357ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 5308ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 1561ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 8973ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 1508ms
     ✓ 本物の実装は渡らない 837ms
     ✓ Git 管理外のファイルは渡せない 649ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 644ms
     ✓ 人の役には QUESTIONS だけが渡る 612ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 850ms
     ✓ PR の番号でない値は受け付けない 589ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 568ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 720ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 847ms
     ✓ 知らない役は受け付けない 589ms
     ✓ 空でないフォルダには作らない 558ms
 ✓ scripts/cage/server.test.ts (28 tests) 23479ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1095ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 1564ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 660ms
     ✓ 外を読む 632ms
     ✓ テストを書き換える 621ms
     ✓ 迂回して書き換える 608ms
     ✓ 大文字で迂回 563ms
     ✓ git のフック 615ms
     ✓ 形式違いのコミット 566ms
     ✓ 知らない道具 561ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 536ms
     ✓ テストの実行に檻の環境変数を渡さない 576ms
     ✓ コード以外のファイルは純粋関数の検査をしない 550ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 757ms
     ✓ task の形が違うと拒否する 579ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 926ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1349ms
     ✓ 起動できない検査でも原因が見える 984ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 563ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 888ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 830ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 895ms
     ✓ 前の運転の REPORT は上書きしない 1124ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1057ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1076ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1107ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1098ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1097ms

 Test Files  56 passed (56)
      Tests  1415 passed (1415)
   Start at  09:57:22
   Duration  24.00s (tests 82%, transform 10%, import 6%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 44ms

  Creating an optimized production build ...
✓ Compiled successfully in 1782ms
  Running TypeScript ...
  Finished TypeScript in 3.3s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/7) ...
  Generating static pages using 8 workers (1/7) 
  Generating static pages using 8 workers (3/7) 
  Generating static pages using 8 workers (5/7) 
✓ Generating static pages using 8 workers (7/7) in 1028ms
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
