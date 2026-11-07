/**
 * アカウント札の人のアイコン（みっきぃ 5、#218）。権限の強いほど飾る: 委員長＝王冠（金）、委員＝くわ、一般＝飾りなし。
 * 線は icons.tsx と同じ 24px の枠・2px・currentColor。王冠だけ麦の金で塗る（金は目安と委員長だけに使う）。
 * 意味は隣の言葉（委員長・委員・入る）が担うので読み上げない。props だけで受け取る
 */
import type { AccountView } from "@/services/app-nav-view";

export function AccountAvatar({ ornament }: { ornament: AccountView["ornament"] }) {
  return (
    <svg
      className={`icon account-avatar account-avatar-${ornament}`}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ornament === "crown" && (
        <>
          <circle cx="12" cy="13" r="3" />
          <path d="M5.5 22a6.5 6.5 0 0113 0" />
          <path className="account-avatar-crown-shape" d="M7.8 8.6L7.2 3.6l2.9 2.3L12 2.6l1.9 3.3 2.9-2.3-.6 5z" />
        </>
      )}
      {ornament === "hoe" && (
        <>
          <circle cx="8.5" cy="9" r="3" />
          <path d="M2.5 21a6 6 0 0112 0" />
          {/* くわ: 斜めの柄と、先から下へ垂れる刃 */}
          <path d="M13.5 21.5L18.6 5.4" />
          <path className="account-avatar-blade-shape" d="M17.6 4.4l4.6 1.4-1.4 5.9-2.4-1.9z" />
        </>
      )}
      {ornament === "none" && (
        <>
          <circle cx="12" cy="9" r="3.5" />
          <path d="M5 21a7 7 0 0114 0" />
        </>
      )}
    </svg>
  );
}
