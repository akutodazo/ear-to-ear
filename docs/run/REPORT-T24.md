# T24 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only 290fe5b5eb766ea4782a6c08e7a25a8a84742deb..HEAD
```
src/services/field-summary.ts
worker/fields.ts

```

## C3 vitest run（T24 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/field-summary.test.ts (26 tests) 20ms
 ✓ worker/routes.test.ts (6 tests) 49ms
 ✓ worker/fields.test.ts (31 tests) 107ms

 Test Files  3 passed (3)
      Tests  63 passed (63)
   Start at  09:30:36
   Duration  472ms (tests 38%, transform 30%, import 27%, worker 4%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 228 ファイルを確認
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

 ✓ worker/migrations.test.ts (49 tests) 86ms
 ✓ scripts/relay/relay-lib.test.ts (84 tests) 45ms
 ✓ src/services/upload-form.test.ts (57 tests) 30ms
 ✓ src/services/session-token.test.ts (56 tests) 51ms
 ✓ scripts/safety-rules.test.ts (64 tests) 33ms
 ✓ src/services/upload-meta.test.ts (110 tests) 52ms
 ✓ src/services/photo-meta.test.ts (32 tests) 345ms
   ✓ readPhotoMeta: 細工した XMP でも遅くならない（PR #50 のレビュー #3） (1)
     ✓ 要素の開きタグだけを並べた XMP の APP1 が 20 個（約 1.3MB）でも 0.5 秒以内 311ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 41ms
 ✓ worker/status-events.test.ts (26 tests) 199ms
 ✓ worker/assignment.test.ts (19 tests) 216ms
 ✓ worker/photos-field.test.ts (24 tests) 218ms
 ✓ worker/photos.test.ts (19 tests) 247ms
 ✓ worker/fields.test.ts (31 tests) 303ms
 ✓ worker/session.test.ts (46 tests) 372ms
 ✓ worker/uploads.test.ts (36 tests) 381ms
 ✓ src/services/field-summary.test.ts (26 tests) 34ms
 ✓ worker/app.test.ts (27 tests) 108ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (38 tests) 98ms
 ✓ src/services/photo-query.test.ts (60 tests) 30ms
 ✓ src/services/assignment.test.ts (26 tests) 24ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 25ms
 ✓ worker/env.test.ts (25 tests) 123ms
 ✓ src/services/photo-labels.test.ts (37 tests) 22ms
 ✓ src/services/session-request.test.ts (43 tests) 27ms
 ✓ src/services/status-events.test.ts (35 tests) 29ms
 ✓ src/services/candidates.test.ts (13 tests) 18ms
 ✓ worker/auth.test.ts (23 tests) 88ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 127ms
 ✓ worker/photo-files.test.ts (10 tests) 88ms
 ✓ worker/router.test.ts (33 tests) 19ms
 ✓ src/data/fields.test.ts (9 tests) 25ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 195ms
 ✓ worker/http.test.ts (13 tests) 99ms
 ✓ src/services/usage-limit.test.ts (19 tests) 19ms
 ✓ scripts/cage/policy.test.ts (76 tests) 153ms
 ✓ src/services/recent-view.test.ts (11 tests) 13ms
 ✓ src/services/assignment-request.test.ts (24 tests) 17ms
 ✓ worker/test-bucket.test.ts (5 tests) 93ms
 ✓ worker/test-db.test.ts (5 tests) 22ms
 ✓ src/services/upload-request.test.ts (4 tests) 11ms
 ✓ worker/routes.test.ts (6 tests) 70ms
 ✓ worker/photos-config.test.ts (3 tests) 99ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 13ms
 ✓ worker/session-config.test.ts (2 tests) 112ms
 ✓ worker/cookies.test.ts (13 tests) 13ms
 ✓ src/services/resize-plan.test.ts (8 tests) 13ms
 ✓ src/config.test.ts (5 tests) 11ms
 ✓ src/lib/sha256.test.ts (3 tests) 17ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 28ms
 ✓ worker/body.test.ts (10 tests) 60ms
 ✓ worker/cookies-days.test.ts (1 test) 14ms
 ✓ worker/uploads-config.test.ts (2 tests) 115ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 47ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2572ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1184ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 837ms
     ✓ 用意した直後はコミット済みで差分が無い 545ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 2635ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 9375ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 3377ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 13357ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 1907ms
     ✓ 本物の実装は渡らない 1196ms
     ✓ Git 管理外のファイルは渡せない 1116ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 912ms
     ✓ 人の役には QUESTIONS だけが渡る 971ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 1349ms
     ✓ PR の番号でない値は受け付けない 916ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 859ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 1183ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 1250ms
     ✓ 知らない役は受け付けない 889ms
     ✓ 空でないフォルダには作らない 804ms
 ✓ scripts/cage/server.test.ts (28 tests) 31759ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1636ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 1878ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 1095ms
     ✓ 外を読む 1048ms
     ✓ テストを書き換える 873ms
     ✓ 迂回して書き換える 1006ms
     ✓ 大文字で迂回 921ms
     ✓ git のフック 942ms
     ✓ 形式違いのコミット 900ms
     ✓ 知らない道具 844ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 933ms
     ✓ テストの実行に檻の環境変数を渡さない 950ms
     ✓ コード以外のファイルは純粋関数の検査をしない 819ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 1108ms
     ✓ task の形が違うと拒否する 755ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 1165ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1575ms
     ✓ 起動できない検査でも原因が見える 1362ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 807ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 1120ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 999ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 989ms
     ✓ 前の運転の REPORT は上書きしない 1171ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1342ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1359ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1351ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1498ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1305ms

 Test Files  58 passed (58)
      Tests  1478 passed (1478)
   Start at  09:30:55
   Duration  32.55s (tests 82%, transform 11%, import 6%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 41ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.6s
  Running TypeScript ...
  Finished TypeScript in 4.6s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/7) ...
  Generating static pages using 8 workers (1/7) 
  Generating static pages using 8 workers (3/7) 
  Generating static pages using 8 workers (5/7) 
✓ Generating static pages using 8 workers (7/7) in 835ms
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
