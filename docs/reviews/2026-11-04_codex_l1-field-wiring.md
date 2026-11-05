<!-- codex review 2026-11-04 17:51:59 args: --base origin/main -->
# Codex Review

Target: branch diff against origin/main

The reference-photo selection has no visible selected state, and historical judgments do not expose their photographic evidence. Both issues affect the newly introduced judgment workflow.

Full review comments:

- [P2] Make the selected-thumbnail rule override the base rule — C:\Users\tanaka\dev\ear-to-ear-l6\src\app\globals.css:381-383
  When a reference photo is selected, `button.thumb` has higher specificity than `.thumb-selected`, so its transparent 2px border overrides the selected blue 4px border. Selected and unselected photos therefore look identical, making it impossible to visually verify which photos will accompany the judgment. Use a selected-state selector with sufficient specificity.

- [P2] Link historical judgments to their reference photos — C:\Users\tanaka\dev\ear-to-ear-l6\src\components\field\status-history.tsx:80-80
  When a judgment contains reference photos, the history displays only their count, with no way to identify or open the referenced images. With multiple photos on the field, readers cannot reconstruct the judgment's evidence; reassigned photos may not even appear in the gallery. Render links or thumbnails using `event.refPhotoIds` so the history supports the evidence-tracing goal in [AGENTS.md:13](AGENTS.md#L13).
