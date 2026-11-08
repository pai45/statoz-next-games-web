import type { ReactNode } from "react";

export type StepShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** A setup step's heading and body, on the flow's shared measure. */
export function StepShell({ title, subtitle, children }: StepShellProps) {
  return (
    <div className="w-full px-6 pb-2 pt-3">
      <h2 className="font-display text-2xl font-black leading-tight tracking-ultra">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1.5 text-sm leading-body text-muted">{subtitle}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}
