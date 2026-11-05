/**
 * 見比べるの 2 つの比べ方（11-05）。純粋関数。
 * - 同じ日に撮った別の畑と: 日をまたいで比べない（日が過ぎれば育つのは当たり前で、知りたいのは同じ日の差）。相手の既定は目安
 * - この畑の前の日と: 同じ畑の、選んだ日と前の日
 * field-share の考え方（同じ日の比較・圃場ごとの推移）を参考に、自分で書いた。選ぶのは撮影日と相手だけで、写真から何かを推測しない
 */
import type { UploadedPhoto } from "@/types";

/** ある撮影日に、写真がある畑とその日の 1 枚（送った時刻の新しいもの） */
export interface CompareDay {
  takenAt: string;
  photos: Record<string, UploadedPhoto>;
}

export interface PartnerOption {
  fieldId: string;
  /** その日に写真があり、自分でない */
  enabled: boolean;
}

export interface SameDayChoice {
  date: string | null;
  partnerId: string | null;
  options: PartnerOption[];
}

export interface SameFieldChoice {
  date: string | null;
  earlier: string | null;
  earlierOptions: string[];
}

/** 畑ごとの写真を、撮影日 → 畑 → 1 枚にまとめる。新しい日が先。日付不明と未確定は入れない */
export function indexByDay(photosByField: Record<string, UploadedPhoto[]>): CompareDay[] {
  const byDay = new Map<string, Record<string, UploadedPhoto>>();
  for (const [fieldId, photos] of Object.entries(photosByField)) {
    for (const photo of photos) {
      if (photo.state !== "confirmed" || photo.takenAt === null || photo.fieldId !== fieldId) continue;
      const day = byDay.get(photo.takenAt) ?? {};
      const prev = day[fieldId];
      if (prev === undefined || photo.uploadedAt > prev.uploadedAt || (photo.uploadedAt === prev.uploadedAt && photo.id > prev.id)) {
        day[fieldId] = photo;
      }
      byDay.set(photo.takenAt, day);
    }
  }
  return [...byDay.entries()]
    .map(([takenAt, photos]) => ({ takenAt, photos }))
    .sort((a, b) => (a.takenAt < b.takenAt ? 1 : a.takenAt > b.takenAt ? -1 : 0));
}

/** その畑に写真がある日（新しい順） */
export function daysOf(days: readonly CompareDay[], fieldId: string): string[] {
  return days.filter((d) => d.photos[fieldId] !== undefined).map((d) => d.takenAt);
}

/**
 * 同じ日に撮った別の畑と。
 * 日付: 指定があってこの畑に写真があればそれ、無ければこの畑の最新の日。写真が無ければ null。
 * 相手: 指定（その日に写真がある別の畑）→ 目安（同条件）→ 候補の順で最初に写真がある別の畑 → null
 */
export function resolveSameDay(
  days: readonly CompareDay[],
  selfId: string,
  wanted: { date?: string; partner?: string },
  preferredId: string | null,
  candidates: readonly string[],
): SameDayChoice {
  const own = daysOf(days, selfId);
  if (own.length === 0) return { date: null, partnerId: null, options: [] };
  const date = wanted.date !== undefined && own.includes(wanted.date) ? wanted.date : own[0];
  const day = days.find((d) => d.takenAt === date)!;
  const usable = (id: string | null | undefined): id is string => id !== undefined && id !== null && id !== selfId && day.photos[id] !== undefined;
  const options = candidates.filter((id) => id !== selfId).map((fieldId) => ({ fieldId, enabled: usable(fieldId) }));
  const partnerId = usable(wanted.partner) ? wanted.partner : usable(preferredId) ? preferredId : (options.find((o) => o.enabled)?.fieldId ?? null);
  return { date, partnerId, options };
}

/**
 * この畑の前の日と。下は選んだ日（既定は最新）、上はその前の日（指定があれば、選んだ日と違う日に限って使う）
 */
export function resolveSameField(days: readonly CompareDay[], selfId: string, wanted: { date?: string; earlier?: string }): SameFieldChoice {
  const own = daysOf(days, selfId);
  if (own.length === 0) return { date: null, earlier: null, earlierOptions: [] };
  const date = wanted.date !== undefined && own.includes(wanted.date) ? wanted.date : own[0];
  const earlierOptions = own.filter((d) => d !== date);
  const earlier =
    wanted.earlier !== undefined && earlierOptions.includes(wanted.earlier)
      ? wanted.earlier
      : (earlierOptions.find((d) => d < date) ?? earlierOptions[0] ?? null);
  return { date, earlier, earlierOptions };
}
