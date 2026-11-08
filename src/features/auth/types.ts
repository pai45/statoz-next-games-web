/** The clip that plays behind the sign-in heading. */
export type AuthHeroMedia = {
  /** Path under `public/`, for example `/assets/backgrounds/auth-hero.mp4`. */
  src: string;
  /** `video` autoplays muted on a loop; `image` covers a still or a GIF. */
  kind: "video" | "image";
  /** Frame shown while a video buffers. */
  poster?: string;
  /** Optional MP4 source for browsers without WebM support. */
  mp4Src?: string;
  /** Separately composed artwork for viewports below 1024px. */
  mobile?: { src: string; mp4Src?: string; poster?: string };
  /** Describes the artwork; leave unset when it is purely decorative. */
  alt?: string;
};

export type AuthStatus = "hydrating" | "guest" | "authenticated";

export type AuthSessionSnapshot = {
  status: AuthStatus;
  isAuthenticated: boolean;
  /** Normalized local-demo account identity, unavailable while signed out. */
  email: string | null;
  /** True until this email has completed the profile setup flow. */
  needsOnboarding: boolean;
};

export type AuthGateRequest = {
  intent: string;
  message?: string;
  /** Navigation target after login; mutations should omit this and be retried. */
  returnTo?: string;
};
