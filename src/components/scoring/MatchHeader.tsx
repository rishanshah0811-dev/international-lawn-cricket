'use client';

import type { Match, Innings } from '@/types';
import { formatOvers, getMaxOversForCurrentInnings } from '@/lib/overs';

interface MatchHeaderProps {
  match: Match;
  innings: Innings;
}

export function MatchHeader({ match, innings }: MatchHeaderProps) {
  const battingTeam = match.teams[innings.battingTeamIndex];
  const maxOvers = getMaxOversForCurrentInnings(match);
  const currentOvers = formatOvers(innings.legalBallsBowled);

  const currentOverDeliveries = innings.deliveries.filter(d => {
    const overNum = Math.floor((innings.legalBallsBowled - 1) / 6);
    return d.overNumber === overNum || (!d.isLegal && d.overNumber === overNum);
  });

  const thisOverBalls = innings.deliveries.filter(d => {
    const currentOver = Math.floor(innings.legalBallsBowled / 6);
    const adjustedOver = innings.legalBallsBowled % 6 === 0 && innings.legalBallsBowled > 0
      ? currentOver - 1
      : currentOver;
    return d.overNumber === adjustedOver;
  });

  return (
    <div className="bg-bg-secondary border-b border-border px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              i === match.currentInningsIndex
                ? 'bg-accent-green text-bg-primary'
                : i < match.currentInningsIndex
                ? 'bg-bg-elevated text-text-secondary'
                : 'bg-bg-card text-text-muted'
            }`}
          >
            {i < match.currentInningsIndex ? '✓' : ''} INN {i + 1}
          </div>
        ))}
      </div>

      <div className="flex items-end justify-between mt-2">
        <div>
          <p className="text-xs text-accent-gold font-medium uppercase tracking-wider">
            {battingTeam.name} batting
          </p>
          <p className="font-[family-name:var(--font-display)] text-4xl font-bold text-text-primary leading-tight">
            {innings.totalRuns}/{innings.totalWickets}
          </p>
        </div>
        <div className="text-right">
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-text-primary">
            {currentOvers}
          </p>
          <p className="text-xs text-text-muted">of {maxOvers} overs</p>
        </div>
      </div>

      {thisOverBalls.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50">
          <span className="text-xs text-text-muted mr-1">This over:</span>
          {thisOverBalls.map((d, i) => (
            <span
              key={i}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                d.outcome === 'wicket' || (d.outcome === 'body' && d.wicketType)
                  ? 'bg-accent-red text-white'
                  : d.outcome === 'four' || d.outcome === 'six'
                  ? 'bg-accent-gold text-bg-primary'
                  : d.outcome === 'wide' || d.outcome === 'no_ball'
                  ? 'bg-accent-blue text-white'
                  : d.outcome === 'dot' || d.outcome === 'body'
                  ? 'bg-bg-card text-text-muted'
                  : 'bg-bg-elevated text-text-primary'
              }`}
            >
              {d.outcome === 'wicket' ? 'W'
                : d.outcome === 'wide' ? 'Wd'
                : d.outcome === 'no_ball' ? 'NB'
                : d.outcome === 'body' ? (d.wicketType ? 'W' : 'B')
                : d.runs}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
