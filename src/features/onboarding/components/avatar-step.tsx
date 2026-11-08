import Image from "next/image";

import { SelectableTile } from "@statoz/design-system/games";
import { publicAsset } from "@/shared/config";

import { avatarOptions } from "@/mocks/onboarding";

import styles from "./motion.module.css";
import { StepShell } from "./step-shell";

export type AvatarStepProps = {
  selectedId: string;
  onSelect: (id: string) => void;
};

/** Step one: the face other operatives will see. */
export function AvatarStep({ selectedId, onSelect }: AvatarStepProps) {
  return (
    <StepShell
      title="CHOOSE YOUR AVATAR"
      subtitle="This is the face other operatives will see."
    >
      <div
        role="radiogroup"
        aria-label="Avatar"
        className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6"
      >
        {avatarOptions.map((avatar, index) => (
          <div
            key={avatar.id}
            className={styles.deal}
            style={
              {
                "--deal-delay": `${220 + index * 75}ms`,
                "--deal-tilt": index % 2 === 0 ? "-4deg" : "4deg",
              } as React.CSSProperties
            }
          >
            <SelectableTile
              label={avatar.label}
              selected={avatar.id === selectedId}
              onSelect={() => onSelect(avatar.id)}
              sealSize={32}
              className="aspect-square w-full"
            >
              <Image
                src={publicAsset(avatar.src)}
                alt=""
                fill
                sizes="(min-width: 1024px) 8rem, 30vw"
                className="object-cover object-top"
              />
            </SelectableTile>
          </div>
        ))}
      </div>
    </StepShell>
  );
}
