<!-- codex review 2026-11-04 16:39:30 args: --base origin/main -->
# Codex Review

Target: branch diff against origin/main

The merge introduces a reproducible concurrency regression that can undo the displayed revocation state. The existing tests could not run because worker-process creation failed with spawn EPERM.

Review comment:

- [P2] Preserve server-side revocations when merging local changes — C:\Users\tanaka\dev\ear-to-ear-l6\src\services\status-view.ts:127-127
  If a history request starts, a local POST succeeds, and another device revokes that event before the history query is processed, the returned history correctly contains a non-null `revokedAt`. This merge nevertheless replaces it with the saved POST response, whose `revokedAt` is null, making the canceled judgment appear active until another refresh. Request-start order does not guarantee that the server snapshot is older than local responses. Preserve an existing revocation when merging the same event ID, and add a regression test for this ordering.
