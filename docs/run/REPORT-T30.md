# T30 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 8c821d48cdf99598faba09822cc954856fe5ef1e..HEAD
```
src/services/handover-request.ts

```

## C3 vitest run（T30 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/handover-request-delegate.test.ts (3 tests) 10ms
 ✓ src/services/handover-request.test.ts (40 tests) 21ms

 Test Files  2 passed (2)
      Tests  43 passed (43)
   Start at  15:55:41
   Duration  312ms (import 48%, transform 23%, tests 20%, worker 9%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 280 ファイルを確認
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

 ✓ src/services/handover-document.test.ts (29 tests) 23ms
 ✓ worker/migrations.test.ts (49 tests) 64ms
 ✓ scripts/relay/relay-lib.test.ts (84 tests) 33ms
 ✓ src/services/session-token.test.ts (56 tests) 43ms
 ✓ src/services/upload-form.test.ts (57 tests) 35ms
 ✓ src/services/handover-note.test.ts (72 tests) 42ms
 ✓ src/services/upload-meta.test.ts (110 tests) 46ms
 ✓ src/services/photo-meta.test.ts (32 tests) 302ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (43 tests) 91ms
 ✓ src/services/status-reason.test.ts (52 tests) 31ms
 ✓ scripts/safety-rules.test.ts (64 tests) 29ms
 ✓ src/services/handover-request.test.ts (40 tests) 26ms
 ✓ src/services/photo-groups.test.ts (15 tests) 19ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 40ms
 ✓ worker/status-events.test.ts (26 tests) 216ms
 ✓ worker/assignment.test.ts (19 tests) 226ms
 ✓ worker/photos-field.test.ts (24 tests) 237ms
 ✓ worker/fields.test.ts (31 tests) 240ms
 ✓ worker/photos.test.ts (19 tests) 253ms
 ✓ worker/status-history.test.ts (26 tests) 293ms
 ✓ worker/field-status.test.ts (48 tests) 325ms
 ✓ worker/session.test.ts (46 tests) 380ms
 ✓ worker/handover.test.ts (20 tests) 172ms
 ✓ worker/uploads.test.ts (36 tests) 435ms
 ✓ src/services/handover-citations.test.ts (27 tests) 28ms
 ✓ src/services/status-view.test.ts (21 tests) 26ms
 ✓ worker/app.test.ts (27 tests) 103ms
 ✓ src/services/field-summary.test.ts (26 tests) 25ms
 ✓ src/services/photo-query.test.ts (60 tests) 31ms
 ✓ src/repositories/implementations/http-field-status-repository.test.ts (15 tests) 81ms
 ✓ src/services/status-request.test.ts (47 tests) 24ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 23ms
 ✓ src/services/assignment.test.ts (26 tests) 20ms
 ✓ src/services/photo-labels.test.ts (37 tests) 21ms
 ✓ worker/env.test.ts (25 tests) 95ms
 ✓ src/services/session-request.test.ts (43 tests) 28ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 114ms
 ✓ src/services/status-events.test.ts (35 tests) 27ms
 ✓ worker/auth.test.ts (23 tests) 70ms
 ✓ worker/photo-files.test.ts (10 tests) 84ms
 ✓ src/services/candidates.test.ts (13 tests) 19ms
 ✓ src/data/fields.test.ts (9 tests) 20ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 117ms
 ✓ worker/router.test.ts (33 tests) 22ms
 ✓ worker/http.test.ts (13 tests) 87ms
 ✓ worker/routes.test.ts (9 tests) 80ms
 ✓ src/services/usage-limit.test.ts (19 tests) 16ms
 ✓ src/services/recent-view.test.ts (11 tests) 13ms
 ✓ scripts/cage/policy.test.ts (76 tests) 146ms
 ✓ src/services/handover-request-delegate.test.ts (3 tests) 12ms
 ✓ src/services/assignment-request.test.ts (24 tests) 16ms
 ✓ worker/test-bucket.test.ts (5 tests) 81ms
 ✓ worker/test-db.test.ts (5 tests) 25ms
 ✓ worker/migrations-0002.test.ts (4 tests) 19ms
 ✓ src/services/upload-request.test.ts (4 tests) 13ms
 ✓ worker/photos-config.test.ts (3 tests) 122ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 13ms
 ✓ worker/status-history-delegate.test.ts (1 test) 52ms
 ✓ worker/session-config.test.ts (2 tests) 159ms
 ✓ src/services/status-request-delegate.test.ts (3 tests) 15ms
 ✓ worker/cookies.test.ts (13 tests) 15ms
 ✓ src/config.test.ts (7 tests) 18ms
 ✓ src/services/status-reason-config.test.ts (3 tests) 14ms
 ✓ worker/uploads-config.test.ts (2 tests) 140ms
 ✓ src/services/handover-document-config.test.ts (2 tests) 13ms
 ✓ src/services/resize-plan.test.ts (8 tests) 11ms
 ✓ worker/body.test.ts (10 tests) 60ms
 ✓ src/services/status-view-config.test.ts (2 tests) 9ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 22ms
 ✓ src/lib/sha256.test.ts (3 tests) 21ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 68ms
 ✓ worker/cookies-days.test.ts (1 test) 16ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2688ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1383ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 839ms
     ✓ 用意した直後はコミット済みで差分が無い 460ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 2704ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 8180ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 2764ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 13019ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 2008ms
     ✓ 本物の実装は渡らない 1215ms
     ✓ Git 管理外のファイルは渡せない 900ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 947ms
     ✓ 人の役には QUESTIONS だけが渡る 910ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 1293ms
     ✓ PR の番号でない値は受け付けない 897ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 839ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 1072ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 1185ms
     ✓ 知らない役は受け付けない 857ms
     ✓ 空でないフォルダには作らない 891ms
 ✓ scripts/cage/server.test.ts (28 tests) 33064ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1198ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 2249ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 1123ms
     ✓ 外を読む 955ms
     ✓ テストを書き換える 923ms
     ✓ 迂回して書き換える 949ms
     ✓ 大文字で迂回 902ms
     ✓ git のフック 901ms
     ✓ 形式違いのコミット 880ms
     ✓ 知らない道具 864ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 773ms
     ✓ テストの実行に檻の環境変数を渡さない 927ms
     ✓ コード以外のファイルは純粋関数の検査をしない 828ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 1211ms
     ✓ task の形が違うと拒否する 831ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 1258ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1744ms
     ✓ 起動できない検査でも原因が見える 1514ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 803ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 1243ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 1111ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 1209ms
     ✓ 前の運転の REPORT は上書きしない 1294ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1593ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1440ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1443ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1443ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1450ms

 Test Files  77 passed (77)
      Tests  1918 passed (1918)
   Start at  15:56:02
   Duration  33.85s (tests 78%, transform 14%, import 7%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 48ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.6s
  Running TypeScript ...
  Finished TypeScript in 5.4s ...
  Collecting page data using 9 workers ...
  Generating static pages using 9 workers (0/19) ...
  Generating static pages using 9 workers (4/19) 
  Generating static pages using 9 workers (9/19) 
  Generating static pages using 9 workers (14/19) 
✓ Generating static pages using 9 workers (19/19) in 1254ms
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
