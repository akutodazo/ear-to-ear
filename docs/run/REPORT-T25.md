# T25 REPORT（検査済み・人の確認待ち）

## C1 git status --porcelain --untracked-files=all
```

```

## C2 git diff --name-only d18e0fabacdc3b04d26570bab1198d2b8b2e7aac..HEAD
```
src/services/status-request.ts
worker/field-status.ts

```

## C3 vitest run（T25 のテスト）
```

 RUN  v5.0.5 <作業フォルダ>

 ✓ src/services/status-request-delegate.test.ts (3 tests) 9ms
 ✓ src/services/status-request.test.ts (47 tests) 19ms
 ✓ worker/routes.test.ts (7 tests) 43ms
 ✓ worker/field-status.test.ts (48 tests) 139ms

 Test Files  4 passed (4)
      Tests  105 passed (105)
   Start at  11:03:48
   Duration  520ms (tests 38%, import 29%, transform 28%, worker 6%)


```

## C4 npm run check
```

> ear-to-ear@0.1.0 check
> npm run check:safety && npm run lint && npm run typecheck && npm run test && npm run build


> ear-to-ear@0.1.0 check:safety
> node scripts/check-safety.mjs

check:safety: 242 ファイルを確認
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

 ✓ src/services/upload-form.test.ts (57 tests) 33ms
 ✓ worker/migrations.test.ts (49 tests) 93ms
 ✓ src/services/session-token.test.ts (56 tests) 49ms
 ✓ src/services/upload-meta.test.ts (110 tests) 42ms
 ✓ scripts/relay/relay-lib.test.ts (84 tests) 51ms
 ✓ src/services/status-reason.test.ts (52 tests) 33ms
 ✓ src/services/photo-meta.test.ts (32 tests) 294ms
 ✓ worker/assignment.test.ts (19 tests) 167ms
 ✓ scripts/safety-rules.test.ts (64 tests) 40ms
 ✓ worker/status-events.test.ts (26 tests) 249ms
 ✓ worker/photos-field.test.ts (24 tests) 242ms
 ✓ worker/fields.test.ts (31 tests) 267ms
 ✓ src/services/photo-groups.test.ts (15 tests) 26ms
 ✓ worker/session.test.ts (46 tests) 327ms
 ✓ worker/field-status.test.ts (48 tests) 319ms
 ✓ src/services/jpeg-segments.test.ts (65 tests) 35ms
 ✓ worker/uploads.test.ts (36 tests) 371ms
 ✓ src/services/field-summary.test.ts (26 tests) 30ms
 ✓ src/repositories/implementations/http-photo-repository.test.ts (38 tests) 90ms
 ✓ worker/app.test.ts (27 tests) 121ms
 ✓ worker/photos.test.ts (19 tests) 217ms
 ✓ src/services/photo-query.test.ts (60 tests) 32ms
 ✓ src/services/assignment.test.ts (26 tests) 21ms
 ✓ src/services/prepared-photo.test.ts (16 tests) 23ms
 ✓ src/services/status-request.test.ts (47 tests) 24ms
 ✓ src/services/photo-labels.test.ts (37 tests) 23ms
 ✓ worker/env.test.ts (25 tests) 93ms
 ✓ src/services/session-request.test.ts (43 tests) 22ms
 ✓ src/services/status-events.test.ts (35 tests) 27ms
 ✓ scripts/fixtures/jpeg-encoder.test.ts (20 tests) 126ms
 ✓ src/services/candidates.test.ts (13 tests) 17ms
 ✓ worker/auth.test.ts (23 tests) 87ms
 ✓ worker/photo-files.test.ts (10 tests) 107ms
 ✓ src/lib/upload-steps.test.ts (6 tests) 114ms
 ✓ src/data/fields.test.ts (9 tests) 20ms
 ✓ worker/router.test.ts (33 tests) 24ms
 ✓ worker/http.test.ts (13 tests) 75ms
 ✓ src/services/usage-limit.test.ts (19 tests) 17ms
 ✓ src/services/recent-view.test.ts (11 tests) 15ms
 ✓ scripts/cage/policy.test.ts (76 tests) 140ms
 ✓ worker/test-bucket.test.ts (5 tests) 84ms
 ✓ src/services/assignment-request.test.ts (24 tests) 19ms
 ✓ worker/routes.test.ts (7 tests) 68ms
 ✓ worker/photos-config.test.ts (3 tests) 104ms
 ✓ worker/test-db.test.ts (5 tests) 23ms
 ✓ src/services/upload-request.test.ts (4 tests) 11ms
 ✓ scripts/experiments/stop-report-lib.test.ts (10 tests) 14ms
 ✓ worker/session-config.test.ts (2 tests) 104ms
 ✓ src/services/status-request-delegate.test.ts (3 tests) 12ms
 ✓ worker/cookies.test.ts (13 tests) 12ms
 ✓ src/config.test.ts (7 tests) 16ms
 ✓ src/services/status-reason-config.test.ts (3 tests) 10ms
 ✓ src/services/resize-plan.test.ts (8 tests) 14ms
 ✓ worker/uploads-config.test.ts (2 tests) 113ms
 ✓ worker/body.test.ts (10 tests) 60ms
 ✓ src/services/usage-limit-config.test.ts (1 test) 23ms
 ✓ src/lib/sha256.test.ts (3 tests) 15ms
 ✓ worker/cookies-days.test.ts (1 test) 10ms
 ✓ scripts/roles/stub-impl.test.ts (5 tests) 42ms
 ✓ scripts/experiments/rule-ab-lib.test.ts (10 tests) 2313ms
   ✓ 条件 (3)
     ✓ 2通りの違いは決まりのファイルの有無だけ 1135ms
     ✓ 決まりの無い方は .claude も CLAUDE.md も置かない 753ms
     ✓ 用意した直後はコミット済みで差分が無い 420ms
 ✓ scripts/hooks/ask-before-edit.test.ts (22 tests) 2348ms
 ✓ scripts/fixtures/fixture-catalog.test.ts (15 tests) 8730ms
   ✓ buildFixtures（合成写真の一覧） (7)
     ✓ 重複は 01 と同じバイト列（同じハッシュになり、サーバーで 409） 3146ms
 ✓ scripts/roles/build-brief.test.ts (12 tests) 11791ms
   ✓ 攻撃役 (3)
     ✓ テスト・空の実装・型・設定だけが渡る 1734ms
     ✓ 本物の実装は渡らない 1110ms
     ✓ Git 管理外のファイルは渡せない 856ms
   ✓ 来年の委員役・人の役 (2)
     ✓ 来年の委員役にはメモだけが渡る 777ms
     ✓ 人の役には QUESTIONS だけが渡る 797ms
   ✓ レビュー役 (2)
     ✓ リポジトリの複製と、PR の番号だけの文面が渡る 1229ms
     ✓ PR の番号でない値は受け付けない 810ms
   ✓ 余計な情報 (5)
     ✓ 知らない引数で経緯を足せない 792ms
     ✓ attacker の文面に NOTES.md の経緯が入らない 1034ms
     ✓ reviewer の文面に NOTES.md の経緯が入らない 1079ms
     ✓ 知らない役は受け付けない 778ms
     ✓ 空でないフォルダには作らない 791ms
 ✓ scripts/cage/server.test.ts (28 tests) 29531ms
   ✓ 道具 (1)
     ✓ 5つだけを見せる 1425ms
   ✓ 正常系 (1)
     ✓ 読む → 書く → テスト → コミットができ、変更は許可リストだけ 1868ms
   ✓ 拒否 (8)
     ✓ 秘密を読む 902ms
     ✓ 外を読む 861ms
     ✓ テストを書き換える 787ms
     ✓ 迂回して書き換える 796ms
     ✓ 大文字で迂回 894ms
     ✓ git のフック 830ms
     ✓ 形式違いのコミット 803ms
     ✓ 知らない道具 813ms
   ✓ run_tests の抜け穴 (3)
     ✓ 実装に秘密を読むコードを書こうとすると、書く前に拒否する 738ms
     ✓ テストの実行に檻の環境変数を渡さない 825ms
     ✓ コード以外のファイルは純粋関数の検査をしない 733ms
   ✓ report (2)
     ✓ 検査を自分で実行して REPORT-Txx.md に残し、Txx REPORT でコミットする 1052ms
     ✓ task の形が違うと拒否する 684ms
   ✓ レビューの指摘: 検査が空の report (1)
     ✓ 検査が0件なら REPORT を作らない 1135ms
   ✓ レビューの指摘: 時間の上限 (2)
     ✓ 止まらないテストを打ち切って FAILED を返す 1605ms
     ✓ 起動できない検査でも原因が見える 1251ms
   ✓ レビューの指摘: REPORT と QUESTIONS (3)
     ✓ REPORT.md は write_file で書けない 742ms
     ✓ CAGE_ALLOW に REPORT.md があっても write_file で書けない 1130ms
     ✓ QUESTIONS.md は書けるが、commit_green には入らない 985ms
   ✓ report の書き先と伏せ字 (7)
     ✓ REPORT-<task>.md だけをコミットし、REPORT.md は作らない 1016ms
     ✓ 前の運転の REPORT は上書きしない 1103ms
     ✓ docs/run/REPORT-T99.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1341ms
     ✓ docs/run/REPORT-T1.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1333ms
     ✓ docs/run/REPORT.md は CAGE_ALLOW にあっても write_file で書けず、commit_green にも入らない 1332ms
     ✓ 作業フォルダ・ホームのパス・ユーザー名と色の制御文字を、REPORT にも返事にも出さない 1273ms
     ✓ 作業フォルダの下のパスは <作業フォルダ>/… の形で残す（どのファイルかは分かる） 1269ms

 Test Files  64 passed (64)
      Tests  1649 passed (1649)
   Start at  11:04:08
   Duration  30.23s (tests 82%, transform 11%, import 6%, worker 1%)


> ear-to-ear@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 43ms

  Creating an optimized production build ...
✓ Compiled successfully in 2.6s
  Running TypeScript ...
  Finished TypeScript in 4.9s ...
  Collecting page data using 8 workers ...
  Generating static pages using 8 workers (0/7) ...
  Generating static pages using 8 workers (1/7) 
  Generating static pages using 8 workers (3/7) 
  Generating static pages using 8 workers (5/7) 
✓ Generating static pages using 8 workers (7/7) in 902ms
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
