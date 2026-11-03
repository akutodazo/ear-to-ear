"use client";

/** /recent の配線: Presenter（useRecent）を呼び、部品に props で配る（AGENTS.md §4） */
import { useRecent } from "@/hooks/use-recent";
import { RecentList } from "@/components/recent/recent-list";

export function RecentClient() {
  const recent = useRecent();
  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="button button-primary" onClick={recent.refresh} disabled={recent.loading}>
          {recent.loading ? "読み込み中…" : "更新"}
        </button>
        {recent.fetchedAt && (
          <span className="note">
            {recent.fetchedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 時点
          </span>
        )}
      </div>
      {recent.message && <p className="note">{recent.message}</p>}
      <RecentList photos={recent.photos} />
    </div>
  );
}
