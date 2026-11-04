# T27 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 46e56e45e56315ce1314566a872086ee3c881f0d..HEAD
```
src/services/handover-document.ts

```

## C3 vitest run（T27 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/handover-document-config.test.ts (2 tests) 7ms
 ✓ src/services/handover-document.test.ts (28 tests) 21ms

 Test Files  2 passed (2)
      Tests  30 passed (30)
   Start at  14:38:16
   Duration  314ms (import 44%, tests 22%, transform 21%, worker 12%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 264 ファイルを確認
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

 ✓ src/services/handover-document.test.ts (28 tests) 21ms
 ✓ scripts/relay/relay-lib.test.ts (84 tests) 36ms
 ✓ src/services/session-token.test.ts (56 tests) 44ms
 ✓ src/services/upload-form.test.ts (57 tests) 33ms
 ✓ worker/migrations.test.ts (49 tests) 115ms
 ✓ src/services/upload-meta.test.ts (110 tests) 37ms
 ✓ src/services/photo-meta.test.ts (32 tests) 313ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (43 tests) 91ms
 ✓ src/services/status-reason.test.ts (52 tests) 33ms
 ✓ scripts/safety-rules.test.ts (64 tests) 36ms
 ✓ src/services/photo-groups.test.ts (15 tests) 20ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 37ms
 ✓ src/services/status-view.test.ts (21 tests) 33ms
 ✓ worker/assignment.test.ts (19 tests) 210ms
 ✓ worker/photos-field.test.ts (24 tests) 210ms
 ✓ worker/photos.test.ts (19 tests) 234ms
 ✓ worker/status-events.test.ts (26 tests) 245ms
 ✓ worker/fields.test.ts (31 tests) 249ms
 ✓ worker/status-history.test.ts (26 tests) 305ms
 ✓ worker/field-status.test.ts (48 tests) 336ms
 ✓ worker/session.test.ts (46 tests) 417ms
 ✓ worker/uploads.test.ts (36 tests) 421ms
 ✓ src/services/field-summary.test.ts (26 tests) 31ms
 ✓ src/repositories/implementations/http-field-status-repository.test.ts (15 tests) 102ms
 ✓ worker/app.test.ts (27 tests) 134ms
 ✓ src/services/photo-query.test.ts (60 tests) 26ms
 ✓ src/services/assignment.test.ts (26 tests) 21ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 22ms
 ✓ src/services/status-request.test.ts (47 tests) 24ms
 ✓ src/services/photo-labels.test.ts (37 tests) 20ms
 ✓ worker/env.test.ts (25 tests) 96ms
 ✓ src/services/session-request.test.ts (43 tests) 28ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 125ms
 ✓ src/services/status-events.test.ts (35 tests) 26ms
 ✓ worker/auth.test.ts (23 tests) 68ms
 ✓ worker/photo-files.test.ts (10 tests) 82ms
 ✓ src/services/candidates.test.ts (13 tests) 18ms
 ✓ src/data/fields.test.ts (9 tests) 20ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 105ms
 ✓ worker/router.test.ts (33 tests) 21ms
 ✓ worker/http.test.ts (13 tests) 79ms
 ✓ src/services/usage-limit.test.ts (19 tests) 17ms
 ✓ src/services/recent-view.test.ts (11 tests) 19ms
 ✓ scripts/cage/policy.test.ts (76 tests) 238ms
 ✓ worker/routes.test.ts (8 tests) 78ms
 ✓ worker/test-bucket.test.ts (5 tests) 122ms
 ✓ src/services/assignment-request.test.ts (24 tests) 16ms
 ✓ worker/photos-config.test.ts (3 tests) 102ms
 ✓ worker/test-db.test.ts (5 tests) 26ms
 ✓ src/services/upload-request.test.ts (4 tests) 15ms
 ✓ worker/session-config.test.ts (2 tests) 118ms
 ✓ worker/status-history-delegate.test.ts (1 test) 71ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 15ms
 ✓ src/services/status-request-delegate.test.ts (3 tests) 16ms
 ✓ src/config.test.ts (7 tests) 13ms
 ✓ worker/cookies.test.ts (13 tests) 12ms
 ✓ src/services/status-reason-config.test.ts (3 tests) 9ms
 ✓ src/services/handover-document-config.test.ts (2 tests) 12ms
 ✓ worker/uploads-config.test.ts (2 tests) 149ms
 ✓ src/services/resize-plan.test.ts (8 tests) 12ms
 ✓ worker/body.test.ts (10 tests) 57ms
 ✓ src/services/status-view-config.test.ts (2 tests) 9ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 25ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 70ms
 ✓ src/lib/sha256.test.ts (3 tests) 16ms
 ✓ worker/cookies-days.test.ts (1 test) 12ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2914ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1638ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 790ms
     ✓ 用意した直後はコミット済みで差分が無い 480ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 2798ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 8568ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 2946ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 13210ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 2213ms
     ✓ 本物の実装は渡らない 1160ms
     ✓ Git 管理外のファイルは渡せない 945ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 902ms
     ✓ 人の役には QUESTIONS だけが渡る 915ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 1239ms
     ✓ PR の番号でない値は受け付けない 876ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 849ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 1150ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 1233ms
     ✓ 知らない役は受け付けない 848ms
     ✓ 空でないフォルダには作らない 875ms
 ✓ scripts/cage/server.test.ts (28 tests) 35083ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1320ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 2648ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 965ms
     ✓ 外を読む 981ms
     ✓ テストを書き換える 910ms
     ✓ 迂回して書き換える 913ms
     ✓ 大文字で迂回 889ms
     ✓ git のフック 868ms
     ✓ 形式違いのコミット 883ms
     ✓ 知らない道具 890ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 884ms
     ✓ テストの実行に檻の環境変数を渡さない 943ms
     ✓ コード以外のファイルは純粋関数の検査をしない 826ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 1181ms
     ✓ task の形が違うと拒否する 815ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 1289ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1774ms
     ✓ 起動できない検査でも原因が見える 1405ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 808ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 1221ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 1169ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 1277ms
     ✓ 前の運転の REPORT は上書きしない 1453ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1814ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1774ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1744ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1782ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1653ms

 Test Files  71 passed (71)
      Tests  1750 passed (1750)
   Start at  14:38:37
   Duration  35.85s (tests 80%, transform 13%, import 6%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 71ms

  Creating an optimized production build ...
✓ Compiled successfully in 3.2s
  Running TypeScript ...
  Finished TypeScript in 6.9s ...
  Collecting page data using 9 workers ...
  Generating static pages using 9 workers (0/19) ...
  Generating static pages using 9 workers (4/19) 
  Generating static pages using 9 workers (9/19) 
  Generating static pages using 9 workers (14/19) 
✓ Generating static pages using 9 workers (19/19) in 1443ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├   /fields/[id]
│ ├ ● /fields/A-01
│ ├ ● /fields/A-02
│ ├ ● /fields/A-03
│ └ ● [+9 more paths]
├ ○ /icon.svg
├ ○ /manifest.webmanifest
├ ○ /recent
└ ○ /upload


○  (Static)  prerendered as static content
●  (SSG)     prerendered as static HTML (uses generateStaticParams)


```

## C5 git status --porcelain --untracked-files=all
```

```
