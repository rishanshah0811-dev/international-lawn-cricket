import type { Match, Innings } from '@/types';

export function getTeamInningsIndices(
  teamIndex: number,
  battingFirstTeamIndex: number
): [number, number] {
  if (teamIndex === battingFirstTeamIndex) return [0, 2];
  return [1, 3];
}

export function getOversUsedByTeam(match: Match, teamIndex: number): number {
  const [first, second] = getTeamInningsIndices(teamIndex, match.battingFirstTeamIndex);
  const firstInnings = match.innings[first];
  const secondInnings = match.innings[second];
  return (firstInnings?.oversUsed ?? 0) + (secondInnings?.oversUsed ?? 0);
}

export function getRemainingOversForTeam(match: Match, teamIndex: number): number {
  return match.totalOversPerTeam - getOversUsedByTeam(match, teamIndex);
}

export function getMaxOversForCurrentInnings(match: Match): number {
  const currentInnings = match.innings[match.currentInningsIndex];
  if (!currentInnings) return 0;
  const teamIndex = currentInnings.battingTeamIndex;
  const [first, second] = getTeamInningsIndices(teamIndex, match.battingFirstTeamIndex);
  const otherInningsIndex = match.currentInningsIndex === first ? second : first;
  const otherInnings = match.innings[otherInningsIndex];
  const usedInOtherInnings = otherInnings?.oversUsed ?? 0;
  return match.totalOversPerTeam - usedInOtherInnings;
}

export function calculateOversUsed(innings: Innings): number {
  if (!innings.isComplete) {
    return Math.floor(innings.legalBallsBowled / 6);
  }
  if (innings.endReason === 'all_out') {
    return Math.ceil(innings.legalBallsBowled / 6);
  }
  return Math.floor(innings.legalBallsBowled / 6);
}

export function formatOvers(legalBalls: number): string {
  const completedOvers = Math.floor(legalBalls / 6);
  const ballsInOver = legalBalls % 6;
  if (ballsInOver === 0) return `${completedOvers}.0`;
  return `${completedOvers}.${ballsInOver}`;
}

export function getCurrentOverNumber(legalBalls: number): number {
  return Math.floor(legalBalls / 6);
}

export function getBallInOver(legalBalls: number): number {
  return (legalBalls % 6) + 1;
}
