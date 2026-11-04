<!-- codex review 2026-11-04 16:22:54 args: --base origin/main -->
# Codex Review

Target: branch diff against origin/main

A reproducible asynchronous race can overwrite or clear a successfully generated note. The targeted Vitest tests could not start because the sandbox blocked a subprocess with EPERM.

Review comment:

- [P2] Discard stale reads after successfully creating a note — C:\Users\tanaka\dev\ear-to-ear-l6\src\hooks\use-handover.ts:38-39
  If the initial GET or a refresh is pending when `create()` succeeds, its delayed response still reaches `apply()` and overwrites the newly created note. An older GET returning 404 even clears it entirely, despite the successful creation message. Invalidate pending reads when creation succeeds, or coordinate reads and creation so that pre-creation responses cannot replace the new note.
