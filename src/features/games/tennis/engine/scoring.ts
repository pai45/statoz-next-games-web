/**
 * The scorekeeper — a direct port of `TennisScoring` from `tennis_engine.dart`.
 *
 * It knows nothing about the ball, the court, or React: hand it the winner of a
 * point and it returns what that point did to the set. That independence is why
 * Flutter's version carries the same note, and why the deuce, tiebreak and
 * end-change rules can be driven straight from a test.
 */

import {
  initialScoreState,
  isDeuce,
  type TennisPointResult,
  type TennisScoreState,
} from "../types";

export class TennisScoring {
  private current: TennisScoreState;

  private constructor(state: TennisScoreState) {
    this.current = state;
  }

  static forFirstServer(firstServer: number): TennisScoring {
    return new TennisScoring({
      ...initialScoreState,
      firstServer,
      currentServer: firstServer,
      tieBreakFirstServer: firstServer,
    });
  }

  static fromState(state: TennisScoreState): TennisScoring {
    return new TennisScoring(state);
  }

  get state(): TennisScoreState {
    return this.current;
  }

  /** True when the receiver is one point from taking the server's game. */
  isBreakPointFor(player: number): boolean {
    if (this.current.tieBreak || player === this.current.currentServer) return false;
    return this.wouldWinGame(player);
  }

  /**
   * True when this point would decide the set for `player`.
   *
   * Answered by playing the point on a copy rather than by re-deriving every
   * winning shape, exactly as Flutter does — the rules already live in
   * `awardPoint`, and a second implementation of them would be a second bug.
   */
  isSetPointFor(player: number): boolean {
    if (this.current.setWinner >= 0) return false;
    return TennisScoring.fromState({ ...this.current }).awardPoint(player).setWon;
  }

  private wouldWinGame(player: number): boolean {
    const mine = player === 0 ? this.current.playerPoints : this.current.opponentPoints;
    const theirs = player === 0 ? this.current.opponentPoints : this.current.playerPoints;
    if (this.current.advantage === player) return true;
    return mine >= 3 && theirs <= 2;
  }

  awardPoint(winner: number): TennisPointResult {
    if (this.current.setWinner >= 0) {
      return {
        winner,
        gameWon: false,
        setWon: true,
        tieBreakStarted: false,
        endChange: false,
        breakPointConverted: false,
        breakPointSaved: false,
      };
    }

    const serverBefore = this.current.currentServer;
    const receiverBefore = 1 - serverBefore;
    const wasBreakPoint = this.isBreakPointFor(receiverBefore);

    let playerGames = this.current.playerGames;
    let opponentGames = this.current.opponentGames;
    let playerPoints = this.current.playerPoints;
    let opponentPoints = this.current.opponentPoints;
    let advantage = this.current.advantage;
    let playerTieBreak = this.current.playerTieBreak;
    let opponentTieBreak = this.current.opponentTieBreak;
    let tieBreak = this.current.tieBreak;
    let tieBreakFirstServer = this.current.tieBreakFirstServer;
    let currentServer = this.current.currentServer;
    let pointsInGame = this.current.pointsInGame + 1;
    let totalGames = this.current.totalGames;
    let setWinner = -1;
    let gameWon = false;
    let tieBreakStarted = false;
    let endChange = false;

    if (tieBreak) {
      if (winner === 0) playerTieBreak += 1;
      else opponentTieBreak += 1;

      const mine = winner === 0 ? playerTieBreak : opponentTieBreak;
      const theirs = winner === 0 ? opponentTieBreak : playerTieBreak;
      if (mine >= 7 && mine - theirs >= 2) {
        setWinner = winner;
        playerGames = winner === 0 ? 7 : 6;
        opponentGames = winner === 1 ? 7 : 6;
      } else {
        const nextPoint = playerTieBreak + opponentTieBreak;
        if (nextPoint > 0 && nextPoint % 6 === 0) endChange = true;
        currentServer = tieBreakServer(tieBreakFirstServer, nextPoint);
      }
    } else {
      if (playerPoints >= 3 && opponentPoints >= 3) {
        if (advantage === winner) {
          gameWon = true;
        } else if (advantage === 1 - winner) {
          advantage = -1;
        } else {
          advantage = winner;
        }
      } else {
        if (winner === 0) playerPoints += 1;
        else opponentPoints += 1;

        const mine = winner === 0 ? playerPoints : opponentPoints;
        const theirs = winner === 0 ? opponentPoints : playerPoints;
        if (mine >= 4 && mine - theirs >= 2) gameWon = true;
      }

      if (gameWon) {
        if (winner === 0) playerGames += 1;
        else opponentGames += 1;

        totalGames += 1;
        playerPoints = 0;
        opponentPoints = 0;
        advantage = -1;
        pointsInGame = 0;
        currentServer = 1 - currentServer;

        const mine = winner === 0 ? playerGames : opponentGames;
        const theirs = winner === 0 ? opponentGames : playerGames;
        if (mine >= 6 && mine - theirs >= 2) {
          setWinner = winner;
        } else if (playerGames === 6 && opponentGames === 6) {
          tieBreak = true;
          tieBreakStarted = true;
          tieBreakFirstServer = currentServer;
          currentServer = tieBreakFirstServer;
        }
        if (setWinner < 0 && totalGames % 2 === 0) endChange = true;
      }
    }

    this.current = {
      playerGames,
      opponentGames,
      playerPoints,
      opponentPoints,
      advantage,
      tieBreak,
      playerTieBreak,
      opponentTieBreak,
      firstServer: this.current.firstServer,
      currentServer,
      pointsInGame,
      totalGames,
      setWinner,
      tieBreakFirstServer,
    };

    return {
      winner,
      gameWon,
      setWon: setWinner >= 0,
      tieBreakStarted,
      endChange,
      breakPointConverted: wasBreakPoint && winner === receiverBefore && gameWon,
      breakPointSaved: wasBreakPoint && winner === serverBefore,
    };
  }
}

/**
 * Who serves the given tiebreak point: one serve to open, then two each.
 *
 * Point 0 is the opener; every pair after it flips, so the block index's parity
 * names the server.
 */
export function tieBreakServer(first: number, pointIndex: number): number {
  if (pointIndex === 0) return first;
  const block = Math.floor((pointIndex - 1) / 2);
  return block % 2 === 0 ? 1 - first : first;
}

export { isDeuce };
