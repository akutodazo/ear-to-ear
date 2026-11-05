import type { Metadata } from "next";
import { OrderClient } from "./order-client";

export const metadata: Metadata = {
  title: "刈る順番 — ear-to-ear",
};

/** `/order` は刈る順番（11-05、3 段目）。配線だけ（AGENTS.md §4） */
export default function OrderPage() {
  return (
    <main className="home-main">
      <OrderClient />
    </main>
  );
}
