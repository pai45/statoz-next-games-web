import type { Metadata } from "next";
import { Suspense } from "react";

import { ShopSearchScreen } from "@/features/shop";

export const metadata: Metadata = { title: "Shop Search | StatOz" };

export default function ShopSearchPage() {
  return <Suspense fallback={<div role="status" className="p-6 text-muted">Opening the shop…</div>}><ShopSearchScreen /></Suspense>;
}
