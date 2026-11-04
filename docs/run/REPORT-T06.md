# T06 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 551bfb1c07c4f14233249025623b870119b7c6c6..HEAD
```
src/services/photo-groups.ts

```

## C3 vitest run（T06 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/photo-groups.test.ts (15 tests) 10ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  09:55:33
   Duration  197ms (import 38%, transform 26%, tests 22%, worker 14%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 221 ファイルを確認
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

 ✓ worker/migrations.test.ts (49 tests) 44ms
 ✓ src/services/photo-groups.test.ts (15 tests) 15ms
 ✓ src/services/session-token.test.ts (56 tests) 28ms
 ✓ scripts/safety-rules.test.ts (64 tests) 19ms
 ✓ src/services/upload-meta.test.ts (110 tests) 34ms
 ✓ scripts/relay/relay-lib.test.ts (84 tests) 39ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 27ms
 ✓ src/services/upload-form.test.ts (57 tests) 22ms
 ✓ src/services/photo-meta.test.ts (32 tests) 251ms
 ✓ src/services/photo-query.test.ts (60 tests) 20ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (38 tests) 64ms
 ✓ worker/app.test.ts (27 tests) 70ms
 ✓ src/services/assignment.test.ts (26 tests) 15ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 17ms
 ✓ src/services/photo-labels.test.ts (37 tests) 16ms
 ✓ worker/assignment.test.ts (19 tests) 197ms
 ✓ worker/photos.test.ts (19 tests) 202ms
 ✓ worker/env.test.ts (25 tests) 77ms
 ✓ worker/photos-field.test.ts (24 tests) 256ms
 ✓ worker/session.test.ts (46 tests) 371ms
 ✓ worker/uploads.test.ts (36 tests) 411ms
 ✓ src/services/session-request.test.ts (43 tests) 17ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 83ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 86ms
 ✓ worker/auth.test.ts (23 tests) 66ms
 ✓ src/services/candidates.test.ts (13 tests) 12ms
 ✓ worker/photo-files.test.ts (10 tests) 69ms
 ✓ src/data/fields.test.ts (9 tests) 12ms
 ✓ worker/router.test.ts (33 tests) 13ms
 ✓ worker/http.test.ts (13 tests) 52ms
 ✓ src/services/usage-limit.test.ts (19 tests) 12ms
 ✓ scripts/cage/policy.test.ts (76 tests) 85ms
 ✓ src/services/recent-view.test.ts (11 tests) 10ms
 ✓ src/services/assignment-request.test.ts (24 tests) 11ms
 ✓ src/services/upload-request.test.ts (4 tests) 8ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 9ms
 ✓ worker/test-db.test.ts (5 tests) 23ms
 ✓ worker/test-bucket.test.ts (5 tests) 90ms
 ✓ worker/photos-config.test.ts (3 tests) 98ms
 ✓ worker/session-config.test.ts (2 tests) 94ms
 ✓ worker/cookies.test.ts (13 tests) 8ms
 ✓ worker/uploads-config.test.ts (2 tests) 111ms
 ✓ src/services/resize-plan.test.ts (8 tests) 8ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 18ms
 ✓ worker/routes.test.ts (4 tests) 48ms
 ✓ src/lib/sha256.test.ts (3 tests) 14ms
 ✓ src/config.test.ts (5 tests) 8ms
 ✓ worker/body.test.ts (10 tests) 43ms
 ✓ worker/cookies-days.test.ts (1 test) 7ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 37ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 1589ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 1937ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 984ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 609ms
     ✓ 用意した直後はコミット済みで差分が無い 341ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 5075ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 1590ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 8611ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 1372ms
     ✓ 本物の実装は渡らない 793ms
     ✓ Git 管理外のファイルは渡せない 588ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 553ms
     ✓ 人の役には QUESTIONS だけが渡る 603ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 862ms
     ✓ PR の番号でない値は受け付けない 567ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 570ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 728ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 812ms
     ✓ 知らない役は受け付けない 581ms
     ✓ 空でないフォルダには作らない 580ms
 ✓ scripts/cage/server.test.ts (28 tests) 23779ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1272ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 1291ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 642ms
     ✓ 外を読む 561ms
     ✓ テストを書き換える 594ms
     ✓ 迂回して書き換える 603ms
     ✓ 大文字で迂回 572ms
     ✓ git のフック 579ms
     ✓ 形式違いのコミット 561ms
     ✓ 知らない道具 573ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 523ms
     ✓ テストの実行に檻の環境変数を渡さない 560ms
     ✓ コード以外のファイルは純粋関数の検査をしない 537ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 875ms
     ✓ task の形が違うと拒否する 566ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 854ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1279ms
     ✓ 起動できない検査でも原因が見える 1145ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 571ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 920ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 888ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 852ms
     ✓ 前の運転の REPORT は上書きしない 1033ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1142ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1150ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1151ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1205ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1278ms

 Test Files  55 passed (55)
      Tests  1373 passed (1373)
   Start at  09:55:48
   Duration  24.25s (tests 83%, transform 9%, import 6%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 39ms

  Creating an optimized production build ...
✓ Compiled successfully in 1792ms
  Running TypeScript ...
  Finished TypeScript in 3.3s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/7) ...
  Generating static pages using 8 workers (1/7) 
  Generating static pages using 8 workers (3/7) 
  Generating static pages using 8 workers (5/7) 
✓ Generating static pages using 8 workers (7/7) in 961ms
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
