import { Suspense } from "react";

import { HomeHub } from "./_components/home-hub";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-background" />}>
      <HomeHub />
    </Suspense>
  );
}
