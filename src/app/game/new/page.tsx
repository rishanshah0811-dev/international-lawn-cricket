'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { useScoringStore } from '@/lib/store';
import type { Player, PlayerId } from '@/types';

export default function NewGamePage() {
  const router = useRouter();
  const createMatch = useScoringStore(s => s.createMatch);

  const [step, setStep] = useState(1);
  const [totalOvers, setTotalOvers] = useState(36);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<PlayerId[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<PlayerId[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingForTeam, setAddingForTeam] = useState<'A' | 'B' | null>(null);
  const [battingFirst, setBattingFirst] = useState(0);

  useEffect(() => {
    db.players.list().then(setPlayers);
  }, []);

  async function addNewPlayer(team: 'A' | 'B') {
    const name = newPlayerName.trim();
    if (!name) return;
    const existing = players.find(p => p.name.toLowerCase() === name.toLowerCase());
    let playerId: string;
    if (existing) {
      playerId = existing.id;
    } else {
      playerId = nanoid();
      await db.players.add({ id: playerId, name, createdAt: Date.now() });
      const updated = await db.players.list();
      setPlayers(updated);
    }
    if (team === 'A' && !teamAPlayers.includes(playerId)) {
      setTeamAPlayers(prev => [...prev, playerId]);
    } else if (team === 'B' && !teamBPlayers.includes(playerId)) {
      setTeamBPlayers(prev => [...prev, playerId]);
    }
    setNewPlayerName('');
    setAddingForTeam(null);
  }

  function togglePlayer(playerId: PlayerId, team: 'A' | 'B') {
    if (team === 'A') {
      if (teamAPlayers.includes(playerId)) {
        setTeamAPlayers(prev => prev.filter(id => id !== playerId));
      } else if (!teamBPlayers.includes(playerId)) {
        setTeamAPlayers(prev => [...prev, playerId]);
      }
    } else {
      if (teamBPlayers.includes(playerId)) {
        setTeamBPlayers(prev => prev.filter(id => id !== playerId));
      } else if (!teamAPlayers.includes(playerId)) {
        setTeamBPlayers(prev => [...prev, playerId]);
      }
    }
  }

  async function handleStartMatch() {
    const id = await createMatch({
      teamAName: 'Team A',
      teamBName: 'Team B',
      teamAPlayers,
      teamBPlayers,
      totalOversPerTeam: totalOvers,
      battingFirstTeamIndex: battingFirst,
    });
    router.push(`/game?id=${id}`);
  }

  const canProceedStep1 = totalOvers > 0 && teamAPlayers.length >= 2 && teamBPlayers.length >= 2;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-bg-secondary border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-text-secondary hover:text-text-primary text-lg">
            ←
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
            New Match
          </h1>
        </div>
        <div className="flex gap-2 mt-3">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-accent-green' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 p-4">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Total Overs Per Team</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTotalOvers(Math.max(1, totalOvers - 1))}
                  className="w-12 h-12 bg-bg-card border border-border rounded-lg text-text-primary text-xl font-bold active:scale-95"
                >
                  −
                </button>
                <input
                  type="number"
                  value={totalOvers}
                  onChange={e => setTotalOvers(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 bg-bg-card border border-border rounded-lg px-3 py-3 text-center text-text-primary text-xl font-bold focus:outline-none focus:border-accent-green"
                />
                <button
                  onClick={() => setTotalOvers(totalOvers + 1)}
                  className="w-12 h-12 bg-bg-card border border-border rounded-lg text-text-primary text-xl font-bold active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {(['A', 'B'] as const).map(team => {
              const selected = team === 'A' ? teamAPlayers : teamBPlayers;
              const teamName = `Team ${team}`;
              return (
                <div key={team} className="bg-bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-[family-name:var(--font-display)] font-semibold text-text-primary">
                      {teamName}
                      <span className="text-text-muted font-normal text-sm ml-2">
                        ({selected.length})
                      </span>
                    </h3>
                    <button
                      onClick={() => setAddingForTeam(addingForTeam === team ? null : team)}
                      className="text-sm text-accent-green"
                    >
                      + New
                    </button>
                  </div>

                  {addingForTeam === team && (
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={e => setNewPlayerName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addNewPlayer(team)}
                        placeholder="Player name..."
                        autoFocus
                        className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green"
                      />
                      <button
                        onClick={() => addNewPlayer(team)}
                        className="px-3 py-2 bg-accent-green text-bg-primary text-sm font-semibold rounded-lg"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {players.map(player => {
                      const isSelected = selected.includes(player.id);
                      const otherTeam = team === 'A' ? teamBPlayers : teamAPlayers;
                      const isInOtherTeam = otherTeam.includes(player.id);
                      return (
                        <button
                          key={player.id}
                          onClick={() => togglePlayer(player.id, team)}
                          disabled={isInOtherTeam}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-accent-green text-bg-primary'
                              : isInOtherTeam
                              ? 'bg-bg-secondary text-text-muted opacity-40 cursor-not-allowed'
                              : 'bg-bg-secondary text-text-secondary hover:bg-bg-elevated'
                          }`}
                        >
                          {player.name}
                        </button>
                      );
                    })}
                    {players.length === 0 && (
                      <p className="text-text-muted text-sm">No saved players — add one above</p>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="w-full py-3 bg-accent-green text-bg-primary font-semibold rounded-lg disabled:opacity-30 active:scale-[0.98] transition-transform mt-2"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">
              Who Bats First?
            </h2>

            <div className="space-y-3">
              {[0, 1].map(idx => (
                <button
                  key={idx}
                  onClick={() => setBattingFirst(idx)}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
                    battingFirst === idx
                      ? 'bg-accent-green text-bg-primary'
                      : 'bg-bg-card border border-border text-text-secondary'
                  }`}
                >
                  {idx === 0 ? 'Team A' : 'Team B'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-bg-card border border-border text-text-secondary font-semibold rounded-lg active:scale-[0.98] transition-transform"
              >
                Back
              </button>
              <button
                onClick={handleStartMatch}
                className="flex-1 py-3 bg-accent-green text-bg-primary font-semibold rounded-lg active:scale-[0.98] transition-transform"
              >
                Start Match
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
