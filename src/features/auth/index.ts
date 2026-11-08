export { AuthHero, type AuthHeroProps } from "./components/auth-hero";
export { AuthPanel, type AuthPanelProps } from "./components/auth-panel";
export { AuthScreen } from "./components/auth-screen";
export { AuthBoundary, type AuthBoundaryProps } from "./components/auth-boundary";
export { AuthProvider, useRequireAuth } from "./components/auth-provider";
export { afterSignInHref, authHeroMedia } from "./constants";
export { loginHref, sanitizeReturnTo } from "./return-path";
export {
  completeOnboarding,
  normalizeEmail,
  signInLocal,
  signOut,
  useAuthSession,
} from "./state/auth-session";
export type {
  AuthGateRequest,
  AuthHeroMedia,
  AuthSessionSnapshot,
  AuthStatus,
} from "./types";
export { isValidEmail } from "./validation";
