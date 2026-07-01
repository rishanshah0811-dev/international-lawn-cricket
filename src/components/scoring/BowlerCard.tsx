'use client';

import type { BowlerInnings, Player } from '@/types';
import { formatOvers } from '@/lib/overs';
import { economyRate } from '@/lib/utils';

interface BowlerCardProps {
  bowler: BowlerInnings | undefined;
  player: Player | undefined;
}

export function BowlerCard({ bowler, player }: BowlerCardProps) {
  if (!player || !bowler) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-3 flex-1">
        <p className="text-xs text-text-muted">No bowler</p>
      </div>
    );
  }

  const totalBalls = bowler.oversBowled * 6 + bowler.ballsBowled;
  const overs = formatOvers(totalBalls);

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded bg-accent-red/20 text-accent-red text-xs font-bold flex items-center justify-center">
          O
        </span>
        <span className="font-medium text-text-primary text-sm truncate">{player.name}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary">
          {bowler.wickets}/{bowler.runsConceded}
        </span>
        <span className="text-xs text-text-muted">({overs})</span>
      </div>
      <div className="flex gap-2 text-xs text-text-muted mt-0.5">
        <span>Econ {economyRate(bowler.runsConceded, totalBalls)}</span>
        {bowler.wides > 0 && <span>Wd: {bowler.wides}</span>}
        {bowler.noBalls > 0 && <span>NB: {bowler.noBalls}</span>}
      </div>
    </div>
  );
}
