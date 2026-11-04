# T32 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 43b43c7d58e4f21b929fab3795cf1549f51355e2..HEAD
```
src/services/handover-view.ts

```

## C3 vitest run（T32 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/handover-view.test.ts (24 tests) 9ms

 Test Files  1 passed (1)
      Tests  24 passed (24)
   Start at  17:02:55
   Duration  237ms (import 42%, transform 27%, tests 18%, worker 12%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 295 ファイルを確認
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

 ✓ src/services/handover-document.test.ts (29 tests) 16ms
 ✓ worker/migrations.test.ts (49 tests) 48ms
 ✓ src/services/handover-view.test.ts (24 tests) 16ms
 ✓ src/services/status-view.test.ts (31 tests) 19ms
 ✓ src/services/session-token.test.ts (56 tests) 35ms
 ✓ scripts/relay/relay-lib.test.ts (84 tests) 35ms
 ✓ src/services/upload-meta.test.ts (110 tests) 30ms
 ✓ src/services/upload-form.test.ts (57 tests) 23ms
 ✓ src/services/photo-meta.test.ts (32 tests) 244ms
 ✓ src/services/handover-note.test.ts (72 tests) 21ms
 ✓ src/services/status-reason.test.ts (52 tests) 22ms
 ✓ scripts/safety-rules.test.ts (64 tests) 20ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (43 tests) 57ms
 ✓ src/services/handover-request.test.ts (40 tests) 16ms
 ✓ src/services/photo-groups.test.ts (15 tests) 17ms
 ✓ worker/photos-field.test.ts (24 tests) 153ms
 ✓ worker/fields.test.ts (31 tests) 176ms
 ✓ worker/assignment.test.ts (19 tests) 186ms
 ✓ worker/status-history.test.ts (26 tests) 236ms
 ✓ worker/status-events.test.ts (26 tests) 244ms
 ✓ worker/field-status.test.ts (48 tests) 251ms
 ✓ worker/session.test.ts (46 tests) 329ms
 ✓ worker/uploads.test.ts (36 tests) 375ms
 ✓ src/services/handover-citations.test.ts (27 tests) 18ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 24ms
 ✓ worker/photos.test.ts (19 tests) 218ms
 ✓ worker/handover.test.ts (20 tests) 131ms
 ✓ src/repositories/implementations/http-field-status-repository.test.ts (15 tests) 84ms
 ✓ src/services/photo-query.test.ts (60 tests) 32ms
 ✓ worker/app.test.ts (27 tests) 85ms
 ✓ src/services/field-summary.test.ts (26 tests) 28ms
 ✓ src/services/assignment.test.ts (26 tests) 16ms
 ✓ src/services/status-request.test.ts (47 tests) 18ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 23ms
 ✓ worker/env.test.ts (25 tests) 84ms
 ✓ src/services/photo-labels.test.ts (37 tests) 15ms
 ✓ src/repositories/implementations/http-handover-repository.test.ts (10 tests) 60ms
 ✓ src/services/session-request.test.ts (43 tests) 17ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 90ms
 ✓ src/services/status-events.test.ts (35 tests) 23ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 67ms
 ✓ worker/auth.test.ts (23 tests) 52ms
 ✓ src/services/candidates.test.ts (13 tests) 12ms
 ✓ worker/photo-files.test.ts (10 tests) 58ms
 ✓ src/data/fields.test.ts (9 tests) 13ms
 ✓ worker/http.test.ts (13 tests) 59ms
 ✓ worker/router.test.ts (33 tests) 14ms
 ✓ worker/routes.test.ts (9 tests) 52ms
 ✓ scripts/cage/policy.test.ts (76 tests) 115ms
 ✓ src/services/usage-limit.test.ts (19 tests) 12ms
 ✓ src/services/recent-view.test.ts (11 tests) 10ms
 ✓ src/services/handover-labels.test.ts (3 tests) 8ms
 ✓ src/services/handover-request-delegate.test.ts (3 tests) 9ms
 ✓ src/services/assignment-request.test.ts (24 tests) 11ms
 ✓ worker/photos-config.test.ts (3 tests) 99ms
 ✓ worker/test-bucket.test.ts (5 tests) 106ms
 ✓ worker/test-db.test.ts (5 tests) 21ms
 ✓ worker/migrations-0002.test.ts (4 tests) 15ms
 ✓ src/services/upload-request.test.ts (4 tests) 8ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 9ms
 ✓ worker/status-history-delegate.test.ts (1 test) 47ms
 ✓ src/services/status-request-delegate.test.ts (3 tests) 8ms
 ✓ worker/session-config.test.ts (2 tests) 171ms
 ✓ worker/cookies.test.ts (13 tests) 8ms
 ✓ src/config.test.ts (7 tests) 11ms
 ✓ src/services/status-reason-config.test.ts (3 tests) 7ms
 ✓ src/services/handover-document-config.test.ts (2 tests) 8ms
 ✓ worker/uploads-config.test.ts (2 tests) 126ms
 ✓ worker/body.test.ts (10 tests) 42ms
 ✓ src/services/resize-plan.test.ts (8 tests) 8ms
 ✓ src/services/login-label.test.ts (1 test) 6ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 50ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 18ms
 ✓ src/services/status-view-config.test.ts (2 tests) 6ms
 ✓ src/lib/sha256.test.ts (3 tests) 11ms
 ✓ worker/cookies-days.test.ts (1 test) 9ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 1775ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2136ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1106ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 660ms
     ✓ 用意した直後はコミット済みで差分が無い 366ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 6244ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 2010ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 9700ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 1689ms
     ✓ 本物の実装は渡らない 927ms
     ✓ Git 管理外のファイルは渡せない 685ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 623ms
     ✓ 人の役には QUESTIONS だけが渡る 626ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 944ms
     ✓ PR の番号でない値は受け付けない 628ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 631ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 768ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 875ms
     ✓ 知らない役は受け付けない 632ms
     ✓ 空でないフォルダには作らない 669ms
 ✓ scripts/cage/server.test.ts (28 tests) 23930ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1285ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 1815ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 708ms
     ✓ 外を読む 681ms
     ✓ テストを書き換える 595ms
     ✓ 迂回して書き換える 603ms
     ✓ 大文字で迂回 630ms
     ✓ git のフック 626ms
     ✓ 形式違いのコミット 613ms
     ✓ 知らない道具 589ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 549ms
     ✓ テストの実行に檻の環境変数を渡さない 612ms
     ✓ コード以外のファイルは純粋関数の検査をしない 566ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 873ms
     ✓ task の形が違うと拒否する 566ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 843ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1370ms
     ✓ 起動できない検査でも原因が見える 1020ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 589ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 794ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 840ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 835ms
     ✓ 前の運転の REPORT は上書きしない 963ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1061ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1101ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1055ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1077ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1066ms

 Test Files  81 passed (81)
      Tests  1966 passed (1966)
   Start at  17:03:14
   Duration  24.78s (tests 78%, transform 12%, import 8%, worker 2%)

    Isolate  81 workers spawned · ~359ms startup each (spawn + environment, per file)
             at least ~1.58s faster with isolate: false — reuses workers across files instead of one per file


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 37ms

  Creating an optimized production build ...
✓ Compiled successfully in 1710ms
  Running TypeScript ...
  Finished TypeScript in 4.3s ...
  Collecting page data using 9 workers ...
  Generating static pages using 9 workers (0/19) ...
  Generating static pages using 9 workers (4/19) 
  Generating static pages using 9 workers (9/19) 
  Generating static pages using 9 workers (14/19) 
✓ Generating static pages using 9 workers (19/19) in 1229ms
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
