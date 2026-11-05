/**
 * 刈る順番の保存先の約束（11-05、3 段目）。画面はこの約束だけを知る。
 * 共有の保存先（Worker・D1）は先輩の担当で、まだ無い。いまの実体は端末の中に保存するもの（implementations/local-harvest-order-repository.ts）。
 * 共有の API ができたら、同じ約束で HTTP の実体に差し替える
 */

/** 保存した順（地区・年ごとに 1 つ） */
export interface SavedOrder {
  district: string;
  season: string;
  ranked: string[];
  unranked: string[];
  state: "draft" | "confirmed";
  /** サーバー（いまは端末）の時刻 ISO 8601 */
  savedAt: string;
  /** 確定した時刻。下書きなら null */
  confirmedAt: string | null;
}

export type LoadOrderOutcome = { kind: "ok"; order: SavedOrder | null } | { kind: "error" };
export type SaveOrderOutcome = { kind: "ok"; order: SavedOrder } | { kind: "error" };

export interface IHarvestOrderRepository {
  /** その地区・年の保存した順。無ければ order は null */
  load(district: string, season: string): Promise<LoadOrderOutcome>;
  /** 下書きとして保存するか、確定する（確定は委員長だけ。守るのは将来のサーバー） */
  save(order: { district: string; season: string; ranked: string[]; unranked: string[]; state: "draft" | "confirmed" }): Promise<SaveOrderOutcome>;
}
