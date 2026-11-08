import {
  matchCircleThreadKey,
  type MatchCircleAuthor,
  type MatchCirclePost,
  type MatchCircleThread,
  type SportMatch,
} from "@/domain/matches";

import { matchDemoAnchor } from "./catalog";

/**
 * The conversation a fixture opens with.
 *
 * Three regulars start every thread — an opening question, one reply to it and
 * a second question — worded for the sport and for where the fixture is in its
 * life, so a thread reads as being about this match rather than about matches.
 */

const priyanshu: MatchCircleAuthor = {
  id: "seed:priyanshu",
  displayName: "Priyanshu",
  avatarId: "raphinha",
};
const jasper: MatchCircleAuthor = { id: "seed:jasper", displayName: "Jasper", avatarId: "rodri" };
const maya: MatchCircleAuthor = { id: "seed:maya", displayName: "Maya", avatarId: "camavinga" };

type SeedCopy = { primary: string; reply: string; secondary: string };

function seedCopy(match: SportMatch): SeedCopy {
  const contest = `${match.home.name} vs ${match.away.name}`;
  const upcoming = match.status === "scheduled";
  const live = match.status === "live";

  switch (match.sport) {
    case "cricket":
      if (upcoming) {
        return {
          primary: `What is a winning total for ${contest}?`,
          reply: "The powerplay matchup will be huge.",
          secondary: "Who takes the first wicket?",
        };
      }
      if (live) {
        return {
          primary: "This spell could decide the match.",
          reply: "One big over swings the pressure.",
          secondary: "How would you play the next five overs?",
        };
      }
      return {
        primary: `What was the key moment in ${contest}?`,
        reply: "The middle overs made the difference.",
        secondary: "Who gets your player of the match vote?",
      };

    case "basketball":
      if (upcoming) {
        return {
          primary: `Who sets the pace in ${contest}?`,
          reply: "The bench minutes could decide it.",
          secondary: "Drop your final score prediction.",
        };
      }
      if (live) {
        return {
          primary: "This run has changed the energy.",
          reply: "The next timeout is important.",
          secondary: "Who should take the next big shot?",
        };
      }
      return {
        primary: `What decided ${contest} tonight?`,
        reply: "The fourth-quarter execution stood out.",
        secondary: "Who was your MVP?",
      };

    case "tennis":
      if (upcoming) {
        return {
          primary: `How many sets for ${contest}?`,
          reply: "The first-serve numbers will tell the story.",
          secondary: "Which matchup is the biggest factor?",
        };
      }
      if (live) {
        return {
          primary: "Momentum is moving quickly in this set.",
          reply: "The next service game feels massive.",
          secondary: "What adjustment would you make now?",
        };
      }
      return {
        primary: "What was the turning point in this match?",
        reply: "The return game made the difference.",
        secondary: "Best rally of the match?",
      };

    case "motorsport":
      if (upcoming) {
        return {
          primary: `Who takes pole at ${match.home.name}?`,
          reply: "Race pace could look very different from qualifying.",
          secondary: "Give us your podium prediction.",
        };
      }
      if (live) {
        return {
          primary: "Race strategy is getting interesting now.",
          reply: "The next pit window could decide it.",
          secondary: "Who makes the next move through the field?",
        };
      }
      return {
        primary: `How do you rate the ${match.home.name} weekend?`,
        reply: "Strategy made all the difference.",
        secondary: "Who is your driver of the day?",
      };

    default:
      if (upcoming) {
        return {
          primary: `Score predictions for ${contest}?`,
          reply: "I think one goal decides it.",
          secondary: "Which midfield wins the first 20 minutes?",
        };
      }
      if (live) {
        return {
          primary: "This match is wide open right now.",
          reply: "The next goal changes everything.",
          secondary: "Who has impressed you most so far?",
        };
      }
      return {
        primary: `That ${contest} result will be talked about.`,
        reply: "The turning point was clear to me.",
        secondary: "Who was your player of the match?",
      };
  }
}

const hour = 3_600_000;

/** The thread a fixture starts with, before anyone here has said anything. */
export function seedMatchCircleThread(match: SportMatch): MatchCircleThread {
  const key = matchCircleThreadKey(match);
  const seededAt = Date.parse(matchDemoAnchor);
  const copy = seedCopy(match);
  const at = (hoursAgo: number) => new Date(seededAt - hoursAgo * hour).toISOString();
  const primaryId = `${key}:seed:1`;

  const posts: MatchCirclePost[] = [
    {
      id: primaryId,
      threadKey: key,
      author: priyanshu,
      text: copy.primary,
      createdAt: at(7),
      likes: 3,
      likedBy: [],
      isDeleted: false,
    },
    {
      id: `${key}:seed:2`,
      threadKey: key,
      parentId: primaryId,
      author: jasper,
      text: copy.reply,
      createdAt: at(6),
      likes: 1,
      likedBy: [],
      isDeleted: false,
    },
    {
      id: `${key}:seed:3`,
      threadKey: key,
      author: maya,
      text: copy.secondary,
      createdAt: at(4),
      likes: 2,
      likedBy: [],
      isDeleted: false,
    },
  ];

  const seeded = new Date(seededAt).toISOString();
  return {
    key,
    sport: match.sport,
    leagueId: match.leagueId,
    matchId: match.id,
    posts,
    seededAt: seeded,
    updatedAt: seeded,
  };
}
