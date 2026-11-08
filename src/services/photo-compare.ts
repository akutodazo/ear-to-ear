/**
 * 見比べるの 2 つの比べ方（11-05）。純粋関数。
 * - 同じ日に撮った別の畑と: 日をまたいで比べない（日が過ぎれば育つのは当たり前で、知りたいのは同じ日の差）。相手の既定は目安
 * - この畑の前の日と: 同じ畑の、選んだ日と前の日
 * field-share の考え方（同じ日の比較・圃場ごとの推移）を参考に、自分で書いた。選ぶのは撮影日と相手だけで、写真から何かを推測しない
 */
import type { UploadedPhoto } from "@/types";

/** 比べ方。同じ日に撮った別の畑と／この畑の前の日と */
export type CompareMode = "same-day" | "same-field";

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
 * この畑の前の日と。下は選んだ日（既定は最新）、上はそれより前の日だけ（指定があればそれ、無ければ直前の日）。
 * 選んだ日がいちばん古ければ上は null（後の日を「前の日」として出さない。精査 3 回目 #3）
 */
export function resolveSameField(days: readonly CompareDay[], selfId: string, wanted: { date?: string; earlier?: string }): SameFieldChoice {
  const own = daysOf(days, selfId);
  if (own.length === 0) return { date: null, earlier: null, earlierOptions: [] };
  const date = wanted.date !== undefined && own.includes(wanted.date) ? wanted.date : own[0];
  // own は新しい順なので、そのまま「選んだ日より前の日」を新しい順に並べたものになる
  const earlierOptions = own.filter((d) => d < date);
  const earlier = wanted.earlier !== undefined && earlierOptions.includes(wanted.earlier) ? wanted.earlier : (earlierOptions[0] ?? null);
  return { date, earlier, earlierOptions };
}

/** 比較の段の 1 枚（split-viewer が上下に出す） */
export interface CompareSlot {
  photoId: string;
  fieldId: string;
  fieldName: string;
  takenAt: string | null;
  benchmark: boolean;
}

/** 番号から畑の名前を引く表（知らない番号は番号をそのまま名前にする） */
type FieldNames = Readonly<Record<string, { name: string } | undefined>>;

/**
 * 比較の段の上下の写真。下はこの畑の選んだ日、上は 同じ日の相手（same-day）か この畑の前の日（same-field）。
 * 並べられないほうは null（空の文は compare-note の compareStageNote）
 */
export function compareSlots(input: {
  days: readonly CompareDay[];
  selfId: string;
  mode: CompareMode;
  sameDay: SameDayChoice;
  sameField: SameFieldChoice;
  fieldsById: FieldNames;
  benchmarkId: string | null;
}): { date: string | null; top: CompareSlot | null; bottom: CompareSlot | null } {
  const { days, selfId, sameDay, sameField, fieldsById, benchmarkId } = input;
  const slot = (fieldId: string, takenAt: string | null): CompareSlot | null => {
    const photo = takenAt === null ? undefined : days.find((d) => d.takenAt === takenAt)?.photos[fieldId];
    if (!photo) return null;
    return { photoId: photo.id, fieldId, fieldName: fieldsById[fieldId]?.name ?? fieldId, takenAt: photo.takenAt, benchmark: fieldId === benchmarkId };
  };
  if (input.mode === "same-day") {
    return {
      date: sameDay.date,
      bottom: slot(selfId, sameDay.date),
      top: sameDay.partnerId === null ? null : slot(sameDay.partnerId, sameDay.date),
    };
  }
  return { date: sameField.date, bottom: slot(selfId, sameField.date), top: slot(selfId, sameField.earlier) };
}

/** 相手の一覧の 1 行（split-viewer の上の帯を押すと出る） */
export interface PartnerChoice {
  fieldId: string;
  /** 「番号 名前」 */
  label: string;
  benchmark: boolean;
}

/** 同じ日の相手の選択肢。その日に写真がある畑だけを「番号 名前」で */
export function partnerOptions(sameDay: SameDayChoice, fieldsById: FieldNames, benchmarkId: string | null): PartnerChoice[] {
  return sameDay.options
    .filter((o) => o.enabled)
    .map((o) => ({ fieldId: o.fieldId, label: `${o.fieldId} ${fieldsById[o.fieldId]?.name ?? ""}`.trim(), benchmark: o.fieldId === benchmarkId }));
}
