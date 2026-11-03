# T23 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 3949c30b1db7f6a35df465e32163df046ed514c2..HEAD
```
src/services/status-events.ts
worker/status-events.ts

```

## C3 vitest run（T23 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/status-events.test.ts (35 tests) 19ms
 ✓ worker/routes.test.ts (5 tests) 37ms
 ✓ worker/status-events.test.ts (26 tests) 90ms

 Test Files  3 passed (3)
      Tests  66 passed (66)
   Start at  07:44:12
   Duration  426ms (tests 37%, transform 29%, import 28%, worker 6%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 223 ファイルを確認
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

 ✓ scripts/relay/relay-lib.test.ts (84 tests) 45ms
 ✓ worker/migrations.test.ts (49 tests) 87ms
 ✓ src/services/session-token.test.ts (56 tests) 36ms
 ✓ src/services/upload-form.test.ts (57 tests) 30ms
 ✓ scripts/safety-rules.test.ts (64 tests) 34ms
 ✓ src/services/upload-meta.test.ts (110 tests) 47ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 35ms
 ✓ src/services/photo-meta.test.ts (32 tests) 291ms
 ✓ worker/assignment.test.ts (19 tests) 218ms
 ✓ worker/photos-field.test.ts (24 tests) 220ms
 ✓ worker/photos.test.ts (19 tests) 229ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (38 tests) 125ms
 ✓ worker/app.test.ts (27 tests) 125ms
 ✓ worker/status-events.test.ts (26 tests) 292ms
 ✓ worker/session.test.ts (46 tests) 390ms
 ✓ worker/uploads.test.ts (36 tests) 370ms
 ✓ src/services/assignment.test.ts (26 tests) 22ms
 ✓ src/services/photo-query.test.ts (60 tests) 31ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 29ms
 ✓ src/services/photo-labels.test.ts (37 tests) 23ms
 ✓ worker/env.test.ts (25 tests) 102ms
 ✓ src/services/session-request.test.ts (43 tests) 22ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 128ms
 ✓ worker/photo-files.test.ts (10 tests) 86ms
 ✓ src/services/status-events.test.ts (35 tests) 29ms
 ✓ src/services/candidates.test.ts (13 tests) 16ms
 ✓ worker/auth.test.ts (23 tests) 64ms
 ✓ src/data/fields.test.ts (9 tests) 20ms
 ✓ worker/router.test.ts (33 tests) 21ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 99ms
 ✓ src/services/usage-limit.test.ts (19 tests) 22ms
 ✓ worker/http.test.ts (13 tests) 78ms
 ✓ src/services/recent-view.test.ts (11 tests) 14ms
 ✓ worker/test-bucket.test.ts (5 tests) 101ms
 ✓ worker/photos-config.test.ts (3 tests) 103ms
 ✓ src/services/upload-request.test.ts (4 tests) 11ms
 ✓ scripts/cage/policy.test.ts (76 tests) 160ms
 ✓ src/services/assignment-request.test.ts (24 tests) 18ms
 ✓ worker/test-db.test.ts (5 tests) 27ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 14ms
 ✓ worker/cookies.test.ts (13 tests) 12ms
 ✓ worker/session-config.test.ts (2 tests) 107ms
 ✓ src/services/resize-plan.test.ts (8 tests) 13ms
 ✓ worker/routes.test.ts (5 tests) 68ms
 ✓ worker/body.test.ts (10 tests) 60ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 23ms
 ✓ worker/uploads-config.test.ts (2 tests) 110ms
 ✓ src/lib/sha256.test.ts (3 tests) 19ms
 ✓ src/config.test.ts (5 tests) 11ms
 ✓ worker/cookies-days.test.ts (1 test) 12ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 53ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2523ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1262ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 844ms
     ✓ 用意した直後はコミット済みで差分が無い 411ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 2431ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 8932ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 3158ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 11726ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 1805ms
     ✓ 本物の実装は渡らない 1138ms
     ✓ Git 管理外のファイルは渡せない 853ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 780ms
     ✓ 人の役には QUESTIONS だけが渡る 783ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 1152ms
     ✓ PR の番号でない値は受け付けない 797ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 788ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 1009ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 1051ms
     ✓ 知らない役は受け付けない 759ms
     ✓ 空でないフォルダには作らない 806ms
 ✓ scripts/cage/server.test.ts (28 tests) 29242ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1362ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 1922ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 895ms
     ✓ 外を読む 835ms
     ✓ テストを書き換える 884ms
     ✓ 迂回して書き換える 794ms
     ✓ 大文字で迂回 846ms
     ✓ git のフック 807ms
     ✓ 形式違いのコミット 803ms
     ✓ 知らない道具 798ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 706ms
     ✓ テストの実行に檻の環境変数を渡さない 813ms
     ✓ コード以外のファイルは純粋関数の検査をしない 738ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 1032ms
     ✓ task の形が違うと拒否する 712ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 1122ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1593ms
     ✓ 起動できない検査でも原因が見える 1225ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 701ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 1053ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 956ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 972ms
     ✓ 前の運転の REPORT は上書きしない 1109ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1298ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1301ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1305ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1340ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1313ms

 Test Files  56 passed (56)
      Tests  1420 passed (1420)
   Start at  07:44:31
   Duration  30.01s (tests 83%, transform 11%, import 6%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 39ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.5s
  Running TypeScript ...
  Finished TypeScript in 4.6s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/7) ...
  Generating static pages using 8 workers (1/7) 
  Generating static pages using 8 workers (3/7) 
  Generating static pages using 8 workers (5/7) 
✓ Generating static pages using 8 workers (7/7) in 844ms
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
