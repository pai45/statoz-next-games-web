import {
  ActionCard,
  PlayerCard,
  glyphRegistry,
  type GlyphName,
  type PlayerCardSize,
  type RoleMarkings,
} from "@statoz/design-system/games";
import {
  playerRoleLabels,
  playerRoleSports,
  type ActionCard as ActionCardData,
  type PlayerCard as PlayerCardData,
  type PlayerRole,
} from "@/domain/cards";
import { portraitForCard } from "@/features/packs";

const roleAccents: Record<PlayerRole, string> = {
  attacker: "var(--ds-color-accent-lime)",
  defender: "var(--ds-color-accent-cyan)",
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

const sportMarkings: Record<string, RoleMarkings> = {
  football: "none",
  cricket: "cricket",
  basketball: "basketball",
  tennis: "tennis",
  motorsport: "motorsport",
};

function glyph(name: string): GlyphName {
  return name in glyphRegistry ? name as GlyphName : "bolt";
}

export function DeckPlayerCard({
  card,
  selected = false,
  disabled = false,
  onClick,
  size = "sm",
}: {
  card: PlayerCardData;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: PlayerCardSize;
}) {
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
      markings={sportMarkings[playerRoleSports[card.role]] ?? "none"}
      selected={selected}
      disabled={disabled}
      onClick={onClick}
      label={`${card.name}, ${card.rating} overall${disabled ? ", already assigned" : ""}`}
      size={size}
    />
  );
}

export function DeckActionCard({
  card,
  selected = false,
  disabled = false,
  onClick,
}: {
  card: ActionCardData;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <ActionCard
      title={card.title}
      category={card.category}
      tier={card.tier}
      effect={card.effect}
      power={card.power}
      risky={card.risky}
      icon={glyph(card.icon)}
      selected={selected}
      disabled={disabled}
      onClick={onClick}
      label={`${card.title}, ${card.category}, power ${card.power}${disabled ? ", already assigned" : ""}`}
      size="sm"
    />
  );
}
