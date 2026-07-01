export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  createdAt: number;
}

export type DeliveryOutcome =
  | 'dot'
  | 'single'
  | 'double'
  | 'triple'
  | 'four'
  | 'six'
  | 'wide'
  | 'no_ball'
  | 'wicket'
  | 'body';

export type WicketType =
  | 'bowled'
  | 'caught_behind'
  | 'caught_out'
  | 'hit_wicket'
  | 'body';

export interface Delivery {
  id: string;
  inningsIndex: number;
  overNumber: number;
  ballInOver: number;
  outcome: DeliveryOutcome;
  runs: number;
  extras: number;
  isLegal: boolean;
  batterId: PlayerId;
  bowlerId: PlayerId;
  wicketType?: WicketType;
  timestamp: number;
}

export interface BatterInnings {
  playerId: PlayerId;
  runsScored: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  bodyCount: number;
  isOut: boolean;
  wicketType?: WicketType;
  bowlerWhoGotOut?: PlayerId;
}

export interface BowlerInnings {
  playerId: PlayerId;
  oversBowled: number;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
  wides: number;
  noBalls: number;
}

export type InningsEndReason = 'all_out' | 'overs_exhausted' | 'declaration' | 'target_chased';

export interface Innings {
  inningsIndex: number;
  battingTeamIndex: number;
  bowlingTeamIndex: number;
  totalRuns: number;
  totalWickets: number;
  totalExtras: number;
  wideRuns: number;
  noBallRuns: number;
  legalBallsBowled: number;
  oversUsed: number;
  batters: BatterInnings[];
  bowlers: BowlerInnings[];
  deliveries: Delivery[];
  currentBatterId: PlayerId | null;
  currentBowlerId: PlayerId | null;
  lastOverBowlerId: PlayerId | null;
  battingOrder: PlayerId[];
  isComplete: boolean;
  endReason?: InningsEndReason;
}

export interface Team {
  name: string;
  playerIds: PlayerId[];
}

export type MatchStatus = 'setup' | 'in_progress' | 'completed';

export interface Match {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: MatchStatus;
  teams: [Team, Team];
  totalOversPerTeam: number;
  innings: Innings[];
  currentInningsIndex: number;
  oversUsedByTeam: [number, number];
  battingFirstTeamIndex: number;
  result?: string;
}
