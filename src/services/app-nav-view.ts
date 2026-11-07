/**
 * 下の帯（地図／詳細／比較／順番、#194）の行き先と、アカウント札の言葉。純粋関数。
 * 4 つは同じ畑を引き継ぐ（西田 PM 11-07「4 つ。それぞれがメインになるように」）
 */
import type { Role } from "@/types";

export interface AppNavHrefs {
  map: string;
  detail: string;
  compare: string;
  order: string;
}

/**
 * fieldId は詳細・比較に使う畑（選んでいなければ目安の畑など、呼ぶ側が決める）。
 * selectedId は今選んでいる畑（地図と順番はこれがあるときだけ #番号 を付ける）
 */
export function appNavHrefs(fieldId: string, selectedId: string | null): AppNavHrefs {
  const id = encodeURIComponent(fieldId);
  const hash = selectedId === null ? "" : `#${encodeURIComponent(selectedId)}`;
  return {
    map: `/${hash}`,
    detail: `/fields/${id}`,
    compare: `/fields/${id}#compare`,
    order: `/order${hash}`,
  };
}

export interface AccountView {
  /** 上の帯の右端の丸い札の 1 文字 */
  chip: string;
  line: string;
  isAdmin: boolean;
  /** 委員長として入る欄を出すか */
  canSignInAsChair: boolean;
}

/** role: 読めた役割。null は入っていない、undefined はまだ読んでいる */
export function accountView(role: Role | null | undefined): AccountView {
  if (role === undefined) return { chip: "…", line: "確かめています", isAdmin: false, canSignInAsChair: false };
  if (role === "admin") return { chip: "長", line: "委員長として入っています", isAdmin: true, canSignInAsChair: false };
  if (role === "member") return { chip: "委", line: "委員として入っています", isAdmin: false, canSignInAsChair: true };
  return { chip: "—", line: "入っていません", isAdmin: false, canSignInAsChair: true };
}
