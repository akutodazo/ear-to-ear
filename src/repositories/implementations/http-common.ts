/**
 * fetch を使う保存先（http-*-repository）が共通に使う道具。fetch は引数で受け取る（AGENTS.md §4）。
 * つながらない・本文が読めない、をここで値に直し、保存先は「結果の種類」への読み分けだけを書く。
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** つながらない（fetch そのものが失敗した）ときは null */
export async function send(fetchFn: FetchLike, url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetchFn(url, init);
  } catch {
    return null;
  }
}

/** 本文を JSON として読む。読めなければ（JSON でない・空・途中で切れた）undefined */
export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
