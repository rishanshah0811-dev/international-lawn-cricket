import type { Match } from '@/types';
import { getTeamInningsIndices, getRemainingOversForTeam } from './overs';

export function getInningsOrder(battingFirstTeamIndex: number): Array<{
  battingTeamIndex: number;
  bowlingTeamIndex: number;
}> {
  const other = battingFirstTeamIndex === 0 ? 1 : 0;
  return [
    { battingTeamIndex: battingFirstTeamIndex, bowlingTeamIndex: other },
    { battingTeamIndex: other, bowlingTeamIndex: battingFirstTeamIndex },
    { battingTeamIndex: battingFirstTeamIndex, bowlingTeamIndex: other },
    { battingTeamIndex: other, bowlingTeamIndex: battingFirstTeamIndex },
  ];
}

export function getNextInningsIndex(match: Match): number | null {
  const next = match.currentInningsIndex + 1;
  if (next > 3) return null;

  const order = getInningsOrder(match.battingFirstTeamIndex);
  const nextBattingTeam = order[next].battingTeamIndex;
  const remaining = getRemainingOversForTeam(match, nextBattingTeam);
  if (remaining <= 0) return null;

  return next;
}

export function calculateMatchResult(match: Match): string | null {
  const allComplete = match.innings.length === 4 && match.innings.every(i => i.isComplete);
  if (!allComplete && match.innings.length < 4) {
    const nextIdx = getNextInningsIndex(match);
    if (nextIdx !== null) return null;
  }

  const [firstIdx, thirdIdx] = getTeamInningsIndices(match.battingFirstTeamIndex, match.battingFirstTeamIndex);
  const otherTeam = match.battingFirstTeamIndex === 0 ? 1 : 0;
  const [secondIdx, fourthIdx] = getTeamInningsIndices(otherTeam, match.battingFirstTeamIndex);

  const teamATotal =
    (match.innings[firstIdx]?.totalRuns ?? 0) + (match.innings[thirdIdx]?.totalRuns ?? 0);
  const teamBTotal =
    (match.innings[secondIdx]?.totalRuns ?? 0) + (match.innings[fourthIdx]?.totalRuns ?? 0);

  const teamAName = match.teams[match.battingFirstTeamIndex].name;
  const teamBName = match.teams[otherTeam].name;

  if (teamATotal > teamBTotal) {
    return `${teamAName} won by ${teamATotal - teamBTotal} runs`;
  } else if (teamBTotal > teamATotal) {
    const fourthInnings = match.innings[3];
    if (fourthInnings && fourthInnings.battingTeamIndex === otherTeam) {
      const teamSize = match.teams[otherTeam].playerIds.length;
      const wicketsRemaining = teamSize - fourthInnings.totalWickets;
      return `${teamBName} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
    }
    return `${teamBName} won by ${teamBTotal - teamATotal} runs`;
  }
  return 'Match tied';
}

export function updateOversUsedByTeam(match: Match): [number, number] {
  const team0Indices = getTeamInningsIndices(0, match.battingFirstTeamIndex);
  const team1Indices = getTeamInningsIndices(1, match.battingFirstTeamIndex);

  const team0Used = team0Indices.reduce((sum, idx) => {
    return sum + (match.innings[idx]?.oversUsed ?? 0);
  }, 0);
  const team1Used = team1Indices.reduce((sum, idx) => {
    return sum + (match.innings[idx]?.oversUsed ?? 0);
  }, 0);

  return [team0Used, team1Used];
}
