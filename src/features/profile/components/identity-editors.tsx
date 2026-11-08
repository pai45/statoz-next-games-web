"use client";

import Image from "next/image";
import { useState } from "react";

import { accentVar, Button, SelectableTile } from "@statoz/design-system/games";
import { useEconomy } from "@/features/economy";
import { allPlayerCards, portraitForCard } from "@/features/packs";
import { shopBanners } from "@/features/shop";
import {
  avatarOptionById,
  avatarOptions,
  BannerVisual,
  profileBannerOptions,
} from "@/features/onboarding";
import { publicAsset } from "@/shared/config";

import { ProfileOverlay } from "./profile-overlay";

/**
 * CUSTOMISE PROFILE and CHOOSE YOUR BANNER — the two editors the hero's pencils
 * open.
 *
 * Both hold their choice locally and commit on DONE, so backing out keeps what
 * was already saved. The tiles are the same control setup used, because picking
 * a face should not become a different act just because you are changing it.
 *
 * The app's avatar editor carries a second FRAME tab, equipping rings bought in
 * the shop. There is no shop and no frame catalogue on the web, so there is
 * nothing to put in a tab; the editor is the avatar grid alone until there is.
 */

const cyan = accentVar("cyan");

export type AvatarEditorProps = {
  selectedId: string;
  onCancel: () => void;
  onSave: (avatarId: string) => void;
};

export function AvatarEditor({ selectedId, onCancel, onSave }: AvatarEditorProps) {
  const [chosen, setChosen] = useState(() => avatarOptionById(selectedId).id);
  const economy = useEconomy();
  const purchased = allPlayerCards.filter((card) => economy.owned.avatarIds.includes(card.id) && portraitForCard(card));
  const options = [...avatarOptions, ...purchased.map((card) => ({ id: card.id, label: card.shortName, src: portraitForCard(card)! }))];
  const preview = options.find((avatar) => avatar.id === chosen) ?? avatarOptions[0];

  return (
    <ProfileOverlay
      title="CUSTOMISE PROFILE"
      size="full"
      onClose={onCancel}
      footer={
        <Button onClick={() => onSave(chosen)} fullWidth glow>
          DONE
        </Button>
      }
    >
      <div className="flex flex-col items-center px-5 pb-6 pt-5">
        {/* Live preview, so the choice is seen at the size it will be worn. */}
        <div
          className="relative size-27.5 overflow-hidden"
          style={{
            background: "var(--ds-color-background-elevated)",
            border: `2px solid ${cyan}`,
          }}
        >
          <Image
            src={publicAsset(preview.src)}
            alt={preview.label}
            fill
            sizes="7rem"
            className="object-cover object-top"
          />
        </div>

        <hr className="mt-5 h-px w-full border-0 bg-line-muted" />

        <div
          role="radiogroup"
          aria-label="Avatar"
          className="mt-5 grid w-full max-w-115 grid-cols-3 gap-4"
        >
          {options.map((avatar) => (
            <SelectableTile
              key={avatar.id}
              label={avatar.label}
              selected={avatar.id === chosen}
              onSelect={() => setChosen(avatar.id)}
              sealSize={26}
              className="aspect-square w-full"
            >
              <Image
                src={publicAsset(avatar.src)}
                alt=""
                fill
                sizes="(min-width: 640px) 8rem, 30vw"
                className="object-cover object-top"
              />
            </SelectableTile>
          ))}
        </div>
      </div>
    </ProfileOverlay>
  );
}

export type BannerEditorProps = {
  selectedId: string;
  onCancel: () => void;
  onSave: (bannerId: string) => void;
};

export function BannerEditor({ selectedId, onCancel, onSave }: BannerEditorProps) {
  const [chosen, setChosen] = useState(
    () =>
      profileBannerOptions.find((banner) => banner.id === selectedId)?.id ??
      profileBannerOptions[0].id,
  );
  const economy = useEconomy();
  const purchased = shopBanners.filter((banner) => economy.owned.bannerIds.includes(banner.id));

  return (
    <ProfileOverlay
      title="CHOOSE YOUR BANNER"
      size="full"
      onClose={onCancel}
      footer={
        <Button onClick={() => onSave(chosen)} fullWidth glow>
          CONTINUE
        </Button>
      }
    >
      <div
        role="radiogroup"
        aria-label="Banner"
        className="mx-auto flex w-full max-w-130 flex-col gap-4 px-5 py-5"
      >
        {profileBannerOptions.map((banner) => (
          <SelectableTile
            key={banner.id}
            label={banner.label}
            selected={banner.id === chosen}
            onSelect={() => setChosen(banner.id)}
            sealSize={28}
            className="aspect-[2.35] w-full"
          >
            <BannerVisual banner={banner} />
            <span
              className="absolute inset-x-0 bottom-0 truncate px-3 py-1.5 text-center font-display text-2xs font-black"
              style={{
                letterSpacing: "var(--ds-tracking-label)",
                background: "var(--ds-color-overlay-plate)",
                color:
                  banner.id === chosen
                    ? "var(--ds-color-accent-lime)"
                    : "var(--ds-color-text-default)",
              }}
            >
              {banner.label.toUpperCase()}
            </span>
          </SelectableTile>
        ))}
        {purchased.map((banner) => (
          <SelectableTile key={banner.id} label={banner.label} selected={banner.id === chosen} onSelect={() => setChosen(banner.id)} sealSize={28} className="aspect-[2.35] w-full">
            <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${banner.colors[0]}, ${banner.colors[1]})` }} />
            {banner.assetSrc ? <Image src={banner.assetSrc} alt="" fill sizes="30rem" className="object-cover" /> : null}
            <span className="absolute inset-x-0 bottom-0 truncate bg-overlay-plate px-3 py-1.5 text-center font-display text-2xs font-black">{banner.label}</span>
          </SelectableTile>
        ))}
      </div>
    </ProfileOverlay>
  );
}
