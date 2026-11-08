import { Suspense } from "react";

import { ShopScreen } from "@/features/shop";

export default function ShopPage() {
  return <Suspense fallback={<div role="status" className="grid min-h-96 place-items-center font-display text-sm font-black text-muted">Opening the shop…</div>}><ShopScreen /></Suspense>;
}
