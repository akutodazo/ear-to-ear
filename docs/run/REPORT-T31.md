# T31 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 32823bd4a9af21ef0479e153264140ccae6da7c4..HEAD
```
src/services/usage-limit.ts
worker/handover-post.ts

```

## C3 vitest run（T31 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/usage-limit-claude.test.ts (17 tests) 20ms
 ✓ worker/routes.test.ts (10 tests) 39ms
 ✓ worker/handover-post.test.ts (31 tests) 149ms

 Test Files  3 passed (3)
      Tests  58 passed (58)
   Start at  16:09:54
   Duration  539ms (tests 39%, transform 32%, import 25%, worker 4%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 285 ファイルを確認
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

 ✓ src/services/handover-document.test.ts (29 tests) 28ms
 ✓ scripts/relay/relay-lib.test.ts (84 tests) 41ms
 ✓ worker/migrations.test.ts (49 tests) 68ms
 ✓ src/services/session-token.test.ts (56 tests) 44ms
 ✓ src/services/upload-form.test.ts (57 tests) 35ms
 ✓ src/services/handover-note.test.ts (72 tests) 39ms
 ✓ src/services/upload-meta.test.ts (110 tests) 45ms
 ✓ src/services/photo-meta.test.ts (32 tests) 256ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (43 tests) 108ms
 ✓ worker/fields.test.ts (31 tests) 218ms
 ✓ src/services/status-reason.test.ts (52 tests) 36ms
 ✓ worker/photos-field.test.ts (24 tests) 264ms
 ✓ worker/status-events.test.ts (26 tests) 216ms
 ✓ src/services/photo-groups.test.ts (15 tests) 26ms
 ✓ src/services/handover-request.test.ts (40 tests) 26ms
 ✓ worker/handover-post.test.ts (31 tests) 288ms
 ✓ worker/field-status.test.ts (48 tests) 309ms
 ✓ worker/status-history.test.ts (26 tests) 331ms
 ✓ worker/uploads.test.ts (36 tests) 392ms
 ✓ worker/session.test.ts (46 tests) 384ms
 ✓ worker/assignment.test.ts (19 tests) 221ms
 ✓ scripts/safety-rules.test.ts (64 tests) 32ms
 ✓ src/services/handover-citations.test.ts (27 tests) 28ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 39ms
 ✓ src/services/status-view.test.ts (21 tests) 27ms
 ✓ src/services/field-summary.test.ts (26 tests) 23ms
 ✓ worker/handover.test.ts (20 tests) 137ms
 ✓ worker/app.test.ts (27 tests) 92ms
 ✓ worker/photos.test.ts (19 tests) 205ms
 ✓ src/repositories/implementations/http-field-status-repository.test.ts (15 tests) 79ms
 ✓ src/services/photo-query.test.ts (60 tests) 28ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 25ms
 ✓ src/services/assignment.test.ts (26 tests) 22ms
 ✓ src/services/status-request.test.ts (47 tests) 25ms
 ✓ src/services/photo-labels.test.ts (37 tests) 17ms
 ✓ worker/env.test.ts (25 tests) 95ms
 ✓ src/services/session-request.test.ts (43 tests) 25ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 112ms
 ✓ src/services/status-events.test.ts (35 tests) 23ms
 ✓ worker/auth.test.ts (23 tests) 66ms
 ✓ worker/env-claude.test.ts (7 tests) 77ms
 ✓ worker/photo-files.test.ts (10 tests) 75ms
 ✓ src/services/candidates.test.ts (13 tests) 18ms
 ✓ src/data/fields.test.ts (9 tests) 18ms
 ✓ worker/router.test.ts (33 tests) 20ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 132ms
 ✓ worker/routes.test.ts (10 tests) 81ms
 ✓ src/services/usage-limit-claude.test.ts (17 tests) 27ms
 ✓ src/services/usage-limit.test.ts (19 tests) 20ms
 ✓ worker/http.test.ts (13 tests) 85ms
 ✓ scripts/cage/policy.test.ts (76 tests) 132ms
 ✓ src/services/recent-view.test.ts (11 tests) 15ms
 ✓ src/services/handover-request-delegate.test.ts (3 tests) 14ms
 ✓ src/services/assignment-request.test.ts (24 tests) 19ms
 ✓ worker/test-db.test.ts (5 tests) 24ms
 ✓ worker/test-bucket.test.ts (5 tests) 98ms
 ✓ worker/photos-config.test.ts (3 tests) 110ms
 ✓ worker/migrations-0002.test.ts (4 tests) 17ms
 ✓ src/services/upload-request.test.ts (4 tests) 12ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 14ms
 ✓ worker/status-history-delegate.test.ts (1 test) 62ms
 ✓ worker/session-config.test.ts (2 tests) 114ms
 ✓ worker/cookies.test.ts (13 tests) 14ms
 ✓ src/services/status-request-delegate.test.ts (3 tests) 13ms
 ✓ src/config.test.ts (7 tests) 14ms
 ✓ src/services/status-reason-config.test.ts (3 tests) 10ms
 ✓ src/services/handover-document-config.test.ts (2 tests) 13ms
 ✓ worker/uploads-config.test.ts (2 tests) 143ms
 ✓ worker/body.test.ts (10 tests) 61ms
 ✓ src/services/resize-plan.test.ts (8 tests) 10ms
 ✓ src/services/status-view-config.test.ts (2 tests) 7ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 21ms
 ✓ src/lib/sha256.test.ts (3 tests) 14ms
 ✓ worker/cookies-days.test.ts (1 test) 13ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 45ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2526ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1268ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 770ms
     ✓ 用意した直後はコミット済みで差分が無い 481ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 2567ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 8076ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 2780ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 12241ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 1852ms
     ✓ 本物の実装は渡らない 1147ms
     ✓ Git 管理外のファイルは渡せない 908ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 829ms
     ✓ 人の役には QUESTIONS だけが渡る 849ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 1209ms
     ✓ PR の番号でない値は受け付けない 839ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 853ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 1037ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 1165ms
     ✓ 知らない役は受け付けない 779ms
     ✓ 空でないフォルダには作らない 770ms
 ✓ scripts/cage/server.test.ts (28 tests) 33148ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1346ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 2071ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 939ms
     ✓ 外を読む 903ms
     ✓ テストを書き換える 857ms
     ✓ 迂回して書き換える 853ms
     ✓ 大文字で迂回 844ms
     ✓ git のフック 904ms
     ✓ 形式違いのコミット 893ms
     ✓ 知らない道具 804ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 800ms
     ✓ テストの実行に檻の環境変数を渡さない 893ms
     ✓ コード以外のファイルは純粋関数の検査をしない 758ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 1067ms
     ✓ task の形が違うと拒否する 728ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 1118ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1692ms
     ✓ 起動できない検査でも原因が見える 1519ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 881ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 1370ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 1169ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 1350ms
     ✓ 前の運転の REPORT は上書きしない 1330ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1704ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1573ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1686ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1563ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1531ms

 Test Files  80 passed (80)
      Tests  1974 passed (1974)
   Start at  16:10:14
   Duration  34.22s (tests 80%, transform 12%, import 7%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 48ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.8s
  Running TypeScript ...
  Finished TypeScript in 5.5s ...
  Collecting page data using 9 workers ...
  Generating static pages using 9 workers (0/19) ...
  Generating static pages using 9 workers (4/19) 
  Generating static pages using 9 workers (9/19) 
  Generating static pages using 9 workers (14/19) 
✓ Generating static pages using 9 workers (19/19) in 1235ms
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
