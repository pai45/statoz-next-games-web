import { accentVar } from "@statoz/design-system/games";
import { Suspense } from "react";

import { authHeroMedia } from "../constants";

import { AuthHero } from "./auth-hero";
import { AuthPanel } from "./auth-panel";

/**
 * The sign-in surface: artwork up top, the email-or-Google form below. On wide
 * screens the two sit side by side instead of stacking.
 */
export function AuthScreen() {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[1.05fr_minmax(26rem,0.95fr)]">
      <AuthHero
        media={authHeroMedia}
        className="aspect-[5/4] shrink-0 lg:aspect-auto lg:min-h-dvh"
      />

      <div
        className="flex flex-1 flex-col justify-center border-t bg-surface lg:border-l lg:border-t-0"
        style={{
          borderColor: `color-mix(in srgb, ${accentVar("cyan")} 22%, transparent)`,
        }}
      >
        <Suspense
          fallback={
            <div className="grid min-h-96 place-items-center font-display text-2xs font-black tracking-ultra text-muted">
              CHECKING ACCOUNT...
            </div>
          }
        >
          <AuthPanel className="mx-auto w-full max-w-md" />
        </Suspense>
      </div>
    </div>
  );
}
