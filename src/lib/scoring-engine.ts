import { nanoid } from 'nanoid';
import type {
  Innings,
  Delivery,
  DeliveryOutcome,
  WicketType,
  BatterInnings,
  BowlerInnings,
  PlayerId,
  Match,
} from '@/types';
import { calculateOversUsed, getMaxOversForCurrentInnings, getTeamInningsIndices } from './overs';

function getRunsForOutcome(outcome: DeliveryOutcome): number {
  switch (outcome) {
    case 'dot': return 0;
    case 'single': return 1;
    case 'double': return 2;
    case 'triple': return 3;
    case 'four': return 4;
    case 'six': return 6;
    case 'body': return 0;
    case 'wicket': return 0;
    case 'wide': return 0;
    case 'no_ball': return 0;
  }
}

function ensureBatter(innings: Innings, batterId: PlayerId): BatterInnings {
  let batter = innings.batters.find(b => b.playerId === batterId);
  if (!batter) {
    batter = {
      playerId: batterId,
      runsScored: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      bodyCount: 0,
      isOut: false,
    };
    innings.batters.push(batter);
    if (!innings.battingOrder.includes(batterId)) {
      innings.battingOrder.push(batterId);
    }
  }
  return batter;
}

function ensureBowler(innings: Innings, bowlerId: PlayerId): BowlerInnings {
  let bowler = innings.bowlers.find(b => b.playerId === bowlerId);
  if (!bowler) {
    bowler = {
      playerId: bowlerId,
      oversBowled: 0,
      ballsBowled: 0,
      runsConceded: 0,
      wickets: 0,
      wides: 0,
      noBalls: 0,
    };
    innings.bowlers.push(bowler);
  }
  return bowler;
}

export function processDelivery(
  innings: Innings,
  outcome: DeliveryOutcome,
  wicketType?: WicketType
): Innings {
  const updated = structuredClone(innings);
  const batterId = updated.currentBatterId!;
  const bowlerId = updated.currentBowlerId!;
  const batter = ensureBatter(updated, batterId);
  const bowler = ensureBowler(updated, bowlerId);

  const isLegal = outcome !== 'wide' && outcome !== 'no_ball';
  const runs = getRunsForOutcome(outcome);
  const extras = (outcome === 'wide' || outcome === 'no_ball') ? 1 : 0;

  const delivery: Delivery = {
    id: nanoid(),
    inningsIndex: updated.inningsIndex,
    overNumber: Math.floor(updated.legalBallsBowled / 6),
    ballInOver: isLegal ? (updated.legalBallsBowled % 6) + 1 : 0,
    outcome,
    runs,
    extras,
    isLegal,
    batterId,
    bowlerId,
    wicketType,
    timestamp: Date.now(),
  };

  updated.deliveries.push(delivery);

  if (isLegal) {
    updated.legalBallsBowled++;
    batter.ballsFaced++;
    bowler.ballsBowled++;

    if (bowler.ballsBowled === 6) {
      bowler.oversBowled++;
      bowler.ballsBowled = 0;
    }
  }

  updated.totalRuns += runs + extras;
  batter.runsScored += runs;
  bowler.runsConceded += runs + extras;

  if (outcome === 'four') batter.fours++;
  if (outcome === 'six') batter.sixes++;

  if (outcome === 'wide') {
    updated.totalExtras += 1;
    updated.wideRuns += 1;
    bowler.wides++;
  }

  if (outcome === 'no_ball') {
    updated.totalExtras += 1;
    updated.noBallRuns += 1;
    bowler.noBalls++;
  }

  if (outcome === 'body') {
    batter.bodyCount++;
    if (batter.bodyCount >= 3) {
      batter.isOut = true;
      batter.wicketType = 'body';
      batter.bowlerWhoGotOut = bowlerId;
      updated.totalWickets++;
      bowler.wickets++;
      updated.currentBatterId = null;
    }
  }

  if (outcome === 'wicket' && wicketType) {
    batter.isOut = true;
    batter.wicketType = wicketType;
    batter.bowlerWhoGotOut = bowlerId;
    updated.totalWickets++;
    bowler.wickets++;
    updated.currentBatterId = null;
  }

  return updated;
}

export function checkEndOfOver(innings: Innings): boolean {
  return innings.legalBallsBowled > 0 && innings.legalBallsBowled % 6 === 0;
}

export function checkInningsEnd(innings: Innings, match: Match): {
  ended: boolean;
  reason?: 'all_out' | 'overs_exhausted' | 'target_chased';
} {
  const teamIndex = innings.battingTeamIndex;
  const teamSize = match.teams[teamIndex].playerIds.length;

  if (innings.totalWickets >= teamSize) {
    return { ended: true, reason: 'all_out' };
  }

  if (match.currentInningsIndex === 3) {
    const battingFirstTeam = match.battingFirstTeamIndex;
    const otherTeam = battingFirstTeam === 0 ? 1 : 0;
    const [firstIdx, thirdIdx] = getTeamInningsIndices(battingFirstTeam, battingFirstTeam);
    const [secondIdx] = getTeamInningsIndices(otherTeam, battingFirstTeam);
    const fieldingTotal =
      (match.innings[firstIdx]?.totalRuns ?? 0) + (match.innings[thirdIdx]?.totalRuns ?? 0);
    const chasingTotal =
      (match.innings[secondIdx]?.totalRuns ?? 0) + innings.totalRuns;
    if (chasingTotal > fieldingTotal) {
      return { ended: true, reason: 'target_chased' };
    }
  }

  const maxOvers = getMaxOversForCurrentInnings(match);
  const completedOvers = Math.floor(innings.legalBallsBowled / 6);
  if (completedOvers >= maxOvers && innings.legalBallsBowled % 6 === 0) {
    return { ended: true, reason: 'overs_exhausted' };
  }

  return { ended: false };
}

export function finalizeInnings(innings: Innings, reason: 'all_out' | 'overs_exhausted' | 'declaration' | 'target_chased'): Innings {
  const updated = structuredClone(innings);
  updated.isComplete = true;
  updated.endReason = reason;
  updated.oversUsed = calculateOversUsed(updated);
  return updated;
}

export function recalculateInningsFromDeliveries(
  innings: Innings,
  teamSize: number
): Innings {
  const deliveries = [...innings.deliveries];
  const fresh: Innings = {
    inningsIndex: innings.inningsIndex,
    battingTeamIndex: innings.battingTeamIndex,
    bowlingTeamIndex: innings.bowlingTeamIndex,
    totalRuns: 0,
    totalWickets: 0,
    totalExtras: 0,
    wideRuns: 0,
    noBallRuns: 0,
    legalBallsBowled: 0,
    oversUsed: 0,
    batters: [],
    bowlers: [],
    deliveries: [],
    currentBatterId: innings.currentBatterId,
    currentBowlerId: innings.currentBowlerId,
    lastOverBowlerId: innings.lastOverBowlerId,
    battingOrder: [],
    isComplete: false,
  };

  for (const d of deliveries) {
    fresh.currentBatterId = d.batterId;
    fresh.currentBowlerId = d.bowlerId;
    const result = processDelivery(fresh, d.outcome, d.wicketType);
    Object.assign(fresh, result);
    fresh.deliveries = result.deliveries;
  }

  return fresh;
}

export function createNewInnings(
  inningsIndex: number,
  battingTeamIndex: number,
  bowlingTeamIndex: number
): Innings {
  return {
    inningsIndex,
    battingTeamIndex,
    bowlingTeamIndex,
    totalRuns: 0,
    totalWickets: 0,
    totalExtras: 0,
    wideRuns: 0,
    noBallRuns: 0,
    legalBallsBowled: 0,
    oversUsed: 0,
    batters: [],
    bowlers: [],
    deliveries: [],
    currentBatterId: null,
    currentBowlerId: null,
    lastOverBowlerId: null,
    battingOrder: [],
    isComplete: false,
  };
}
