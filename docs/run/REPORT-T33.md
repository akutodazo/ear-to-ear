# T33 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only dc6de93..HEAD
```
worker/handover-post.ts

```

## C3 vitest run（T33 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ worker/handover-post.test.ts (48 tests) 207ms

 Test Files  1 passed (1)
      Tests  48 passed (48)
   Start at  14:04:55
   Duration  615ms (tests 49%, transform 27%, import 23%, worker 2%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 448 ファイルを確認
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

 ✓ src/services/status-view.test.ts (46 tests) 24ms
 ✓ src/services/handover-document.test.ts (29 tests) 30ms
 ✓ scripts/relay/relay-lib.test.ts (84 tests) 52ms
 ✓ worker/migrations.test.ts (49 tests) 93ms
 ✓ worker/line-photos.test.ts (23 tests) 139ms
 ✓ src/services/photo-meta.test.ts (32 tests) 270ms
 ✓ src/services/upload-form.test.ts (57 tests) 28ms
 ✓ src/services/handover-view.test.ts (26 tests) 17ms
 ✓ src/services/session-token.test.ts (56 tests) 38ms
 ✓ src/services/upload-meta.test.ts (110 tests) 42ms
 ✓ scripts/safety-rules.test.ts (77 tests) 40ms
 ✓ src/services/line-image-event.test.ts (28 tests) 35ms
 ✓ src/services/handover-note.test.ts (72 tests) 46ms
 ✓ worker/line-notify.test.ts (18 tests) 238ms
 ✓ worker/photos-field.test.ts (24 tests) 246ms
 ✓ worker/fields.test.ts (31 tests) 299ms
 ✓ worker/status-history.test.ts (26 tests) 379ms
 ✓ worker/field-status.test.ts (48 tests) 392ms
 ✓ worker/session.test.ts (46 tests) 433ms
 ✓ worker/line-webhook.test.ts (30 tests) 419ms
 ✓ worker/uploads.test.ts (36 tests) 464ms
 ✓ worker/handover-post.test.ts (48 tests) 479ms
 ✓ src/services/status-reason.test.ts (52 tests) 36ms
 ✓ worker/env-line.test.ts (17 tests) 174ms
 ✓ src/services/handover-request.test.ts (40 tests) 26ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (43 tests) 103ms
 ✓ src/services/photo-groups.test.ts (15 tests) 25ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 34ms
 ✓ src/services/parcel-geometry.test.ts (26 tests) 28ms
 ✓ src/services/handover-citations.test.ts (27 tests) 34ms
 ✓ worker/status-events.test.ts (26 tests) 242ms
 ✓ worker/assignment.test.ts (19 tests) 189ms
 ✓ worker/photos.test.ts (19 tests) 229ms
 ✓ src/services/field-summary.test.ts (26 tests) 29ms
 ✓ worker/handover.test.ts (20 tests) 171ms
 ✓ worker/app.test.ts (27 tests) 129ms
 ✓ worker/shares.test.ts (13 tests) 244ms
 ✓ src/services/harvest-order.test.ts (14 tests) 18ms
 ✓ src/repositories/implementations/http-field-status-repository.test.ts (15 tests) 87ms
 ✓ src/services/photo-query.test.ts (60 tests) 36ms
 ✓ src/services/assignment.test.ts (26 tests) 21ms
 ✓ src/services/status-request.test.ts (47 tests) 24ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 23ms
 ✓ src/services/line-jpeg.test.ts (11 tests) 36ms
 ✓ worker/env.test.ts (25 tests) 95ms
 ✓ src/services/photo-labels.test.ts (37 tests) 18ms
 ✓ src/repositories/implementations/local-harvest-order-repository.test.ts (7 tests) 21ms
 ✓ src/services/text-phrases.test.ts (190 tests) 109ms
 ✓ src/services/last-season-handover.test.ts (15 tests) 19ms
 ✓ src/services/photo-compare.test.ts (12 tests) 15ms
 ✓ src/repositories/implementations/http-handover-repository.test.ts (10 tests) 87ms
 ✓ src/services/line-webhook.test.ts (39 tests) 23ms
 ✓ scripts/cage/policy.test.ts (87 tests) 150ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 110ms
 ✓ src/services/session-request.test.ts (43 tests) 23ms
 ✓ src/data/parcels.test.ts (9 tests) 34ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 102ms
 ✓ src/services/line-signature.test.ts (19 tests) 24ms
 ✓ worker/share-page.test.ts (7 tests) 97ms
 ✓ worker/env-claude.test.ts (7 tests) 82ms
 ✓ worker/auth.test.ts (23 tests) 65ms
 ✓ src/services/last-season.test.ts (13 tests) 16ms
 ✓ worker/photo-files.test.ts (10 tests) 92ms
 ✓ src/services/order-share-meta.test.ts (14 tests) 21ms
 ✓ src/services/status-events.test.ts (35 tests) 31ms
 ✓ src/services/candidates.test.ts (13 tests) 19ms
 ✓ worker/routes.test.ts (11 tests) 67ms
 ✓ worker/router.test.ts (33 tests) 20ms
 ✓ worker/session-cleanup.test.ts (5 tests) 96ms
 ✓ src/repositories/implementations/http-order-share-repository.test.ts (5 tests) 78ms
 ✓ src/services/line-notice.test.ts (10 tests) 16ms
 ✓ src/services/share-page.test.ts (9 tests) 17ms
 ✓ src/data/fields.test.ts (9 tests) 25ms
 ✓ src/services/tile-math.test.ts (6 tests) 18ms
 ✓ src/services/handover-labels.test.ts (5 tests) 18ms
 ✓ worker/http.test.ts (13 tests) 81ms
 ✓ src/services/usage-limit.test.ts (19 tests) 18ms
 ✓ src/services/usage-limit-claude.test.ts (17 tests) 31ms
 ✓ src/services/order-share-view.test.ts (12 tests) 17ms
 ✓ src/services/recent-view.test.ts (11 tests) 14ms
 ✓ src/services/handover-request-delegate.test.ts (3 tests) 11ms
 ✓ src/data/handover-2025.test.ts (5 tests) 16ms
 ✓ src/services/usage-limit-line.test.ts (19 tests) 181ms
 ✓ src/services/assignment-request.test.ts (24 tests) 18ms
 ✓ worker/test-bucket.test.ts (5 tests) 82ms
 ✓ src/services/order-message.test.ts (5 tests) 10ms
 ✓ worker/test-db.test.ts (5 tests) 30ms
 ✓ worker/photos-config.test.ts (3 tests) 176ms
 ✓ worker/migrations-0002.test.ts (4 tests) 19ms
 ✓ worker/migrations-0003.test.ts (4 tests) 17ms
 ✓ src/services/upload-request.test.ts (4 tests) 12ms
 ✓ worker/migrations-0004.test.ts (3 tests) 17ms
 ✓ src/data/seasons.test.ts (4 tests) 13ms
 ✓ src/services/compare-note.test.ts (4 tests) 7ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 13ms
 ✓ worker/status-history-delegate.test.ts (1 test) 60ms
 ✓ worker/session-config.test.ts (2 tests) 190ms
 ✓ worker/cookies.test.ts (13 tests) 12ms
 ✓ src/services/status-request-delegate.test.ts (3 tests) 14ms
 ✓ src/config.test.ts (7 tests) 11ms
 ✓ src/services/map-config.test.ts (4 tests) 10ms
 ✓ src/services/status-reason-config.test.ts (3 tests) 9ms
 ✓ worker/uploads-config.test.ts (2 tests) 217ms
 ✓ src/services/handover-document-config.test.ts (2 tests) 11ms
 ✓ src/services/field-hash.test.ts (3 tests) 9ms
 ✓ src/services/order-image-layout.test.ts (6 tests) 11ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 56ms
 ✓ src/data/benchmarks.test.ts (3 tests) 8ms
 ✓ src/services/memo-offer.test.ts (3 tests) 8ms
 ✓ worker/body.test.ts (10 tests) 56ms
 ✓ src/services/usage-limit-line-photo.test.ts (6 tests) 12ms
 ✓ src/services/resize-plan.test.ts (8 tests) 11ms
 ✓ src/services/status-view-config.test.ts (2 tests) 8ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 20ms
 ✓ src/services/login-label.test.ts (1 test) 6ms
 ✓ src/lib/sha256.test.ts (3 tests) 11ms
 ✓ worker/cookies-days.test.ts (1 test) 11ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2795ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1376ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 958ms
     ✓ 用意した直後はコミット済みで差分が無い 455ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 2710ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 9327ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 3088ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 12479ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 1885ms
     ✓ 本物の実装は渡らない 1573ms
     ✓ Git 管理外のファイルは渡せない 884ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 763ms
     ✓ 人の役には QUESTIONS だけが渡る 811ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 1191ms
     ✓ PR の番号でない値は受け付けない 849ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 816ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 1019ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 1109ms
     ✓ 知らない役は受け付けない 797ms
     ✓ 空でないフォルダには作らない 778ms
 ✓ scripts/cage/server.test.ts (28 tests) 30731ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1372ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 2261ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 1323ms
     ✓ 外を読む 910ms
     ✓ テストを書き換える 790ms
     ✓ 迂回して書き換える 841ms
     ✓ 大文字で迂回 864ms
     ✓ git のフック 811ms
     ✓ 形式違いのコミット 826ms
     ✓ 知らない道具 809ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 751ms
     ✓ テストの実行に檻の環境変数を渡さない 844ms
     ✓ コード以外のファイルは純粋関数の検査をしない 772ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 1071ms
     ✓ task の形が違うと拒否する 705ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 1132ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1571ms
     ✓ 起動できない検査でも原因が見える 1263ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 710ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 1104ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 983ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 992ms
     ✓ 前の運転の REPORT は上書きしない 1090ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1361ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1362ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1361ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1361ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1485ms

 Test Files  122 passed (122)
      Tests  2704 passed (2704)
   Start at  14:05:22
   Duration  32.70s (tests 72%, transform 17%, import 10%, worker 1%)

    Isolate  122 workers spawned · ~333ms startup each (spawn + environment, per file)
             at least ~2.38s faster with isolate: false — reuses workers across files instead of one per file


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 42ms

  Creating an optimized production build ...
✓ Compiled successfully in 3.1s
  Running TypeScript ...
  Finished TypeScript in 7.0s ...
  Collecting page data using 10 workers ...
  Generating static pages using 10 workers (0/20) ...
  Generating static pages using 10 workers (5/20) 
  Generating static pages using 10 workers (10/20) 
  Generating static pages using 10 workers (15/20) 
✓ Generating static pages using 10 workers (20/20) in 1222ms
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
├ ○ /order
├ ○ /recent
└ ○ /upload


○  (Static)  prerendered as static content
●  (SSG)     prerendered as static HTML (uses generateStaticParams)


```

## C5 git status --porcelain --untracked-files=all
```

```
