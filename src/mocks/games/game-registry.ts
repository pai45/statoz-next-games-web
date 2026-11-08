import { isGameEnabled } from "@/domain/demo-product";
import type { AccentName } from "@statoz/design-system/games";

import type { GameId, GameSceneId, GameTileKind } from "@/features/games/types";

export type GameEntry = {
  kind: GameTileKind;
  /** Single-line title, and the accessible name the tile announces. */
  title: string;
  /**
   * Where the title is set over fixed lines rather than wrapped. Flutter pins
   * these so long names break at the same point every time.
   */
  titleLines?: string[];
  subtitle: string;
  /** Hero tiles only: the corner tag above the title. */
  badgeLabel?: string;
  /** Hero tiles only: the verb pinned to the bottom edge. */
  ctaLabel?: string;
  accent: AccentName;
  /** Casts the accent bloom. Only the featured game sets it. */
  glow?: boolean;
  /**
   * Whether the game fields a deck of cards. Those games hand the player their
   * sport's starter pack the first time they enter; quizzes and the guessing
   * games need no cards and so have no gate.
   */
  requiresDeck?: true;
  /** Legacy format identifier; discovery artwork is resolved by game id. */
  scene: GameSceneId;
  href: string;
};

/**
 * Copy, accent, illustration, and destination for every playable game.
 *
 * The Flutter screen builds these inline, in two places — the trending bento
 * and the per-sport deck — and the two disagree in a few spots. Here each game
 * has one identity, so the collapsed cases are called out where they happen.
 *
 * Route slugs follow the game module directories under `features/games`, so a
 * few differ from the id: the arcade names a game, the module names a sport.
 */
export const gameRegistry: Record<GameId, GameEntry> = {
  "hoop-legacy": {kind:"hero",title:"HOOP LEGACY",titleLines:["HOOP","LEGACY"],subtitle:"BUILD YOUR PLAYER. RULE THE BLACKTOP. LEAVE A LEGACY.",badgeLabel:"3D BASKETBALL // CAREER + 1V1 + 3V3 + 3PT",ctaLabel:"BUILD YOUR LEGACY",accent:"orange",scene:"hoop-duel",href:"/play/hoop-legacy"},
  "holdover": {kind:"hero",title:"HOLDOVER",titleLines:["HOLDOVER"],subtitle:"READ THE WIND. DIAL THE RANGE. TAKE THE SHOT.",badgeLabel:"3D SNIPER // CAMPAIGN + QUICK DUEL",ctaLabel:"TAKE AIM",accent:"gold",scene:"tennis-rally",href:"/play/holdover"},
  "cricketer": {kind:"hero",title:"CRICKETER",titleLines:["CRICKETER"],subtitle:"READ THE LINE. FIND THE MIDDLE. OWN THE CHASE.",badgeLabel:"ORIGINAL 3D CRICKET // 12 CHASES",ctaLabel:"START THE CHASE",accent:"game-final-over",scene:"final-over",href:"/play/cricketer"},
  "yorker": {kind:"hero",title:"YORKER",titleLines:["YORKER"],subtitle:"PICK THE DELIVERY. HIT YOUR LENGTH. TAKE THE WICKET.",badgeLabel:"ORIGINAL 3D BOWLING // 12 SPELLS + ACADEMY",ctaLabel:"TAKE THE BALL",accent:"game-final-over",scene:"final-over",href:"/play/yorker"},
  "tennis-bits": {kind:"hero",title:"TENNIS BITS",titleLines:["TENNIS","BITS"],subtitle:"MOVE. RALLY. WIN THE POINT.",badgeLabel:"LOCAL // ARCADE TENNIS",ctaLabel:"TAKE THE COURT",accent:"lime",scene:"tennis-rally",href:"/play/tennis-bits"},
  "soccer-real": {kind:"hero",title:"SOCCER REAL",titleLines:["SOCCER","REAL"],subtitle:"TAKE THE PITCH. PLAY THE LOCAL CPU.",badgeLabel:"LOCAL // 3D FOOTBALL",ctaLabel:"KICK OFF",accent:"game-pitch-duel",scene:"pitch-duel",href:"/play/soccer-real"},
  "penalty-cup": {kind:"hero",title:"PENALTY CUP",titleLines:["PENALTY","CUP"],subtitle:"ONE SHOT. ONE NATION. ONE CUP.",badgeLabel:"48 NATIONS // INTERNATIONAL CUP",ctaLabel:"CHASE THE CUP",accent:"game-penalty-shootout",scene:"penalty-shootout",href:"/play/penalty-cup"},
  "penalty-shooters-2": {kind:"hero",title:"PENALTY SHOOTERS 2",titleLines:["PENALTY","SHOOTERS 2"],subtitle:"PICK YOUR TEAM. CHASE THE CUP.",badgeLabel:"LOCAL // ORIGINAL SHOOTOUT",ctaLabel:"TAKE THE SHOT",accent:"game-penalty-shootout",scene:"penalty-shootout",href:"/play/penalty-shooters-2"},
  "f1-racing": {kind:"hero",title:"RACER",titleLines:["RACER"],subtitle:"START SMALL. CHASE THE PODIUM. RISE THROUGH THE RANKS.",badgeLabel:"12-RACE CAREER // QUICK RACE",ctaLabel:"START YOUR CAREER",accent:"game-grand-prix-dash",scene:"grand-prix-dash",href:"/play/racer"},
  "portfolio-formula": {kind:"hero",title:"FORMULA",titleLines:["FORMULA"],subtitle:"THREE CIRCUITS. FOUR CAREER TIERS. EARN YOUR PLACE ON THE GRID.",badgeLabel:"CAREER // QUICK MATCH",ctaLabel:"ENTER THE GRID",accent:"game-grand-prix-dash",scene:"grand-prix-dash",href:"/play/portfolio-formula"},
  "football-shooting": {kind:"hero",title:"FOOTBALL SHOOTING",titleLines:["FOOTBALL","SHOOTING"],subtitle:"FIND THE CORNER. BEND THE BALL. MAKE THE SAVE.",badgeLabel:"3D FOOTBALL // SHOOTOUT + PRACTICE",ctaLabel:"TAKE THE SHOT",accent:"game-penalty-shootout",scene:"penalty-shootout",href:"/play/football-shooting"},
  "archery-test": {kind:"hero",title:"ARCHERY MASTER",titleLines:["ARCHERY","MASTER"],subtitle:"DRAW. AIM. RELEASE. REACH THE TARGET.",badgeLabel:"3D ARCHERY // ORIGINAL LEVELS",ctaLabel:"TAKE AIM",accent:"gold",scene:"tennis-rally",href:"/play/archery-test"},
  "rim-rush": {kind:"hero",title:"RIM RUSH",titleLines:["RIM","RUSH"],subtitle:"PULL BACK. LET IT FLY. SWAT IT AWAY.",badgeLabel:"ORIGINAL 3D 1V1 // CUPS + LOCKER",ctaLabel:"HIT THE COURT",accent:"game-hoop-duel",scene:"hoop-duel",href:"/play/rim-rush"},
  "longbow": {kind:"hero",title:"LONGBOW",titleLines:["LONGBOW"],subtitle:"DRAW. READ THE WIND. LET IT FLY.",badgeLabel:"ORIGINAL 3D ARCHERY // 30 LANES + RIVALS",ctaLabel:"TAKE AIM",accent:"gold",scene:"tennis-rally",href:"/play/longbow"},
  "stick-cricket": {kind:"hero",title:"STICK CRICKET CHASE",titleLines:["STICK CRICKET","CHASE"],subtitle:"STICK CRICKET CHASE. TIME YOUR SHOT.",badgeLabel:"3D CRICKET // BATTING CHASES",ctaLabel:"START THE CHASE",accent:"game-final-over",scene:"final-over",href:"/play/stick-cricket"},
  "open-golf": {kind:"hero",title:"OPEN GOLF",titleLines:["OPEN","GOLF"],subtitle:"ORIGINAL COURSES. ONE PERFECT PUTT.",badgeLabel:"3D MINI GOLF",ctaLabel:"TEE OFF",accent:"lime",scene:"tennis-rally",href:"/play/open-golf"},
  "final-third": {kind:"hero",title:"FINAL THIRD",titleLines:["FINAL","THIRD"],subtitle:"SIX CHANCES. SWIPE IT, BEND IT, FINISH IT.",badgeLabel:"3D FOOTBALL // ATTACK AND DEFEND",ctaLabel:"KICK OFF",accent:"game-penalty-shootout",scene:"penalty-shootout",href:"/play/final-third"},
  "pitch-rush": {kind:"hero",title:"PITCH RUSH",titleLines:["PITCH","RUSH"],subtitle:"ELEVEN A SIDE. ONE MORE MATCH.",badgeLabel:"ARCADE FOOTBALL // 1–2 LOCAL PLAYERS",ctaLabel:"KICK OFF",accent:"game-pitch-duel",scene:"pitch-duel",href:"/play/pitch-rush"},
  "vibe-basketball": {kind:"hero",title:"VIBE BASKETBALL",titleLines:["VIBE","BASKETBALL"],subtitle:"1V1 STREETBALL. 3-POINT CONTEST.",badgeLabel:"3D BASKETBALL // TOUCH + GAMEPAD",ctaLabel:"ENTER THE PARK",accent:"game-hoop-duel",scene:"hoop-duel",href:"/play/vibe-basketball"},
  "stadium-cricket": {
    kind: "hero", title: "STADIUM CRICKET", titleLines: ["STADIUM", "CRICKET"],
    subtitle: "BAT. BOWL. KEEP. FIELD.", badgeLabel: "3D CRICKET // FOUR ROLES",
    ctaLabel: "ENTER THE STADIUM", accent: "game-final-over", scene: "final-over",
    href: "/play/stadium-cricket",
  },
  "retro-hoops": {kind:"hero",title: "STREET HOOP",titleLines: ["STREET", "HOOP"],subtitle:"CLASSIC ARCADE. FULL COURT.",badgeLabel:"NEO GEO // 3V3 BASKETBALL",ctaLabel:"PLAY STREET HOOP",accent:"game-hoop-duel",scene:"hoop-duel",href:"/play/retro-hoops"},
  "retro-circuit": {kind:"hero",title: "APEXBREAK 3",titleLines: ["APEXBREAK", "3"],subtitle:"THREE LAPS. ONE CLEAN LINE.",badgeLabel:"RETRO // ARCADE RACING",ctaLabel:"CHASE THE HORIZON",accent:"game-grand-prix-dash",scene:"grand-prix-dash",href:"/play/retro-circuit"},
  "retro-football-2": {kind:"hero",title:"RETRO FOOTBALL 2",titleLines:["RETRO","FOOTBALL 2"],subtitle:"SUPER SIDEKICKS 2. THE WORLD CHAMPIONSHIP.",badgeLabel:"NEO GEO // ARCADE FOOTBALL",ctaLabel:"KICK OFF",accent:"game-pitch-duel",scene:"pitch-duel",href:"/play/retro-football-2"},
  "retro-football": {kind:"hero",title: "PITCHFLARE XI",titleLines: ["PITCHFLARE", "XI"],subtitle:"TWO HALVES. ONE EXHIBITION.",badgeLabel:"RETRO // FOOTBALL",ctaLabel:"KICK OFF",accent:"game-pitch-duel",scene:"pitch-duel",href:"/play/retro-football"},
  /* ---- football ------------------------------------------------------- */
  "pitch-duel": {
    kind: "hero",
    title: "FOT DUEL",
    subtitle: "ELEVEN A SIDE. WIN THE DUEL.",
    badgeLabel: "CARD FOOTBALL // 11 A SIDE",
    ctaLabel: "ENTER THE DUEL",
    accent: "game-pitch-duel",
    glow: true,
    scene: "pitch-duel",
    href: "/play/pitch-duel",
    requiresDeck: true,
  },
  "penalty-shootout": {
    kind: "hero",
    title: "PENALTY SHOOTOUT",
    titleLines: ["PENALTY", "SHOOTOUT"],
    subtitle: "COMPOSURE. POWER. PRECISION.",
    badgeLabel: "3D SKILL SHOOTOUT",
    ctaLabel: "TAKE THE SHOT",
    accent: "game-penalty-shootout",
    scene: "penalty-shootout",
    href: "/play/penalty-shootout",
  },
  "football-chess": {
    kind: "hero",
    title: "5V5 FOOTBALL CHESS",
    titleLines: ["5V5 FOOTBALL", "CHESS"],
    subtitle: "FIVE A SIDE. ONE MOVE AT A TIME.",
    badgeLabel: "TURN-BASED // 5V5",
    ctaLabel: "MAKE YOUR MOVE",
    accent: "game-football-chess",
    scene: "football-chess",
    href: "/play/football-chess",
    requiresDeck: true,
  },
  "football-quiz": {
    kind: "quick",
    title: "FOOTBALL QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "game-football-quiz",
    scene: "quiz",
    href: "/play/quiz/football",
  },
  "football-bingo": {
    kind: "quick",
    title: "FOOTBALL BINGO",
    // The deck said "COUNTRY x CLUB GRID"; both axes are clubs, and the grid
    // asks which player turned out for the pair. The trending bento says
    // "BUILD A WINNING GRID".
    subtitle: "CLUB x CLUB GRID",
    accent: "game-football-bingo",
    scene: "bingo",
    href: "/play/football-bingo",
  },
  "guess-player": {
    kind: "quick",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY FOOTBALL MYSTERY",
    accent: "game-guess-player",
    scene: "guess-player",
    href: "/play/guess-player",
  },

  "retro-innings": {
    kind: "hero", title: "CREASEFIRE SIX", titleLines: ["CREASEFIRE", "SIX"],
    subtitle: "BAT AN OVER. DEFEND YOUR SCORE.", badgeLabel: "LOCAL // CRICKET",
    ctaLabel: "PLAY CREASEFIRE SIX", accent: "game-final-over", scene: "final-over",
    href: "/play/retro-innings",
  },
  /* ---- cricket -------------------------------------------------------- */
  "final-over": {
    kind: "hero",
    title: "FINAL OVER",
    subtitle: "THREE-OVER CHASE",
    badgeLabel: "FEATURED // THREE OVERS",
    ctaLabel: "START THE CHASE",
    accent: "game-final-over",
    scene: "final-over",
    href: "/play/final-over",
    requiresDeck: true,
  },
  "cricket-quiz": {
    kind: "quick",
    title: "CRICKET QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "game-cricket-quiz",
    scene: "quiz",
    href: "/play/quiz/cricket",
  },
  "cricket-guess-player": {
    kind: "quick",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY CRICKET MYSTERY",
    accent: "game-cricket-guess-player",
    scene: "guess-player",
    href: "/play/guess-player/cricket",
  },

  /* ---- basketball ----------------------------------------------------- */
  "hoop-duel": {
    kind: "hero",
    title: "HOOP DUEL",
    subtitle: "STREET 1-ON-1 ARCADE HOOPS",
    badgeLabel: "FEATURED // STREET",
    ctaLabel: "HIT THE COURT",
    accent: "game-hoop-duel",
    scene: "hoop-duel",
    href: "/play/basketball",
    requiresDeck: true,
  },
  "basketball-quiz": {
    kind: "quick",
    title: "BASKETBALL QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "game-basketball-quiz",
    scene: "quiz",
    href: "/play/quiz/basketball",
  },
  "basketball-guess-player": {
    kind: "quick",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY BASKETBALL MYSTERY",
    accent: "game-basketball-guess-player",
    scene: "guess-player",
    href: "/play/guess-player/basketball",
  },

  /* ---- tennis --------------------------------------------------------- */
  "tennis-rally": {
    kind: "hero",
    title: "TENNIS RALLY",
    subtitle: "2D ARCADE SETS // 5 MODES",
    badgeLabel: "FEATURED // NEW",
    ctaLabel: "STEP ON COURT",
    accent: "game-tennis-rally",
    scene: "tennis-rally",
    href: "/play/tennis",
    requiresDeck: true,
  },
  "tennis-quiz": {
    kind: "quick",
    title: "TENNIS QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "game-tennis-quiz",
    scene: "quiz",
    href: "/play/quiz/tennis",
  },
  "tennis-guess-winner": {
    kind: "quick",
    title: "GUESS THE WINNER",
    subtitle: "DAILY MYSTERY",
    accent: "game-tennis-guess-winner",
    scene: "guess-winner",
    href: "/play/guess-winner",
  },

  /* ---- motorsport ----------------------------------------------------- */
  // Rally Dash keeps the original "grand-prix-dash" id so saves, history and discovery links stay stable.
  "grand-prix-dash": {
    kind: "hero",
    title: "RALLY DASH",
    titleLines: ["RALLY", "DASH"],
    subtitle: "RALLYCROSS • STAGE ATTACK",
    badgeLabel: "FEATURED // RALLY",
    ctaLabel: "HIT THE STAGE",
    accent: "game-grand-prix-dash",
    scene: "grand-prix-dash",
    href: "/play/rally",
  },
  "motorsport-quiz": {
    kind: "quick",
    title: "MOTORSPORT QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "game-motorsport-quiz",
    scene: "quiz",
    href: "/play/quiz/motorsport",
  },
  "guess-driver": {
    kind: "quick",
    title: "GUESS THE DRIVER",
    subtitle: "DAILY F1 MYSTERY",
    accent: "game-guess-driver",
    scene: "guess-driver",
    href: "/play/guess-driver",
  },
};

/** The registry entry for a game, or `undefined` when it has no tile yet. */
export function gameEntryFor(id: GameId): GameEntry | undefined {
  return isGameEnabled(id) ? gameRegistry[id] : undefined;
}

/**
 * Every game addressable under `/play`, and the game each href names.
 *
 * Built from the registry rather than kept alongside it, so a game that changes
 * its href cannot end up unreachable.
 */
const gameByHref: Record<string, GameId> = Object.fromEntries(
  Object.entries(gameRegistry).filter(([id]) => isGameEnabled(id)).map(([id, entry]) => [entry.href, id as GameId]),
);

// Keep the former entry address compatible; both launch the reviewed Racer bundle.
if (isGameEnabled('f1-racing')) gameByHref['/play/f1-racing'] = 'f1-racing';
// Grand Prix Dash became Rally Dash; its old address opens the rally game.
if (isGameEnabled('grand-prix-dash')) gameByHref['/play/grand-prix'] = 'grand-prix-dash';

export function playableGameHrefs(): string[] {
  return Object.keys(gameByHref);
}

export function gameForHref(
  href: string,
): { game: GameId; entry: GameEntry } | null {
  const game = gameByHref[href];
  return game ? { game, entry: gameRegistry[game] } : null;
}
