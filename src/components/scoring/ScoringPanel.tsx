'use client';

import type { DeliveryOutcome } from '@/types';

interface ScoringPanelProps {
  onScore: (outcome: DeliveryOutcome) => void;
  onWicket: () => void;
  onUndo: () => void;
  disabled: boolean;
  bodyCount: number;
}

export function ScoringPanel({ onScore, onWicket, onUndo, disabled, bodyCount }: ScoringPanelProps) {
  const buttonBase = 'flex items-center justify-center rounded-xl font-bold transition-all active:scale-95 disabled:opacity-30';

  return (
    <div className="p-3 space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {(['dot', 'single', 'double', 'triple'] as const).map((outcome, i) => (
          <button
            key={outcome}
            onClick={() => onScore(outcome)}
            disabled={disabled}
            className={`${buttonBase} h-16 bg-bg-card border-2 border-accent-green/30 text-accent-green text-2xl hover:bg-accent-green/10`}
          >
            {i}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onScore('four')}
          disabled={disabled}
          className={`${buttonBase} h-16 bg-accent-orange/10 border-2 border-accent-orange/40 text-accent-orange text-xl hover:bg-accent-orange/20`}
        >
          FOUR
        </button>
        <button
          onClick={() => onScore('six')}
          disabled={disabled}
          className={`${buttonBase} h-16 bg-accent-gold/10 border-2 border-accent-gold/40 text-accent-gold text-xl hover:bg-accent-gold/20`}
        >
          SIX
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onScore('wide')}
          disabled={disabled}
          className={`${buttonBase} h-14 bg-accent-blue/10 border-2 border-accent-blue/30 text-accent-blue text-base hover:bg-accent-blue/20`}
        >
          WIDE
        </button>
        <button
          onClick={() => onScore('no_ball')}
          disabled={disabled}
          className={`${buttonBase} h-14 bg-accent-blue/10 border-2 border-accent-blue/30 text-accent-blue text-base hover:bg-accent-blue/20`}
        >
          NO BALL
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onWicket}
          disabled={disabled}
          className={`${buttonBase} h-14 bg-accent-red/10 border-2 border-accent-red/40 text-accent-red text-base hover:bg-accent-red/20`}
        >
          WICKET
        </button>
        <button
          onClick={() => onScore('body')}
          disabled={disabled}
          className={`${buttonBase} h-14 border-2 text-base ${
            bodyCount >= 2
              ? 'bg-accent-red/20 border-accent-red/60 text-accent-red animate-pulse'
              : bodyCount >= 1
              ? 'bg-accent-orange/10 border-accent-orange/40 text-accent-orange'
              : 'bg-bg-card border-accent-orange/30 text-accent-orange'
          } hover:bg-accent-orange/20`}
        >
          <div className="text-center">
            <div>BODY</div>
            <div className="text-[10px] font-normal opacity-70">{bodyCount}/3</div>
          </div>
        </button>
        <button
          onClick={onUndo}
          className={`${buttonBase} h-14 bg-bg-card border-2 border-border text-text-muted text-base hover:bg-bg-elevated`}
        >
          UNDO
        </button>
      </div>
    </div>
  );
}
