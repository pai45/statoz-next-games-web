/** Only app-internal paths may be resumed after the local demo login. */
export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const url = new URL(value, "https://statoz.local");
    if (url.origin !== "https://statoz.local") return "/";
    if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function loginHref(returnTo: string | null | undefined): string {
  return `/login?returnTo=${encodeURIComponent(sanitizeReturnTo(returnTo))}`;
}

