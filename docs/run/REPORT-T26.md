# T26 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only b1872ed77a2e7eba3bbb86c136b87a161244ab04..HEAD
```
worker/status-history.ts

```

## C3 vitest run（T26 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ worker/routes.test.ts (8 tests) 44ms
 ✓ worker/status-history-delegate.test.ts (1 test) 47ms
 ✓ worker/status-history.test.ts (26 tests) 153ms

 Test Files  3 passed (3)
      Tests  35 passed (35)
   Start at  11:50:44
   Duration  518ms (tests 40%, import 29%, transform 27%, worker 4%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 250 ファイルを確認
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

 ✓ scripts/relay/relay-lib.test.ts (84 tests) 35ms
 ✓ worker/migrations.test.ts (49 tests) 76ms
 ✓ src/services/upload-form.test.ts (57 tests) 29ms
 ✓ src/services/session-token.test.ts (56 tests) 47ms
 ✓ src/services/upload-meta.test.ts (110 tests) 48ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (43 tests) 112ms
 ✓ src/services/photo-meta.test.ts (32 tests) 308ms
 ✓ src/services/status-reason.test.ts (52 tests) 39ms
 ✓ scripts/safety-rules.test.ts (64 tests) 38ms
 ✓ worker/status-events.test.ts (26 tests) 213ms
 ✓ worker/photos-field.test.ts (24 tests) 222ms
 ✓ worker/fields.test.ts (31 tests) 219ms
 ✓ worker/assignment.test.ts (19 tests) 173ms
 ✓ worker/field-status.test.ts (48 tests) 299ms
 ✓ src/services/photo-groups.test.ts (15 tests) 26ms
 ✓ worker/status-history.test.ts (26 tests) 287ms
 ✓ worker/session.test.ts (46 tests) 360ms
 ✓ worker/uploads.test.ts (36 tests) 422ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 46ms
 ✓ src/services/field-summary.test.ts (26 tests) 28ms
 ✓ worker/photos.test.ts (19 tests) 211ms
 ✓ worker/app.test.ts (27 tests) 100ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 23ms
 ✓ src/services/photo-query.test.ts (60 tests) 28ms
 ✓ src/services/assignment.test.ts (26 tests) 23ms
 ✓ src/services/status-request.test.ts (47 tests) 29ms
 ✓ src/services/photo-labels.test.ts (37 tests) 25ms
 ✓ worker/env.test.ts (25 tests) 106ms
 ✓ src/services/session-request.test.ts (43 tests) 22ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 112ms
 ✓ src/services/status-events.test.ts (35 tests) 31ms
 ✓ src/services/candidates.test.ts (13 tests) 16ms
 ✓ worker/photo-files.test.ts (10 tests) 100ms
 ✓ worker/auth.test.ts (23 tests) 67ms
 ✓ worker/router.test.ts (33 tests) 22ms
 ✓ src/data/fields.test.ts (9 tests) 22ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 115ms
 ✓ worker/http.test.ts (13 tests) 89ms
 ✓ src/services/usage-limit.test.ts (19 tests) 19ms
 ✓ src/services/recent-view.test.ts (11 tests) 13ms
 ✓ worker/routes.test.ts (8 tests) 66ms
 ✓ src/services/assignment-request.test.ts (24 tests) 18ms
 ✓ worker/test-db.test.ts (5 tests) 23ms
 ✓ scripts/cage/policy.test.ts (76 tests) 221ms
 ✓ worker/test-bucket.test.ts (5 tests) 102ms
 ✓ worker/photos-config.test.ts (3 tests) 104ms
 ✓ src/services/upload-request.test.ts (4 tests) 11ms
 ✓ worker/status-history-delegate.test.ts (1 test) 68ms
 ✓ worker/session-config.test.ts (2 tests) 107ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 14ms
 ✓ src/services/status-request-delegate.test.ts (3 tests) 13ms
 ✓ worker/cookies.test.ts (13 tests) 16ms
 ✓ src/config.test.ts (7 tests) 17ms
 ✓ src/services/status-reason-config.test.ts (3 tests) 12ms
 ✓ worker/body.test.ts (10 tests) 66ms
 ✓ worker/uploads-config.test.ts (2 tests) 127ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 28ms
 ✓ src/services/resize-plan.test.ts (8 tests) 16ms
 ✓ src/lib/sha256.test.ts (3 tests) 19ms
 ✓ worker/cookies-days.test.ts (1 test) 11ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 46ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2535ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1296ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 766ms
     ✓ 用意した直後はコミット済みで差分が無い 466ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 2607ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 7946ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 2708ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 12449ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 1857ms
     ✓ 本物の実装は渡らない 1106ms
     ✓ Git 管理外のファイルは渡せない 926ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 869ms
     ✓ 人の役には QUESTIONS だけが渡る 851ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 1264ms
     ✓ PR の番号でない値は受け付けない 830ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 851ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 1082ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 1190ms
     ✓ 知らない役は受け付けない 794ms
     ✓ 空でないフォルダには作らない 828ms
 ✓ scripts/cage/server.test.ts (28 tests) 31823ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1423ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 2015ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 964ms
     ✓ 外を読む 948ms
     ✓ テストを書き換える 896ms
     ✓ 迂回して書き換える 847ms
     ✓ 大文字で迂回 917ms
     ✓ git のフック 864ms
     ✓ 形式違いのコミット 838ms
     ✓ 知らない道具 822ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 841ms
     ✓ テストの実行に檻の環境変数を渡さない 900ms
     ✓ コード以外のファイルは純粋関数の検査をしない 761ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 1148ms
     ✓ task の形が違うと拒否する 838ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 1247ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1742ms
     ✓ 起動できない検査でも原因が見える 1371ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 722ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 1104ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 962ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 1039ms
     ✓ 前の運転の REPORT は上書きしない 1276ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1537ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1463ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1461ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1449ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1424ms

 Test Files  66 passed (66)
      Tests  1682 passed (1682)
   Start at  11:51:05
   Duration  32.54s (tests 83%, transform 10%, import 6%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 48ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.7s
  Running TypeScript ...
  Finished TypeScript in 5.1s ...
  Collecting page data using 9 workers ...
  Generating static pages using 9 workers (0/19) ...
  Generating static pages using 9 workers (4/19) 
  Generating static pages using 9 workers (9/19) 
  Generating static pages using 9 workers (14/19) 
✓ Generating static pages using 9 workers (19/19) in 1205ms
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
