"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { loginHref, sanitizeReturnTo } from "../return-path";
import { prepareGuestData, useAuthSession } from "../state/auth-session";
import type { AuthGateRequest } from "../types";

import { AuthGateDialog } from "./auth-gate-dialog";

type AuthGateContextValue = {
  requireAuth: (request: AuthGateRequest) => boolean;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthSession();
  useLayoutEffect(() => {
    if (session.status === "guest") prepareGuestData();
  }, [session.status]);
  const [request, setRequest] = useState<AuthGateRequest | null>(null);

  const requireAuth = useCallback(
    (next: AuthGateRequest): boolean => {
      if (session.status === "authenticated") return true;
      if (session.status === "hydrating") return false;
      setRequest((current) => current ?? next);
      return false;
    },
    [session.status],
  );

  const value = useMemo(() => ({ requireAuth }), [requireAuth]);

  const close = useCallback(() => setRequest(null), []);
  const continueToLogin = useCallback(() => {
    if (!request) return;
    const current = `${pathname}${window.location.search}${window.location.hash}`;
    const returnTo = sanitizeReturnTo(request.returnTo ?? current);
    setRequest(null);
    router.push(loginHref(returnTo));
  }, [pathname, request, router]);

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      {request ? (
        <AuthGateDialog
          request={request}
          onCancel={close}
          onContinue={continueToLogin}
        />
      ) : null}
    </AuthGateContext.Provider>
  );
}

export function useRequireAuth() {
  const context = useContext(AuthGateContext);
  if (!context) throw new Error("useRequireAuth must be used inside AuthProvider");
  return context.requireAuth;
}

