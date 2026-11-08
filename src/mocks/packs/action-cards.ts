/**
 * Action cards, ported from the Flutter pool (`lib/models/cards.dart`).
 *
 * Every base action exists in all four tiers, so the pool is generated from
 * sixteen blueprints rather than enumerated: the tier scales the base power and
 * that resolved number is substituted into the effect line.
 */
import { cardTiers, type ActionCard, type ActionCategory, type CardTier } from "@/domain/cards";

type ActionBlueprint = {
  baseId: string;
  title: string;
  category: ActionCategory;
  /** The gold-tier power; other tiers scale it. */
  basePower: number;
  risky: boolean;
  icon: string;
  /** Effect line with `{p}` standing in for the resolved power. */
  effectTemplate: string;
};

const actionBlueprints: ActionBlueprint[] = [
  { baseId: "act1", title: "Through Ball", category: "attack", basePower: 15, risky: false, icon: "trending_up", effectTemplate: "+{p} Attack Power" },
  { baseId: "act2", title: "Power Shot", category: "attack", basePower: 20, risky: false, icon: "sports_soccer", effectTemplate: "+{p} Attack, -5 Accuracy" },
  { baseId: "act3", title: "Skill Move", category: "attack", basePower: 12, risky: false, icon: "auto_awesome", effectTemplate: "+{p} Attack, Bypass Trait" },
  { baseId: "act4", title: "Cut Inside", category: "attack", basePower: 10, risky: false, icon: "turn_right", effectTemplate: "+{p} Attack, +5 Scenario" },
  { baseId: "act5", title: "Long Shot", category: "attack", basePower: 25, risky: true, icon: "my_location", effectTemplate: "+{p} Attack, High Risk" },
  { baseId: "act6", title: "Quick Break", category: "attack", basePower: 18, risky: false, icon: "flash_on", effectTemplate: "+{p} Counter Bonus" },
  { baseId: "act7", title: "Slide Tackle", category: "defense", basePower: 15, risky: false, icon: "swipe_down", effectTemplate: "+{p} Defense Power" },
  { baseId: "act8", title: "Press High", category: "defense", basePower: 12, risky: false, icon: "compress", effectTemplate: "+{p} Defense, Disrupt" },
  { baseId: "act9", title: "Block Lane", category: "defense", basePower: 10, risky: false, icon: "block", effectTemplate: "+{p} Defense, +5 Position" },
  { baseId: "act10", title: "Tight Marking", category: "defense", basePower: 14, risky: false, icon: "person_pin_circle", effectTemplate: "+{p} Defense Power" },
  { baseId: "act11", title: "Intercept", category: "defense", basePower: 18, risky: false, icon: "call_split", effectTemplate: "+{p} Defense, Read Play" },
  { baseId: "act12", title: "Last-Ditch Tackle", category: "defense", basePower: 22, risky: true, icon: "warning", effectTemplate: "+{p} Defense, Foul Risk" },
  { baseId: "act13", title: "All In", category: "special", basePower: 30, risky: true, icon: "local_fire_department", effectTemplate: "+{p} Power, Red Card Risk" },
  { baseId: "act14", title: "Tactical Foul", category: "special", basePower: 8, risky: true, icon: "flag", effectTemplate: "+{p} Disrupt, Yellow Risk" },
  { baseId: "act15", title: "Mind Game", category: "special", basePower: 10, risky: false, icon: "psychology", effectTemplate: "-{p} Opponent Power" },
  { baseId: "act16", title: "Fast Recovery", category: "special", basePower: 8, risky: false, icon: "healing", effectTemplate: "+{p} All Stats" },
];

/** How far each tier moves a blueprint's base power. */
const tierPowerFactor: Record<CardTier, number> = {
  bronze: 0.6,
  silver: 0.8,
  gold: 1,
  platinum: 1.2,
};

function tierPower(basePower: number, tier: CardTier): number {
  return Math.round(basePower * tierPowerFactor[tier]);
}

/** Sixteen blueprints across four tiers — 64 cards, ids `<baseId>-<tier>`. */
export const actionCards: ActionCard[] = actionBlueprints.flatMap((blueprint) =>
  cardTiers.map((tier) => {
    const power = tierPower(blueprint.basePower, tier);
    return {
      id: `${blueprint.baseId}-${tier}`,
      title: blueprint.title,
      category: blueprint.category,
      tier,
      power,
      risky: blueprint.risky,
      icon: blueprint.icon,
      effect: blueprint.effectTemplate.replaceAll("{p}", String(power)),
    };
  }),
);

/** The attack half of the pool. */
export const attackActionCards = actionCards.filter(
  (card) => card.category === "attack",
);

/** The defensive half of the pool. */
export const defenseActionCards = actionCards.filter(
  (card) => card.category === "defense",
);
