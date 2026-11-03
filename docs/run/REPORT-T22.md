# T22 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 380579d0f8461e3be5910958411b756472eb393c..HEAD
```
src/services/photo-query.ts
worker/photos.ts

```

## C3 vitest run（T22 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/photo-query.test.ts (60 tests) 20ms
 ✓ worker/routes.test.ts (4 tests) 36ms
 ✓ worker/photos-config.test.ts (3 tests) 107ms
 ✓ worker/app.test.ts (27 tests) 65ms
 ✓ worker/photos-field.test.ts (24 tests) 107ms

 Test Files  5 passed (5)
      Tests  118 passed (118)
   Start at  00:35:56
   Duration  478ms (tests 44%, import 27%, transform 24%, worker 5%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 205 ファイルを確認
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

 ✓ worker/migrations.test.ts (49 tests) 79ms
 ✓ src/services/upload-form.test.ts (57 tests) 34ms
 ✓ src/services/session-token.test.ts (56 tests) 38ms
 ✓ src/services/upload-meta.test.ts (110 tests) 34ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 29ms
 ✓ scripts/safety-rules.test.ts (64 tests) 28ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (38 tests) 91ms
 ✓ src/services/photo-meta.test.ts (32 tests) 299ms
 ✓ worker/app.test.ts (27 tests) 84ms
 ✓ worker/assignment.test.ts (19 tests) 147ms
 ✓ worker/photos-field.test.ts (24 tests) 180ms
 ✓ worker/photos.test.ts (19 tests) 205ms
 ✓ src/services/photo-query.test.ts (60 tests) 31ms
 ✓ worker/session.test.ts (46 tests) 337ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 22ms
 ✓ src/services/assignment.test.ts (26 tests) 21ms
 ✓ worker/uploads.test.ts (36 tests) 360ms
 ✓ src/services/photo-labels.test.ts (37 tests) 21ms
 ✓ worker/env.test.ts (25 tests) 109ms
 ✓ src/services/session-request.test.ts (43 tests) 24ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 106ms
 ✓ src/services/candidates.test.ts (13 tests) 15ms
 ✓ worker/router.test.ts (33 tests) 17ms
 ✓ worker/auth.test.ts (23 tests) 76ms
 ✓ worker/photo-files.test.ts (10 tests) 77ms
 ✓ src/data/fields.test.ts (9 tests) 16ms
 ✓ worker/http.test.ts (13 tests) 69ms
 ✓ src/services/usage-limit.test.ts (19 tests) 15ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 107ms
 ✓ src/services/recent-view.test.ts (11 tests) 13ms
 ✓ worker/test-bucket.test.ts (5 tests) 74ms
 ✓ scripts/cage/policy.test.ts (76 tests) 135ms
 ✓ src/services/assignment-request.test.ts (24 tests) 15ms
 ✓ worker/photos-config.test.ts (3 tests) 92ms
 ✓ worker/test-db.test.ts (5 tests) 23ms
 ✓ src/services/upload-request.test.ts (4 tests) 11ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 13ms
 ✓ worker/session-config.test.ts (2 tests) 100ms
 ✓ worker/cookies.test.ts (13 tests) 11ms
 ✓ src/services/resize-plan.test.ts (8 tests) 11ms
 ✓ worker/routes.test.ts (4 tests) 62ms
 ✓ worker/uploads-config.test.ts (2 tests) 108ms
 ✓ worker/body.test.ts (10 tests) 55ms
 ✓ src/config.test.ts (5 tests) 11ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 19ms
 ✓ src/lib/sha256.test.ts (3 tests) 16ms
 ✓ worker/cookies-days.test.ts (1 test) 10ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 46ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2329ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1097ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 790ms
     ✓ 用意した直後はコミット済みで差分が無い 435ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 2345ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 8657ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 3243ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 11612ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 1599ms
     ✓ 本物の実装は渡らない 1112ms
     ✓ Git 管理外のファイルは渡せない 870ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 784ms
     ✓ 人の役には QUESTIONS だけが渡る 848ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 1165ms
     ✓ PR の番号でない値は受け付けない 773ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 793ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 1021ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 1080ms
     ✓ 知らない役は受け付けない 770ms
     ✓ 空でないフォルダには作らない 793ms
 ✓ scripts/cage/server.test.ts (28 tests) 29036ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1261ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 1686ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 911ms
     ✓ 外を読む 843ms
     ✓ テストを書き換える 792ms
     ✓ 迂回して書き換える 833ms
     ✓ 大文字で迂回 839ms
     ✓ git のフック 775ms
     ✓ 形式違いのコミット 807ms
     ✓ 知らない道具 834ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 786ms
     ✓ テストの実行に檻の環境変数を渡さない 809ms
     ✓ コード以外のファイルは純粋関数の検査をしない 735ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 1046ms
     ✓ task の形が違うと拒否する 670ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 1084ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1656ms
     ✓ 起動できない検査でも原因が見える 1206ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 714ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 1071ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 953ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 1041ms
     ✓ 前の運転の REPORT は上書きしない 1106ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1304ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1335ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1314ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1344ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1278ms

 Test Files  53 passed (53)
      Tests  1274 passed (1274)
   Start at  00:36:15
   Duration  29.65s (tests 85%, transform 9%, import 5%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 47ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.6s
  Running TypeScript ...
  Finished TypeScript in 4.8s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/7) ...
  Generating static pages using 8 workers (1/7) 
  Generating static pages using 8 workers (3/7) 
  Generating static pages using 8 workers (5/7) 
✓ Generating static pages using 8 workers (7/7) in 919ms
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
