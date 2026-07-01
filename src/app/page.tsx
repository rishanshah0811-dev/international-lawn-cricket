'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import type { Match } from '@/types';

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    db.matches.list().then(m => {
      setMatches(m);
      setLoading(false);
    });
  }, []);

  async function handleDelete(id: string) {
    await db.matches.remove(id);
    setMatches(prev => prev.filter(m => m.id !== id));
    setConfirmDeleteId(null);
  }

  function getStatusBadge(status: Match['status']) {
    switch (status) {
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-green/20 text-accent-green">LIVE</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-text-muted/20 text-text-secondary">COMPLETE</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent-gold/20 text-accent-gold">SETUP</span>;
    }
  }

  function getMatchSummary(match: Match) {
    if (match.innings.length === 0) return 'Not started';
    return match.innings
      .filter(Boolean)
      .map((inn) => {
        const teamName = match.teams[inn.battingTeamIndex]?.name ?? `Team ${inn.battingTeamIndex + 1}`;
        return `${teamName}: ${inn.totalRuns}/${inn.totalWickets}`;
      })
      .join(' | ');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-bg-secondary border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary tracking-tight">
            International Lawn Cricket
          </h1>
          <Link
            href="/players"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Players
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-3">
        {loading ? (
          <div className="text-center text-text-muted py-20">Loading...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🏏</div>
            <p className="text-text-secondary mb-2">No matches yet</p>
            <p className="text-text-muted text-sm">Start your first game below</p>
          </div>
        ) : (
          matches.map(match => (
            <div key={match.id} className="relative">
              <Link
                href={match.status === 'completed' ? `/game/scorecard?id=${match.id}` : `/game?id=${match.id}`}
                className="block bg-bg-card border border-border rounded-xl p-4 hover:bg-bg-elevated transition-colors active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-[family-name:var(--font-display)] font-semibold text-text-primary">
                    {match.teams[0].name} vs {match.teams[1].name}
                  </h3>
                  {getStatusBadge(match.status)}
                </div>
                <p className="text-sm text-text-secondary mb-2">{getMatchSummary(match)}</p>
                {match.result && (
                  <p className="text-xs text-accent-gold font-medium">{match.result}</p>
                )}
                <p className="text-xs text-text-muted mt-1">
                  {new Date(match.updatedAt).toLocaleDateString()}
                </p>
              </Link>

              {match.status !== 'in_progress' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(match.id);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors z-10"
                  aria-label="Delete match"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z" />
                  </svg>
                </button>
              )}

              {confirmDeleteId === match.id && (
                <div className="absolute inset-0 bg-bg-card/95 border border-red-400/30 rounded-xl flex items-center justify-center gap-3 z-20">
                  <span className="text-sm text-text-secondary">Delete this match?</span>
                  <button
                    onClick={() => handleDelete(match.id)}
                    className="px-3 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-lg active:scale-95 transition-transform"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1.5 bg-bg-secondary border border-border text-text-secondary text-sm rounded-lg active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </main>

      <div className="fixed bottom-6 right-6">
        <Link
          href="/game/new"
          className="flex items-center justify-center w-14 h-14 rounded-full bg-accent-green text-bg-primary font-bold text-2xl shadow-lg shadow-accent-green/30 hover:scale-105 active:scale-95 transition-transform"
        >
          +
        </Link>
      </div>
    </div>
  );
}
