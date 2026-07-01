import type { DeliveryOutcome, WicketType } from '@/types';

export function outcomeLabel(outcome: DeliveryOutcome): string {
  switch (outcome) {
    case 'dot': return '0';
    case 'single': return '1';
    case 'double': return '2';
    case 'triple': return '3';
    case 'four': return '4';
    case 'six': return '6';
    case 'wide': return 'Wd';
    case 'no_ball': return 'NB';
    case 'wicket': return 'W';
    case 'body': return 'B';
  }
}

export function wicketTypeLabel(type: WicketType): string {
  switch (type) {
    case 'bowled': return 'Bowled';
    case 'caught_behind': return 'Caught Behind';
    case 'caught_out': return 'Caught Out';
    case 'hit_wicket': return 'Hit Wicket';
    case 'body': return 'Body (3 hits)';
  }
}

export function strikeRate(runs: number, balls: number): string {
  if (balls === 0) return '0.00';
  return (runs / balls * 100).toFixed(1);
}

export function economyRate(runs: number, legalBalls: number): string {
  if (legalBalls === 0) return '0.00';
  return (runs / (legalBalls / 6)).toFixed(2);
}
