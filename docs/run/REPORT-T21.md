# T21 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 1e4e8eb..HEAD
```
src/services/photo-query.ts
worker/photo-files.ts
worker/photos.ts

```

## C3 vitest run（T21 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/photo-query.test.ts (42 tests) 16ms
 ✓ worker/photos-config.test.ts (2 tests) 83ms
 ✓ worker/routes.test.ts (3 tests) 44ms
 ✓ worker/photo-files.test.ts (10 tests) 49ms
 ✓ worker/app.test.ts (27 tests) 63ms
 ✓ worker/photos.test.ts (19 tests) 102ms

 Test Files  6 passed (6)
      Tests  103 passed (103)
   Start at  19:29:28
   Duration  494ms (tests 38%, import 29%, transform 28%, worker 5%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 191 ファイルを確認
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

 ✓ worker/migrations.test.ts (49 tests) 87ms
 ✓ src/services/session-token.test.ts (56 tests) 40ms
 ✓ src/services/upload-form.test.ts (57 tests) 25ms
 ✓ src/services/upload-meta.test.ts (110 tests) 36ms
 ✓ scripts/safety-rules.test.ts (64 tests) 40ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 49ms
 ✓ src/services/assignment.test.ts (26 tests) 25ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (38 tests) 110ms
 ✓ src/services/photo-meta.test.ts (32 tests) 308ms
 ✓ worker/app.test.ts (27 tests) 96ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 22ms
 ✓ src/services/photo-query.test.ts (42 tests) 30ms
 ✓ worker/photos.test.ts (19 tests) 220ms
 ✓ src/services/photo-labels.test.ts (34 tests) 20ms
 ✓ worker/session.test.ts (46 tests) 367ms
 ✓ worker/env.test.ts (25 tests) 134ms
 ✓ worker/uploads.test.ts (36 tests) 415ms
 ✓ src/services/session-request.test.ts (43 tests) 22ms
 ✓ src/services/candidates.test.ts (13 tests) 17ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 148ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 141ms
 ✓ worker/auth.test.ts (23 tests) 89ms
 ✓ worker/photo-files.test.ts (10 tests) 98ms
 ✓ worker/router.test.ts (33 tests) 23ms
 ✓ src/data/fields.test.ts (9 tests) 21ms
 ✓ src/services/usage-limit.test.ts (19 tests) 16ms
 ✓ worker/http.test.ts (13 tests) 90ms
 ✓ src/services/recent-view.test.ts (11 tests) 14ms
 ✓ scripts/cage/policy.test.ts (76 tests) 161ms
 ✓ worker/test-db.test.ts (5 tests) 26ms
 ✓ src/services/upload-request.test.ts (4 tests) 12ms
 ✓ worker/test-bucket.test.ts (5 tests) 90ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 16ms
 ✓ worker/cookies.test.ts (13 tests) 14ms
 ✓ worker/session-config.test.ts (2 tests) 106ms
 ✓ worker/uploads-config.test.ts (2 tests) 122ms
 ✓ worker/photos-config.test.ts (2 tests) 103ms
 ✓ worker/routes.test.ts (3 tests) 63ms
 ✓ src/services/resize-plan.test.ts (8 tests) 10ms
 ✓ src/config.test.ts (5 tests) 11ms
 ✓ worker/body.test.ts (10 tests) 63ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 25ms
 ✓ src/lib/sha256.test.ts (3 tests) 19ms
 ✓ worker/cookies-days.test.ts (1 test) 11ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 44ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2471ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1172ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 815ms
     ✓ 用意した直後はコミット済みで差分が無い 476ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 2472ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 8378ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 2924ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 12688ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 1761ms
     ✓ 本物の実装は渡らない 1171ms
     ✓ Git 管理外のファイルは渡せない 906ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 922ms
     ✓ 人の役には QUESTIONS だけが渡る 958ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 1243ms
     ✓ PR の番号でない値は受け付けない 879ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 836ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 1041ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 1276ms
     ✓ 知らない役は受け付けない 849ms
     ✓ 空でないフォルダには作らない 843ms
 ✓ scripts/cage/server.test.ts (28 tests) 31463ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1375ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 1741ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 966ms
     ✓ 外を読む 942ms
     ✓ テストを書き換える 952ms
     ✓ 迂回して書き換える 901ms
     ✓ 大文字で迂回 938ms
     ✓ git のフック 907ms
     ✓ 形式違いのコミット 863ms
     ✓ 知らない道具 806ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 906ms
     ✓ テストの実行に檻の環境変数を渡さない 938ms
     ✓ コード以外のファイルは純粋関数の検査をしない 836ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 1080ms
     ✓ task の形が違うと拒否する 741ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 1174ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1621ms
     ✓ 起動できない検査でも原因が見える 1306ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 773ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 1210ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 1037ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 1132ms
     ✓ 前の運転の REPORT は上書きしない 1215ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1395ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1439ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1415ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1404ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1446ms

 Test Files  50 passed (50)
      Tests  1184 passed (1184)
   Start at  19:29:47
   Duration  32.07s (tests 86%, transform 8%, import 5%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 55ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.9s
  Running TypeScript ...
  Finished TypeScript in 4.4s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/7) ...
  Generating static pages using 8 workers (1/7) 
  Generating static pages using 8 workers (3/7) 
  Generating static pages using 8 workers (5/7) 
✓ Generating static pages using 8 workers (7/7) in 941ms
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
