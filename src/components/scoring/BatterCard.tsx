'use client';

import type { BatterInnings, Player } from '@/types';
import { strikeRate } from '@/lib/utils';

interface BatterCardProps {
  batter: BatterInnings | undefined;
  player: Player | undefined;
}

export function BatterCard({ batter, player }: BatterCardProps) {
  if (!player || !batter) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-3 flex-1">
        <p className="text-xs text-text-muted">No batter</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded bg-accent-green/20 text-accent-green text-xs font-bold flex items-center justify-center">
          B
        </span>
        <span className="font-medium text-text-primary text-sm truncate">{player.name}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary">
          {batter.runsScored}
        </span>
        <span className="text-xs text-text-muted">({batter.ballsFaced})</span>
      </div>
      <div className="flex gap-2 text-xs text-text-muted mt-0.5">
        <span>SR {strikeRate(batter.runsScored, batter.ballsFaced)}</span>
        {batter.fours > 0 && <span>4s: {batter.fours}</span>}
        {batter.sixes > 0 && <span>6s: {batter.sixes}</span>}
      </div>
    </div>
  );
}
