# T28 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 1b9f71f59d91f536e52edaa5786f3ebbb70f650f..HEAD
```
src/services/handover-citations.ts

```

## C3 vitest run（T28 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/handover-citations.test.ts (26 tests) 18ms

 Test Files  1 passed (1)
      Tests  26 passed (26)
   Start at  14:51:01
   Duration  279ms (import 42%, tests 28%, transform 18%, worker 11%, environment 1%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 263 ファイルを確認
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

 ✓ worker/migrations.test.ts (49 tests) 76ms
 ✓ scripts/relay/relay-lib.test.ts (84 tests) 41ms
 ✓ src/services/session-token.test.ts (56 tests) 44ms
 ✓ src/services/upload-form.test.ts (57 tests) 36ms
 ✓ src/services/upload-meta.test.ts (110 tests) 45ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (43 tests) 89ms
 ✓ src/services/photo-meta.test.ts (32 tests) 279ms
 ✓ src/services/status-reason.test.ts (52 tests) 31ms
 ✓ scripts/safety-rules.test.ts (64 tests) 26ms
 ✓ src/services/photo-groups.test.ts (15 tests) 22ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 31ms
 ✓ src/services/status-view.test.ts (21 tests) 18ms
 ✓ src/services/handover-citations.test.ts (26 tests) 28ms
 ✓ worker/assignment.test.ts (19 tests) 152ms
 ✓ worker/status-events.test.ts (26 tests) 229ms
 ✓ worker/fields.test.ts (31 tests) 244ms
 ✓ worker/photos.test.ts (19 tests) 273ms
 ✓ worker/status-history.test.ts (26 tests) 290ms
 ✓ worker/photos-field.test.ts (24 tests) 282ms
 ✓ worker/field-status.test.ts (48 tests) 353ms
 ✓ worker/app.test.ts (27 tests) 175ms
 ✓ worker/uploads.test.ts (36 tests) 388ms
 ✓ worker/session.test.ts (46 tests) 427ms
 ✓ src/services/field-summary.test.ts (26 tests) 28ms
 ✓ src/repositories/implementations/http-field-status-repository.test.ts (15 tests) 88ms
 ✓ src/services/photo-query.test.ts (60 tests) 31ms
 ✓ src/services/assignment.test.ts (26 tests) 19ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 25ms
 ✓ src/services/status-request.test.ts (47 tests) 27ms
 ✓ src/services/photo-labels.test.ts (37 tests) 21ms
 ✓ worker/env.test.ts (25 tests) 113ms
 ✓ src/services/session-request.test.ts (43 tests) 30ms
 ✓ src/services/status-events.test.ts (35 tests) 25ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 174ms
 ✓ worker/auth.test.ts (23 tests) 112ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 131ms
 ✓ worker/photo-files.test.ts (10 tests) 93ms
 ✓ worker/router.test.ts (33 tests) 20ms
 ✓ src/data/fields.test.ts (9 tests) 19ms
 ✓ src/services/candidates.test.ts (13 tests) 18ms
 ✓ worker/http.test.ts (13 tests) 79ms
 ✓ src/services/usage-limit.test.ts (19 tests) 18ms
 ✓ src/services/recent-view.test.ts (11 tests) 14ms
 ✓ scripts/cage/policy.test.ts (76 tests) 181ms
 ✓ src/services/assignment-request.test.ts (24 tests) 20ms
 ✓ worker/routes.test.ts (8 tests) 64ms
 ✓ worker/test-bucket.test.ts (5 tests) 84ms
 ✓ src/services/upload-request.test.ts (4 tests) 13ms
 ✓ worker/test-db.test.ts (5 tests) 26ms
 ✓ worker/photos-config.test.ts (3 tests) 108ms
 ✓ worker/status-history-delegate.test.ts (1 test) 61ms
 ✓ worker/session-config.test.ts (2 tests) 143ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 13ms
 ✓ src/services/status-request-delegate.test.ts (3 tests) 16ms
 ✓ worker/cookies.test.ts (13 tests) 14ms
 ✓ src/services/status-reason-config.test.ts (3 tests) 9ms
 ✓ src/config.test.ts (7 tests) 16ms
 ✓ worker/uploads-config.test.ts (2 tests) 114ms
 ✓ src/services/resize-plan.test.ts (8 tests) 13ms
 ✓ worker/body.test.ts (10 tests) 61ms
 ✓ src/services/status-view-config.test.ts (2 tests) 10ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 20ms
 ✓ src/lib/sha256.test.ts (3 tests) 15ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 50ms
 ✓ worker/cookies-days.test.ts (1 test) 13ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2739ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1427ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 808ms
     ✓ 用意した直後はコミット済みで差分が無い 499ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 2676ms
   ✓ 対象の編集 (8)
     ✓ src/lib/resize.ts の編集の直前に K1・K6 の問いが文脈に入る 310ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 8400ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 2914ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 13206ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 2069ms
     ✓ 本物の実装は渡らない 1178ms
     ✓ Git 管理外のファイルは渡せない 950ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 876ms
     ✓ 人の役には QUESTIONS だけが渡る 930ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 1242ms
     ✓ PR の番号でない値は受け付けない 921ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 896ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 1134ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 1272ms
     ✓ 知らない役は受け付けない 898ms
     ✓ 空でないフォルダには作らない 836ms
 ✓ scripts/cage/server.test.ts (28 tests) 33388ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1296ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 2456ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 985ms
     ✓ 外を読む 951ms
     ✓ テストを書き換える 871ms
     ✓ 迂回して書き換える 922ms
     ✓ 大文字で迂回 918ms
     ✓ git のフック 909ms
     ✓ 形式違いのコミット 919ms
     ✓ 知らない道具 906ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 843ms
     ✓ テストの実行に檻の環境変数を渡さない 960ms
     ✓ コード以外のファイルは純粋関数の検査をしない 821ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 1146ms
     ✓ task の形が違うと拒否する 768ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 1294ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1656ms
     ✓ 起動できない検査でも原因が見える 1367ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 777ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 1226ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 1109ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 1163ms
     ✓ 前の運転の REPORT は上書きしない 1357ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1631ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1551ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1530ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1544ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1508ms

 Test Files  70 passed (70)
      Tests  1746 passed (1746)
   Start at  14:51:24
   Duration  34.18s (tests 80%, transform 13%, import 6%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 44ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.9s
  Running TypeScript ...
  Finished TypeScript in 5.5s ...
  Collecting page data using 9 workers ...
  Generating static pages using 9 workers (0/19) ...
  Generating static pages using 9 workers (4/19) 
  Generating static pages using 9 workers (9/19) 
  Generating static pages using 9 workers (14/19) 
✓ Generating static pages using 9 workers (19/19) in 1189ms
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
