/**
 * 下の帯（地図／比較／順番、#194・#216）の行き先と、アカウント札の言葉。純粋関数。
 * 3 つは同じ畑を引き継ぐ。詳細は帯から外し、地図の板・順番のカード・比較から入る（みっきぃ 11-07、#216）
 */
import type { Role } from "@/types";

export interface AppNavHrefs {
  map: string;
  compare: string;
  order: string;
}

/**
 * fieldId は比較に使う畑（選んでいなければ目安の畑など、呼ぶ側が決める）。
 * selectedId は今選んでいる畑（地図と順番はこれがあるときだけ #番号 を付ける）
 */
export function appNavHrefs(fieldId: string, selectedId: string | null): AppNavHrefs {
  const id = encodeURIComponent(fieldId);
  const hash = selectedId === null ? "" : `#${encodeURIComponent(selectedId)}`;
  return {
    map: `/${hash}`,
    compare: `/fields/${id}#compare`,
    order: `/order${hash}`,
  };
}

/** 畑の詳細の行き先（地図の板・順番のカード・比較の「詳細」、#216） */
export function fieldDetailHref(fieldId: string): string {
  return `/fields/${encodeURIComponent(fieldId)}`;
}

/** 詳細・比較の画面で、帯のどれを選んで見せるか。詳細は帯に無いので null */
export function navCurrent(view: "detail" | "compare"): "compare" | null {
  return view === "compare" ? "compare" : null;
}

export interface AccountView {
  /** 上の帯の右端の札の言葉（1 文字の記号にしない。11-07 精査 6 回目 #4） */
  chip: string;
  line: string;
  isAdmin: boolean;
  /** 合言葉を入れる・入れ直す欄（11-08 本人の依頼）。ボタンの言葉・欄の説明・送るボタンの言葉。まだ読んでいる間は null */
  signIn: { label: string; lead: string; submit: string } | null;
  /** 「出る」を出すか（入っているときだけ） */
  canSignOut: boolean;
  /** 札の見た目の段（権限が強いほど濃い、#218） */
  tier: "loading" | "guest" | "member" | "chair";
  /** 人のアイコンに添える飾り（委員長＝王冠、委員＝くわ、一般＝なし。みっきぃ 11-07） */
  ornament: "crown" | "hoe" | "none";
}

/** role: 読めた役割。null は入っていない、undefined はまだ読んでいる */
export function accountView(role: Role | null | undefined): AccountView {
  if (role === undefined) {
    return { chip: "…", line: "確かめています", isAdmin: false, signIn: null, canSignOut: false, tier: "loading", ornament: "none" };
  }
  if (role === "admin") {
    return {
      chip: "委員長",
      line: "委員長として入っています",
      isAdmin: true,
      signIn: { label: "合言葉を入れ直す", lead: "入れ直す合言葉を入れてください。委員の合言葉なら、委員として入り直します。", submit: "入り直す" },
      canSignOut: true,
      tier: "chair",
      ornament: "crown",
    };
  }
  if (role === "member") {
    return {
      chip: "委員",
      line: "委員として入っています",
      isAdmin: false,
      signIn: { label: "合言葉を入れ直す", lead: "入れ直す合言葉を入れてください。委員長の合言葉なら、委員長として入り直します。", submit: "入り直す" },
      canSignOut: true,
      tier: "member",
      ornament: "hoe",
    };
  }
  // 入っていないときは、押すと入れることを言う
  return {
    chip: "入る",
    line: "入っていません",
    isAdmin: false,
    signIn: { label: "合言葉を入れる", lead: "委員か委員長の合言葉を入れてください。", submit: "入る" },
    canSignOut: false,
    tier: "guest",
    ornament: "none",
  };
}

/** アカウントのシートで待っている操作。入り直す・出る・無し */
export type AccountPending = "sign-in" | "sign-out" | null;

/**
 * 待ちの表示（レビュー #1、docs/reviews/pr-249-250.md）。言葉を変えるのは待っている操作だけ。
 * 押せなくするのは両方（入り直しと出るを同時に走らせない）
 */
export function accountPendingView(pending: AccountPending): { disabled: boolean; signInBusy: boolean; signOutLabel: string } {
  return {
    disabled: pending !== null,
    signInBusy: pending === "sign-in",
    signOutLabel: pending === "sign-out" ? "出ています…" : "この端末から出る",
  };
}
