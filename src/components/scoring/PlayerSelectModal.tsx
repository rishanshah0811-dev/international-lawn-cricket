'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { db } from '@/lib/db';
import type { Player, PlayerId } from '@/types';

interface PlayerSelectModalProps {
  open: boolean;
  title: string;
  playerIds: PlayerId[];
  excludeIds?: PlayerId[];
  disabledIds?: PlayerId[];
  disabledReason?: string;
  onSelect: (playerId: PlayerId) => void;
}

export function PlayerSelectModal({
  open,
  title,
  playerIds,
  excludeIds = [],
  disabledIds = [],
  disabledReason,
  onSelect,
}: PlayerSelectModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (open) {
      db.players.getByIds(playerIds).then(setPlayers);
    }
  }, [open, playerIds]);

  const availablePlayers = players.filter(p => !excludeIds.includes(p.id));

  return (
    <Modal open={open} title={title} onClose={undefined}>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {availablePlayers.map(player => {
          const isDisabled = disabledIds.includes(player.id);
          return (
            <button
              key={player.id}
              onClick={() => !isDisabled && onSelect(player.id)}
              disabled={isDisabled}
              className={`w-full text-left px-4 py-3 rounded-xl transition-colors active:scale-[0.98] ${
                isDisabled
                  ? 'bg-bg-secondary text-text-muted opacity-40 cursor-not-allowed'
                  : 'bg-bg-secondary border border-border text-text-primary hover:bg-bg-elevated'
              }`}
            >
              <span className="font-medium">{player.name}</span>
              {isDisabled && disabledReason && (
                <span className="text-xs text-text-muted ml-2">({disabledReason})</span>
              )}
            </button>
          );
        })}
        {availablePlayers.length === 0 && (
          <p className="text-text-muted text-center py-4 text-sm">No available players</p>
        )}
      </div>
    </Modal>
  );
}
