"use client";

/** /recent の配線: Presenter（useRecent）を呼び、部品に props で配る（AGENTS.md §4） */
import { useRecent } from "@/hooks/use-recent";
import { RecentList } from "@/components/recent/recent-list";
import { PassphraseForm } from "@/components/upload/passphrase-form";

export function RecentClient() {
  const recent = useRecent();
  const isAdmin = recent.role === "admin";
  return (
    <div className="stack">
      {isAdmin && <p className="note note-ok">管理者として入っています</p>}
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
      {recent.fetchedAt && (
        <div className="row">
          <button
            type="button"
            className={recent.onlyUnconfirmed ? "button button-toggle button-toggle-on" : "button button-toggle"}
            aria-pressed={recent.onlyUnconfirmed}
            onClick={recent.toggleOnlyUnconfirmed}
          >
            未確定だけ見る
          </button>
          <span className="note">{recent.unconfirmedLabel}</span>
        </div>
      )}
      {recent.needsPassphrase && (
        <PassphraseForm
          onSubmit={recent.login}
          message={recent.loginMessage}
          lead="番号を決めるには、管理者の合言葉が要ります。"
          submitLabel="管理者として入る"
          busy={recent.loggingIn}
        />
      )}
      {recent.message && <p className="note">{recent.message}</p>}
      <RecentList
        photos={recent.photos}
        admin={isAdmin ? { fields: recent.fields, status: recent.assignStatus, onAssign: recent.assign } : null}
      />
      {recent.role !== undefined && !isAdmin && !recent.needsPassphrase && (
        <button type="button" className="button button-small" onClick={recent.openLogin}>
          管理者として入る
        </button>
      )}
    </div>
  );
}
