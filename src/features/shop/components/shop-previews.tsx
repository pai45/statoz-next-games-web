"use client";

import Image from "next/image";

import { PlayerCard, ProfileIcon, accentVar, glyphRegistry, type GlyphName } from "@statoz/design-system/games";
import { playerRoleLabels, playerRoleSports, type CardTier, type PlayerCard as PlayerCardData } from "@/domain/cards";
import type { Sport } from "@/domain/sports";
import { portraitForCard } from "@/features/packs";
import type { ColorProduct, ShopBanner } from "@/mocks/shop";

import { AvatarFrameRing } from "./avatar-frame-ring";
import { BannerArt } from "./banner-art";
import { ShopCardFrame } from "./shop-card";
import { KitPreview } from "./shop-tiles";

/**
 * What each kind of shop item looks like on its own: on a deal tile, and large
 * in the ACQUIRED overlay once it is bought.
 */

const roleAccents: Record<string, string> = {
  attacker: accentVar("cyan"), defender: accentVar("violet"), goalkeeper: accentVar("gold"), batsman: accentVar("cyan"), bowler: accentVar("violet"), basketballGuard: accentVar("gold"), basketballWing: accentVar("cyan"), basketballBig: accentVar("violet"), tennisSingles: accentVar("lime"), f1Driver: accentVar("racing"), f2Driver: accentVar("racing"), nascarDriver: accentVar("racing"), indycarDriver: accentVar("racing"),
};

/** A card tile takes its rarity's colour: muted, cyan, violet, gold. */
export const cardAccents: Record<CardTier, string> = {
  bronze: "var(--ds-color-border-inactive)",
  silver: accentVar("cyan"),
  gold: accentVar("violet"),
  platinum: accentVar("gold"),
};

/** What a kit calls itself, per sport, in the caption under its name. */
export const kitCaptions: Record<ColorProduct["kind"], string> = {
  kit: "FINAL OVER KIT",
  jersey: "HOOP DUEL JERSEY",
  livery: "GRAND PRIX LIVERY",
};

export function cardSport(card: PlayerCardData): Sport {
  return playerRoleSports[card.role];
}

function glyph(name: string): GlyphName {
  return name in glyphRegistry ? (name as GlyphName) : "bolt";
}

export function ShopPlayerCard({ card, selected = false }: { card: PlayerCardData; selected?: boolean }) {
  const sport = cardSport(card);
  return (
    <PlayerCard
      name={card.shortName}
      roleLabel={playerRoleLabels[card.role]}
      position={card.position}
      countryCode={card.countryCode}
      rating={card.rating}
      trait={card.trait}
      tier={card.tier}
      icon={glyph(card.icon)}
      portraitSrc={portraitForCard(card)}
      roleAccent={roleAccents[card.role]}
      markings={sport === "football" ? "none" : sport}
      size="sm"
      selected={selected}
    />
  );
}

export function AvatarPreview({ card, size = 120 }: { card: PlayerCardData; size?: number }) {
  const src = portraitForCard(card);
  return (
    <div style={{ width: size, height: size * 1.25 }}>
      <ShopCardFrame accent={accentVar("cyan")}>
        <div className="relative h-full w-full overflow-hidden">
          {src ? (
            <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover object-top" />
          ) : (
            <span className="grid h-full place-items-center text-muted"><ProfileIcon size={30} /></span>
          )}
        </div>
      </ShopCardFrame>
    </div>
  );
}

export function FramePreview({ color }: { color: string }) {
  return (
    <AvatarFrameRing color={color} glow className="block h-[66px] w-[66px]">
      <span className="grid h-full place-items-center bg-surface-raised text-muted">
        <ProfileIcon size={30} />
      </span>
    </AvatarFrameRing>
  );
}

export function BannerPreview({ banner, width = 240 }: { banner: ShopBanner; width?: number }) {
  return (
    <div style={{ width, height: width * 0.4 }}>
      <ShopCardFrame accent={banner.accent}>
        <BannerArt banner={banner} />
      </ShopCardFrame>
    </div>
  );
}

export function ColorPreview({ item }: { item: ColorProduct }) {
  return (
    <div className="grid h-[120px] w-[120px] place-items-center">
      <KitPreview primary={item.primary} secondary={item.secondary} accent={item.accent} kind={item.kind} />
    </div>
  );
}
