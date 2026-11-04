import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import fieldsData from "@/data/fields.json";
import type { Field } from "@/types";
import { FieldClient } from "./field-client";

const fields: Field[] = fieldsData;

/** 静的書き出しなので、圃場の一覧の全部を前もって作る（AGENTS.md §4）。一覧に無い番号は 404 */
export const dynamicParams = false;

export function generateStaticParams() {
  return fields.map((field) => ({ id: field.id }));
}

function findField(id: string): Field | undefined {
  return fields.find((field) => field.id === id);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} — ear-to-ear` };
}

export default async function FieldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const field = findField(id);
  if (!field) notFound();
  return (
    <main className="page">
      <Link className="back-link" href="/">
        ← トップへ
      </Link>
      <h1>
        {field.id} <span className="note">{field.name}（{field.district}）</span>
      </h1>
      <FieldClient fieldId={field.id} />
    </main>
  );
}
