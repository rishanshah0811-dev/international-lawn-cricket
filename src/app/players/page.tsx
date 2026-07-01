'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import type { Player } from '@/types';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    const all = await db.players.list();
    setPlayers(all);
  }

  async function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    const existing = players.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) return;
    await db.players.add({ id: nanoid(), name, createdAt: Date.now() });
    setNewName('');
    loadPlayers();
  }

  async function deletePlayer(id: string) {
    await db.players.remove(id);
    loadPlayers();
  }

  const filtered = search
    ? players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : players;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-bg-secondary border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-text-secondary hover:text-text-primary text-lg">
            ←
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
            Players
          </h1>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
            placeholder="Add new player..."
            className="flex-1 bg-bg-card border border-border rounded-lg px-3 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green"
          />
          <button
            onClick={addPlayer}
            disabled={!newName.trim()}
            className="px-4 py-3 bg-accent-green text-bg-primary font-semibold rounded-lg disabled:opacity-30 active:scale-95 transition-transform"
          >
            Add
          </button>
        </div>

        {players.length > 5 && (
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search players..."
            className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green mb-4 text-sm"
          />
        )}

        <div className="space-y-2">
          {filtered.map(player => (
            <div
              key={player.id}
              className="flex items-center justify-between bg-bg-card border border-border rounded-lg px-4 py-3"
            >
              <span className="text-text-primary">{player.name}</span>
              <button
                onClick={() => deletePlayer(player.id)}
                className="text-text-muted hover:text-accent-red text-sm transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          {filtered.length === 0 && players.length > 0 && (
            <p className="text-text-muted text-center py-4 text-sm">No players match your search</p>
          )}
          {players.length === 0 && (
            <p className="text-text-muted text-center py-8 text-sm">Add your first player above</p>
          )}
        </div>
      </main>
    </div>
  );
}
