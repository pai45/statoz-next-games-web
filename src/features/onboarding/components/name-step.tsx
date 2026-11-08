"use client";

import { InputField } from "@statoz/design-system/games";

import { StepShell } from "./step-shell";

export type NameStepProps = {
  value: string;
  onChange: (value: string) => void;
};

/** The required first setup prompt, kept as a feature composition around the shared field. */
export function NameStep({ value, onChange }: NameStepProps) {
  return (
    <StepShell
      title="ENTER YOUR NAME"
      subtitle="This is the name other operatives will see."
    >
      <InputField
        label="ENTER YOUR NAME"
        name="displayName"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Champion’s name"
        autoComplete="nickname"
        maxLength={48}
        required
      />
    </StepShell>
  );
}
