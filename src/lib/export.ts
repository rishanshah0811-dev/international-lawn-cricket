import type { Match, Player, PlayerId, Innings, Delivery } from '@/types';
import { formatOvers } from './overs';
import { strikeRate, economyRate } from './utils';

function pad(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str;
}

function getHowOut(inn: Innings, playerId: PlayerId, names: Record<string, string>): string {
  const batter = inn.batters.find(b => b.playerId === playerId);
  if (!batter || !batter.isOut) return 'not out';
  const bowler = batter.bowlerWhoGotOut ? names[batter.bowlerWhoGotOut] ?? '?' : '';
  if (batter.wicketType === 'body') return 'body (3 hits)';
  if (batter.wicketType === 'bowled') return `b ${bowler}`;
  if (batter.wicketType === 'caught_behind') return `c† b ${bowler}`;
  if (batter.wicketType === 'caught_out') return `c b ${bowler}`;
  if (batter.wicketType === 'hit_wicket') return `hit wkt b ${bowler}`;
  return 'out';
}

function deliverySymbol(d: Delivery): string {
  if (d.outcome === 'wicket') return 'W';
  if (d.outcome === 'wide') return `${d.runs}wd`;
  if (d.outcome === 'no_ball') return `${d.runs}nb`;
  if (d.outcome === 'body') return 'B';
  return String(d.runs);
}

function renderInningsScorecard(
  inn: Innings,
  match: Match,
  names: Record<string, string>
): string {
  const lines: string[] = [];
  const battingTeam = match.teams[inn.battingTeamIndex].name;
  const bowlingTeam = match.teams[inn.bowlingTeamIndex].name;

  lines.push(`── Innings ${inn.inningsIndex + 1}: ${battingTeam} batting ──`);
  lines.push(`${inn.totalRuns}/${inn.totalWickets} (${formatOvers(inn.legalBallsBowled)} ov)`);
  lines.push('');

  lines.push(pad('Batter', 14) + pad('How Out', 18) + padLeft('R', 4) + padLeft('B', 4) + padLeft('4s', 4) + padLeft('6s', 4) + padLeft('SR', 8));
  lines.push('-'.repeat(56));

  for (const pid of inn.battingOrder) {
    const b = inn.batters.find(x => x.playerId === pid);
    if (!b) continue;
    const name = names[pid] ?? 'Unknown';
    const howOut = getHowOut(inn, pid, names);
    lines.push(
      pad(name, 14) +
      pad(howOut, 18) +
      padLeft(String(b.runsScored), 4) +
      padLeft(String(b.ballsFaced), 4) +
      padLeft(String(b.fours), 4) +
      padLeft(String(b.sixes), 4) +
      padLeft(strikeRate(b.runsScored, b.ballsFaced), 8)
    );
  }

  lines.push(pad('Extras', 32) + padLeft(String(inn.totalExtras), 4) + `  (Wd ${inn.wideRuns}, NB ${inn.noBallRuns})`);
  lines.push('');

  lines.push(pad('Bowler', 14) + padLeft('O', 5) + padLeft('R', 4) + padLeft('W', 4) + padLeft('Wd', 4) + padLeft('NB', 4) + padLeft('Econ', 8));
  lines.push('-'.repeat(43));

  for (const bw of inn.bowlers) {
    const name = names[bw.playerId] ?? 'Unknown';
    const totalBalls = bw.oversBowled * 6 + bw.ballsBowled;
    lines.push(
      pad(name, 14) +
      padLeft(formatOvers(totalBalls), 5) +
      padLeft(String(bw.runsConceded), 4) +
      padLeft(String(bw.wickets), 4) +
      padLeft(String(bw.wides), 4) +
      padLeft(String(bw.noBalls), 4) +
      padLeft(economyRate(bw.runsConceded, totalBalls), 8)
    );
  }

  return lines.join('\n');
}

function renderBallByBall(
  inn: Innings,
  match: Match,
  names: Record<string, string>
): string {
  const lines: string[] = [];
  const battingTeam = match.teams[inn.battingTeamIndex].name;

  lines.push(`── Innings ${inn.inningsIndex + 1}: ${battingTeam} ball-by-ball ──`);

  let currentOver = -1;
  let overBalls: string[] = [];
  let runningTotal = 0;
  let runningWickets = 0;

  for (const d of inn.deliveries) {
    if (d.overNumber !== currentOver) {
      if (currentOver >= 0) {
        lines.push(`Over ${currentOver + 1} (${names[inn.deliveries.find(x => x.overNumber === currentOver)?.bowlerId ?? ''] ?? '?'}): ${overBalls.join(' ')}  → ${runningTotal}/${runningWickets}`);
      }
      currentOver = d.overNumber;
      overBalls = [];
    }
    overBalls.push(deliverySymbol(d));
    runningTotal += d.runs + d.extras;
    if (d.outcome === 'wicket' || (d.outcome === 'body' && d.wicketType === 'body')) {
      runningWickets++;
    }
  }

  if (overBalls.length > 0) {
    const bowlerId = inn.deliveries.find(x => x.overNumber === currentOver)?.bowlerId ?? '';
    lines.push(`Over ${currentOver + 1} (${names[bowlerId] ?? '?'}): ${overBalls.join(' ')}  → ${runningTotal}/${runningWickets}`);
  }

  return lines.join('\n');
}

export function exportMatchText(match: Match, playerList: Player[]): string {
  const names: Record<string, string> = {};
  playerList.forEach(p => { names[p.id] = p.name; });

  const lines: string[] = [];

  lines.push('═══════════════════════════════════');
  lines.push('  INTERNATIONAL LAWN CRICKET');
  lines.push(`  ${match.teams[0].name} vs ${match.teams[1].name}`);
  lines.push(`  ${match.totalOversPerTeam} overs per team`);
  lines.push('═══════════════════════════════════');

  if (match.result) {
    lines.push('');
    lines.push(`Result: ${match.result}`);
  }

  const completedInnings = match.innings.filter(Boolean);

  if (completedInnings.length > 0) {
    lines.push('');
    lines.push('Summary: ' + completedInnings.map(inn => {
      const team = match.teams[inn.battingTeamIndex].name;
      return `${team} ${inn.totalRuns}/${inn.totalWickets}`;
    }).join(' | '));
  }

  for (const inn of completedInnings) {
    lines.push('');
    lines.push(renderInningsScorecard(inn, match, names));
  }

  lines.push('');
  lines.push('');
  lines.push('BALL-BY-BALL');
  lines.push('────────────');

  for (const inn of completedInnings) {
    lines.push('');
    lines.push(renderBallByBall(inn, match, names));
  }

  lines.push('');

  return lines.join('\n');
}
