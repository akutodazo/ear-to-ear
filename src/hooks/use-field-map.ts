/**
 * 地図 `/` の Presenter（docs/spec.md §7、L1、T24）。各圃場のまとめを読み、圃場の一覧の順にピンの状態を返す。
 * 新着と同じく「更新」で読み直す（自動では反映しない）。合言葉は要らない（認証なしの API）。
 * ピンの描き方（地図のライブラリを使うか）は見本で決めるので、ここは状態だけを返す。
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import fieldsData from "@/data/fields.json";
import type { Field, FieldSummary } from "@/types";
import { pinState, type PinState } from "@/services/status-view";
import { createFieldStatusRepository } from "@/repositories/create-field-status-repository";
import type { IFieldStatusRepository, SummaryOutcome } from "@/repositories/interfaces/i-field-status-repository";

const fields: Field[] = fieldsData;

/** 1 つのピン。まとめが読めていない圃場は pin が null（色を付けない） */
export interface FieldPin {
  field: Field;
  pin: PinState | null;
}

export function useFieldMap(repository?: IFieldStatusRepository) {
  const [repo] = useState<IFieldStatusRepository>(() => repository ?? createFieldStatusRepository());
  const [summaries, setSummaries] = useState<FieldSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const apply = useCallback((outcome: SummaryOutcome) => {
    setLoading(false);
    if (outcome.kind === "ok") {
      setSummaries(outcome.fields);
      setFetchedAt(new Date());
      setMessage(null);
      return;
    }
    setMessage(
      outcome.kind === "network-error"
        ? "つながりませんでした。電波のよい所で「更新」を押してください"
        : "読み込めませんでした。時間をおいて「更新」を押してください",
    );
  }, []);

  useEffect(() => {
    // 開いたときに1回だけ読む（静的書き出しの事前描画では動かない）。閉じた後に届いた結果は捨てる
    let active = true;
    repo.listSummary().then((outcome) => {
      if (active) apply(outcome);
    });
    return () => {
      active = false;
    };
  }, [repo, apply]);

  const refresh = useCallback(async () => {
    setLoading(true);
    apply(await repo.listSummary());
  }, [repo, apply]);

  const pins = useMemo<FieldPin[]>(() => {
    const byField = new Map(summaries.map((s) => [s.fieldId, s]));
    return fields.map((field) => {
      const summary = byField.get(field.id);
      return { field, pin: summary ? pinState(summary) : null };
    });
  }, [summaries]);

  return { pins, summaries, loading, message, fetchedAt, refresh };
}
