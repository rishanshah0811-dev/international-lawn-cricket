'use client';

import type { WicketType } from '@/types';
import { Modal } from '@/components/ui/Modal';

interface WicketModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: WicketType) => void;
  bodyCount: number;
}

const WICKET_TYPES: { type: WicketType; label: string }[] = [
  { type: 'bowled', label: 'Bowled' },
  { type: 'caught_behind', label: 'Caught Behind' },
  { type: 'caught_out', label: 'Caught Out' },
  { type: 'hit_wicket', label: 'Hit Wicket' },
];

export function WicketModal({ open, onClose, onSelect, bodyCount }: WicketModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="How Out?">
      <div className="space-y-2">
        {WICKET_TYPES.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="w-full text-left px-4 py-3 bg-bg-secondary border border-border rounded-xl hover:bg-bg-elevated transition-colors active:scale-[0.98]"
          >
            <span className="font-semibold text-text-primary">{label}</span>
          </button>
        ))}
        {bodyCount >= 2 && (
          <button
            onClick={() => onSelect('body')}
            className="w-full text-left px-4 py-3 bg-accent-red/10 border border-accent-red/30 rounded-xl hover:bg-accent-red/20 transition-colors active:scale-[0.98]"
          >
            <span className="font-semibold text-accent-red">Body ({bodyCount}/3)</span>
          </button>
        )}
      </div>
    </Modal>
  );
}
