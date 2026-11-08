"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
  Button,
  ChevronRightIcon,
  Divider,
  GoogleMark,
  InputField,
} from "@statoz/design-system/games";

import { sanitizeReturnTo } from "../return-path";
import { signInLocal, useAuthSession } from "../state/auth-session";
import { isValidEmail } from "../validation";

type EmailFormState = { error: string | null };

const idle: EmailFormState = { error: null };

export type AuthPanelProps = {
  className?: string;
};

/**
 * The form half of the sign-in surface. There is no password: an address or a
 * Google account is the whole ask, so both paths are single actions.
 *
 * Both hand off to the auth provider at the marked points below; until one is
 * wired they carry the player straight through to the app.
 */
export function AuthPanel({ className }: AuthPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useAuthSession();
  const [googlePending, startGoogleSignIn] = useTransition();
  const [emailValue, setEmailValue] = useState("");
  const [googleError, setGoogleError] = useState<string | null>(null);
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));

  useEffect(() => {
    if (session.status === "authenticated") {
      router.replace(session.needsOnboarding ? "/onboarding" : returnTo);
    }
  }, [returnTo, router, session.needsOnboarding, session.status]);

  function finishSignIn(email: string) {
    const next = signInLocal(email);
    router.replace(next.needsOnboarding ? "/onboarding" : returnTo);
  }

  const [state, submitEmail, emailPending] = useActionState(
    async (
      _previous: EmailFormState,
      formData: FormData,
    ): Promise<EmailFormState> => {
      const email = String(formData.get("email") ?? "").trim();

      if (!isValidEmail(email)) {
        return { error: "Enter a valid email address" };
      }

      // Local demo hand-off. A real provider can replace this one function.
      finishSignIn(email);
      return idle;
    },
    idle,
  );

  function signInWithGoogle() {
    const email = emailValue.trim();
    if (!isValidEmail(email)) {
      setGoogleError("Enter a valid email address before continuing with Google");
      return;
    }
    setGoogleError(null);
    startGoogleSignIn(() => {
      // This local demo uses the address above until OAuth supplies one.
      finishSignIn(email);
    });
  }

  return (
    <div
      className={["flex flex-col gap-6 px-5 pb-9 pt-7", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      <h1 className="font-display text-3xl font-black leading-tight tracking-tight">
        SAVE YOUR PROGRESS
      </h1>

      <p className="text-sm leading-relaxed text-muted">Log in or create a local demo account. New accounts keep your guest progress; logging in to an existing account restores its saved progress. Saves stay in this browser.</p>
      <Link href={returnTo} className="min-h-11 py-3 text-sm font-semibold text-cyan underline underline-offset-4">CONTINUE AS GUEST</Link>

      <form action={submitEmail} noValidate className="flex flex-col gap-5">
        <InputField
          label="Enter Your Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="champion@arena.com"
          hint="Enter a valid email address"
          error={state.error ?? googleError ?? undefined}
          onChange={(event) => {
            setEmailValue(event.target.value);
            if (googleError) setGoogleError(null);
          }}
          required
        />

        <Divider label="OR" />

        <Button
          variant="surface"
          size="lg"
          fullWidth
          onClick={signInWithGoogle}
          pending={googlePending}
          leadingIcon={<GoogleMark size={20} />}
        >
          SIGN IN WITH GOOGLE
        </Button>

        <p className="text-xs leading-relaxed text-muted">
          By continuing, you agree to our{" "}
          <Link
            href="/terms"
            className="text-subtle underline underline-offset-2"
          >
            Terms of Service
          </Link>{" "}
          &amp;{" "}
          <Link
            href="/privacy"
            className="text-subtle underline underline-offset-2"
          >
            Privacy Policy
          </Link>
        </p>

        <Button
          type="submit"
          variant="tonal"
          size="lg"
          fullWidth
          pending={emailPending}
          trailingIcon={<ChevronRightIcon size={18} />}
        >
          SIGN UP / LOG IN
        </Button>
      </form>
    </div>
  );
}
