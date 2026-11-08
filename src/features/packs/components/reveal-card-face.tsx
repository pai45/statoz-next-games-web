import {
  ActionCard,
  PlayerCard,
  glyphRegistry,
  type ActionCardSize,
  type GlyphName,
  type PlayerCardSize,
  type RoleMarkings,
} from "@statoz/design-system/games";
import {
  playerRoleLabels,
  playerRoleSports,
  type PlayerRole,
} from "@/domain/cards";

import type { PackRevealItem } from "../types";
import { portraitForCard } from "../data/portraits";

/**
 * The accent a role is identified by. This mapping is football-and-friends
 * knowledge, which is why it lives in the feature rather than travelling into
 * the design system with the card component.
 *
 * Flutter distinguishes `magenta` from `violet` here, but the two resolve to
 * the same value, so they collapse onto the one accent the palette holds.
 */
const roleAccents: Record<PlayerRole, string> = {
  attacker: "var(--ds-color-accent-cyan)",
  defender: "var(--ds-color-accent-violet)",
  goalkeeper: "var(--ds-color-accent-gold)",
  batsman: "var(--ds-color-accent-cyan)",
  bowler: "var(--ds-color-accent-violet)",
  basketballGuard: "var(--ds-color-accent-gold)",
  basketballWing: "var(--ds-color-accent-cyan)",
  basketballBig: "var(--ds-color-accent-violet)",
  tennisSingles: "var(--ds-color-accent-lime)",
  f1Driver: "var(--ds-color-accent-racing)",
  f2Driver: "var(--ds-color-accent-racing)",
  nascarDriver: "var(--ds-color-accent-racing)",
  indycarDriver: "var(--ds-color-accent-racing)",
};

/** Football roles draw no markings; the other sports each have their own. */
const sportMarkings: Record<string, RoleMarkings> = {
  football: "none",
  cricket: "cricket",
  basketball: "basketball",
  tennis: "tennis",
  motorsport: "motorsport",
};

/**
 * Cards carry their glyph as a string, so the name is checked here rather than
 * trusted. A card whose glyph has been renamed still draws something.
 */
function toGlyph(name: string): GlyphName {
  return name in glyphRegistry ? (name as GlyphName) : "bolt";
}

export type RevealCardFaceProps = {
  item: PackRevealItem;
  size?: PlayerCardSize & ActionCardSize;
};

/** Renders whichever card a reveal item holds. */
export function RevealCardFace({ item, size = "md" }: RevealCardFaceProps) {
  if (item.kind === "action") {
    const card = item.card;
    return (
      <ActionCard
        title={card.title}
        category={card.category}
        tier={card.tier}
        effect={card.effect}
        power={card.power}
        risky={card.risky}
        icon={toGlyph(card.icon)}
        size={size}
      />
    );
  }

  const card = item.card;
  return (
    <PlayerCard
      name={card.shortName}
      roleLabel={playerRoleLabels[card.role]}
      position={card.position}
      countryCode={card.countryCode}
      rating={card.rating}
      trait={card.trait}
      tier={card.tier}
      icon={toGlyph(card.icon)}
      portraitSrc={portraitForCard(card)}
      roleAccent={roleAccents[card.role]}
      markings={sportMarkings[playerRoleSports[card.role]] ?? "none"}
      size={size}
    />
  );
}
