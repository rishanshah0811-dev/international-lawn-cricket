'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import type { Match, Player, PlayerId, Innings } from '@/types';
import { formatOvers } from '@/lib/overs';
import { strikeRate, economyRate, wicketTypeLabel } from '@/lib/utils';
import { downloadMatchFile } from '@/lib/export';

function ScorecardPageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Record<PlayerId, Player>>({});
  const [playerList, setPlayerList] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    db.matches.get(id).then(m => {
      if (m) {
        setMatch(m);
        setActiveTab(m.currentInningsIndex);
      }
    });
    db.players.list().then(all => {
      const map: Record<string, Player> = {};
      all.forEach(p => { map[p.id] = p; });
      setPlayers(map);
      setPlayerList(all);
    });
  }, [id]);

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  const innings = match.innings[activeTab];

  function handleExport() {
    if (!match) return;
    downloadMatchFile(match, playerList);
  }

  function getHowOut(inn: Innings, playerId: PlayerId): string {
    const batter = inn.batters.find(b => b.playerId === playerId);
    if (!batter || !batter.isOut) return 'not out';
    const bowlerName = batter.bowlerWhoGotOut ? players[batter.bowlerWhoGotOut]?.name ?? '?' : '';
    if (batter.wicketType === 'body') return 'body (3 hits)';
    if (batter.wicketType === 'bowled') return `b ${bowlerName}`;
    if (batter.wicketType === 'caught_behind') return `c† b ${bowlerName}`;
    if (batter.wicketType === 'caught_out') return `c b ${bowlerName}`;
    if (batter.wicketType === 'hit_wicket') return `hit wicket b ${bowlerName}`;
    return 'out';
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-bg-secondary border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={match.status === 'in_progress' ? `/game?id=${id}` : '/'} className="text-text-secondary text-lg">
              ←
            </Link>
            <h1 className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
              Scorecard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {match.status === 'in_progress' && (
              <Link
                href={`/game?id=${id}`}
                className="text-sm text-accent-green font-medium"
              >
                Resume
              </Link>
            )}
            {match.innings.length > 0 && (
              <button
                onClick={handleExport}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Export
              </button>
            )}
          </div>
        </div>
        {match.result && (
          <p className="text-sm text-accent-gold font-medium mt-1">{match.result}</p>
        )}
      </header>

      <div className="bg-bg-secondary px-4 py-2 border-b border-border">
        <div className="flex items-center gap-1 text-xs">
          {match.innings.filter(Boolean).map((inn, i) => {
            const team = match.teams[inn.battingTeamIndex];
            return (
              <span key={i} className="text-text-secondary">
                {i > 0 && <span className="text-text-muted mx-1">|</span>}
                {team.name}: {inn.totalRuns}/{inn.totalWickets}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex border-b border-border bg-bg-secondary">
        {match.innings.filter(Boolean).map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              i === activeTab
                ? 'text-accent-green border-b-2 border-accent-green'
                : 'text-text-muted'
            }`}
          >
            Innings {i + 1}
          </button>
        ))}
      </div>

      {innings ? (
        <main className="flex-1 p-4 space-y-4">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-text-primary">
                {match.teams[innings.battingTeamIndex].name} - Batting
              </h3>
              <span className="font-[family-name:var(--font-display)] font-bold text-text-primary">
                {innings.totalRuns}/{innings.totalWickets} ({formatOvers(innings.legalBallsBowled)})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted text-xs border-b border-border/50">
                    <th className="text-left py-2 pr-2">Batter</th>
                    <th className="text-left py-2 pr-2 min-w-[80px]">How Out</th>
                    <th className="text-right py-2 px-1">R</th>
                    <th className="text-right py-2 px-1">B</th>
                    <th className="text-right py-2 px-1">4s</th>
                    <th className="text-right py-2 px-1">6s</th>
                    <th className="text-right py-2 pl-1">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {innings.battingOrder.map(pid => {
                    const batter = innings.batters.find(b => b.playerId === pid);
                    if (!batter) return null;
                    const player = players[pid];
                    return (
                      <tr key={pid} className="border-b border-border/30">
                        <td className="py-2 pr-2 text-text-primary font-medium">
                          {player?.name ?? 'Unknown'}
                        </td>
                        <td className="py-2 pr-2 text-text-muted text-xs">
                          {getHowOut(innings, pid)}
                        </td>
                        <td className="py-2 px-1 text-right font-semibold text-text-primary">
                          {batter.runsScored}
                        </td>
                        <td className="py-2 px-1 text-right text-text-secondary">
                          {batter.ballsFaced}
                        </td>
                        <td className="py-2 px-1 text-right text-text-secondary">
                          {batter.fours}
                        </td>
                        <td className="py-2 px-1 text-right text-text-secondary">
                          {batter.sixes}
                        </td>
                        <td className="py-2 pl-1 text-right text-text-muted">
                          {strikeRate(batter.runsScored, batter.ballsFaced)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-2 pt-2 border-t border-border/50 text-xs text-text-muted">
              Extras: {innings.totalExtras} (Wd {innings.wideRuns}, NB {innings.noBallRuns})
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h3 className="font-[family-name:var(--font-display)] font-semibold text-text-primary mb-3">
              {match.teams[innings.bowlingTeamIndex].name} - Bowling
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted text-xs border-b border-border/50">
                    <th className="text-left py-2 pr-2">Bowler</th>
                    <th className="text-right py-2 px-1">O</th>
                    <th className="text-right py-2 px-1">R</th>
                    <th className="text-right py-2 px-1">W</th>
                    <th className="text-right py-2 px-1">Wd</th>
                    <th className="text-right py-2 px-1">NB</th>
                    <th className="text-right py-2 pl-1">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  {innings.bowlers.map(bowler => {
                    const player = players[bowler.playerId];
                    const totalBalls = bowler.oversBowled * 6 + bowler.ballsBowled;
                    return (
                      <tr key={bowler.playerId} className="border-b border-border/30">
                        <td className="py-2 pr-2 text-text-primary font-medium">
                          {player?.name ?? 'Unknown'}
                        </td>
                        <td className="py-2 px-1 text-right text-text-secondary">
                          {formatOvers(totalBalls)}
                        </td>
                        <td className="py-2 px-1 text-right text-text-secondary">
                          {bowler.runsConceded}
                        </td>
                        <td className="py-2 px-1 text-right font-semibold text-text-primary">
                          {bowler.wickets}
                        </td>
                        <td className="py-2 px-1 text-right text-text-secondary">
                          {bowler.wides}
                        </td>
                        <td className="py-2 px-1 text-right text-text-secondary">
                          {bowler.noBalls}
                        </td>
                        <td className="py-2 pl-1 text-right text-text-muted">
                          {economyRate(bowler.runsConceded, totalBalls)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-muted">This innings hasn&apos;t started yet</p>
        </div>
      )}
    </div>
  );
}

export default function ScorecardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-text-muted">Loading...</p></div>}>
      <ScorecardPageInner />
    </Suspense>
  );
}
