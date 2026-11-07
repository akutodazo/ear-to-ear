/** 同じ地区の畑を横に並べて切り替える（地図に戻らずに次の畑へ。11-05）。目安の畑には金の印。props だけで受け取る */
import Link from "next/link";
import type { Field } from "@/types";

interface Props {
  fields: Field[];
  currentId: string;
  benchmarkId: string | null;
  /** 比較のまま次の畑へ（#195）。付けると /fields/A-02#compare */
  hash?: string;
}

export function FieldSwitcher({ fields, currentId, benchmarkId, hash }: Props) {
  return (
    <nav className="switcher" aria-label="同じ地区の畑">
      {fields.map((f) => {
        const current = f.id === currentId;
        return (
          <Link key={f.id} href={`/fields/${f.id}${hash ? `#${hash}` : ""}`} className={current ? "switcher-item switcher-current" : "switcher-item"} aria-current={current ? "page" : undefined}>
            {f.id === benchmarkId && <i className="mark mark-benchmark" aria-hidden="true" />}
            {f.id}
          </Link>
        );
      })}
    </nav>
  );
}
