import {
  ArcheryIcon,
  BasketballIcon,
  CricketIcon,
  FootballIcon,
  GolfIcon,
  MotorsportIcon,
  TennisIcon,
  type IconProps,
} from "@statoz/design-system/games";
import type { GameSport } from "@/domain/game-sports";

const glyphs = {
  archery: ArcheryIcon,
  football: FootballIcon,
  golf: GolfIcon,
  cricket: CricketIcon,
  basketball: BasketballIcon,
  tennis: TennisIcon,
  motorsport: MotorsportIcon,
} as const;

/** Resolves a sport to its glyph so callers do not switch on the union. */
export function SportIcon({ sport, ...props }: IconProps & { sport: GameSport }) {
  const Glyph = glyphs[sport];
  return <Glyph {...props} />;
}
