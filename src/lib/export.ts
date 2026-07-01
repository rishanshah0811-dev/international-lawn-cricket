import type { Match, Player, PlayerId, Innings, Delivery } from '@/types';
import { formatOvers } from './overs';
import { strikeRate, economyRate } from './utils';

function getHowOut(inn: Innings, playerId: PlayerId, names: Record<string, string>): string {
  const batter = inn.batters.find(b => b.playerId === playerId);
  if (!batter || !batter.isOut) return 'not out';
  const bowler = batter.bowlerWhoGotOut ? names[batter.bowlerWhoGotOut] ?? '?' : '';
  if (batter.wicketType === 'body') return 'body (3 hits)';
  if (batter.wicketType === 'bowled') return `b ${bowler}`;
  if (batter.wicketType === 'caught_behind') return `c&dagger; b ${bowler}`;
  if (batter.wicketType === 'caught_out') return `c b ${bowler}`;
  if (batter.wicketType === 'hit_wicket') return `hit wkt b ${bowler}`;
  return 'out';
}

function deliverySymbol(d: Delivery): string {
  if (d.outcome === 'wicket') return '<span class="ball w">W</span>';
  if (d.outcome === 'wide') return `<span class="ball wd">${d.runs}wd</span>`;
  if (d.outcome === 'no_ball') return `<span class="ball nb">${d.runs}nb</span>`;
  if (d.outcome === 'body') return '<span class="ball body">B</span>';
  if (d.runs === 0) return '<span class="ball dot">&middot;</span>';
  if (d.runs === 4) return '<span class="ball four">4</span>';
  if (d.runs === 6) return '<span class="ball six">6</span>';
  return `<span class="ball">${d.runs}</span>`;
}

function renderInningsHTML(inn: Innings, match: Match, names: Record<string, string>): string {
  const battingTeam = match.teams[inn.battingTeamIndex].name;
  const bowlingTeam = match.teams[inn.bowlingTeamIndex].name;

  const batterRows = inn.battingOrder.map(pid => {
    const b = inn.batters.find(x => x.playerId === pid);
    if (!b) return '';
    const name = names[pid] ?? 'Unknown';
    const howOut = getHowOut(inn, pid, names);
    const notOut = !b.isOut;
    return `<tr>
      <td class="name">${name}</td>
      <td class="howout">${howOut}</td>
      <td class="num ${notOut ? 'notout' : ''}">${b.runsScored}</td>
      <td class="num dim">${b.ballsFaced}</td>
      <td class="num dim">${b.fours}</td>
      <td class="num dim">${b.sixes}</td>
      <td class="num dim">${strikeRate(b.runsScored, b.ballsFaced)}</td>
    </tr>`;
  }).join('');

  const bowlerRows = inn.bowlers.map(bw => {
    const name = names[bw.playerId] ?? 'Unknown';
    const totalBalls = bw.oversBowled * 6 + bw.ballsBowled;
    return `<tr>
      <td class="name">${name}</td>
      <td class="num dim">${formatOvers(totalBalls)}</td>
      <td class="num dim">${bw.runsConceded}</td>
      <td class="num">${bw.wickets}</td>
      <td class="num dim">${bw.wides}</td>
      <td class="num dim">${bw.noBalls}</td>
      <td class="num dim">${economyRate(bw.runsConceded, totalBalls)}</td>
    </tr>`;
  }).join('');

  // ball by ball
  const overs: { num: number; bowler: string; balls: string[]; scoreAfter: string }[] = [];
  let currentOver = -1;
  let overBalls: string[] = [];
  let runningTotal = 0;
  let runningWickets = 0;

  for (const d of inn.deliveries) {
    if (d.overNumber !== currentOver) {
      if (currentOver >= 0) {
        const bowlerId = inn.deliveries.find(x => x.overNumber === currentOver)?.bowlerId ?? '';
        overs.push({
          num: currentOver + 1,
          bowler: names[bowlerId] ?? '?',
          balls: overBalls,
          scoreAfter: `${runningTotal}/${runningWickets}`
        });
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
    overs.push({
      num: currentOver + 1,
      bowler: names[bowlerId] ?? '?',
      balls: overBalls,
      scoreAfter: `${runningTotal}/${runningWickets}`
    });
  }

  const overRows = overs.map(o =>
    `<div class="over-row">
      <span class="over-num">Ov ${o.num}</span>
      <span class="over-bowler">${o.bowler}</span>
      <span class="over-balls">${o.balls.join(' ')}</span>
      <span class="over-score">${o.scoreAfter}</span>
    </div>`
  ).join('');

  return `
    <div class="innings-block">
      <div class="innings-header">
        <div>
          <div class="innings-label">Innings ${inn.inningsIndex + 1}</div>
          <div class="innings-team">${battingTeam}</div>
        </div>
        <div class="innings-score">${inn.totalRuns}/${inn.totalWickets} <span class="overs">(${formatOvers(inn.legalBallsBowled)} ov)</span></div>
      </div>

      <table class="scorecard">
        <thead>
          <tr>
            <th class="name">Batter</th>
            <th class="howout"></th>
            <th class="num">R</th>
            <th class="num">B</th>
            <th class="num">4s</th>
            <th class="num">6s</th>
            <th class="num">SR</th>
          </tr>
        </thead>
        <tbody>${batterRows}</tbody>
        <tfoot>
          <tr><td colspan="7" class="extras">Extras: ${inn.totalExtras} (Wd ${inn.wideRuns}, NB ${inn.noBallRuns})</td></tr>
        </tfoot>
      </table>

      <table class="scorecard bowling">
        <thead>
          <tr>
            <th class="name">${bowlingTeam} bowling</th>
            <th class="num">O</th>
            <th class="num">R</th>
            <th class="num">W</th>
            <th class="num">Wd</th>
            <th class="num">NB</th>
            <th class="num">Econ</th>
          </tr>
        </thead>
        <tbody>${bowlerRows}</tbody>
      </table>

      ${overs.length > 0 ? `
        <div class="bbb-section">
          <div class="bbb-title">Ball by ball</div>
          ${overRows}
        </div>
      ` : ''}
    </div>
  `;
}

export function exportMatchHTML(match: Match, playerList: Player[]): string {
  const names: Record<string, string> = {};
  playerList.forEach(p => { names[p.id] = p.name; });

  const inningsBlocks = match.innings
    .filter(Boolean)
    .map(inn => renderInningsHTML(inn, match, names))
    .join('');

  const summary = match.innings
    .filter(Boolean)
    .map(inn => {
      const team = match.teams[inn.battingTeamIndex].name;
      return `<span class="summary-item">${team} ${inn.totalRuns}/${inn.totalWickets}</span>`;
    })
    .join('<span class="summary-sep">&bull;</span>');

  const date = new Date(match.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${match.teams[0].name} vs ${match.teams[1].name} — Scorecard</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'DM Sans', system-ui, sans-serif;
    background: #0f1a12;
    color: #d4ddd6;
    min-height: 100vh;
    padding: 24px 16px;
  }

  .card {
    max-width: 540px;
    margin: 0 auto;
    background: #162019;
    border: 1px solid #2a3d2e;
    border-radius: 16px;
    overflow: hidden;
  }

  .match-header {
    padding: 28px 24px 20px;
    text-align: center;
    border-bottom: 1px solid #2a3d2e;
    background: linear-gradient(180deg, #1a2b1e 0%, #162019 100%);
  }

  .match-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2.5px;
    color: #5a7d60;
    margin-bottom: 12px;
    font-weight: 600;
  }

  .match-teams {
    font-size: 22px;
    font-weight: 700;
    color: #e8f0ea;
    margin-bottom: 4px;
  }

  .match-teams .vs {
    color: #4a6b50;
    font-weight: 400;
    font-size: 16px;
    margin: 0 6px;
  }

  .match-meta {
    font-size: 12px;
    color: #5a7d60;
    margin-top: 8px;
  }

  .match-result {
    margin-top: 14px;
    padding: 8px 16px;
    background: #1e3324;
    border-radius: 8px;
    display: inline-block;
    font-size: 13px;
    font-weight: 600;
    color: #7ccf8a;
  }

  .match-summary {
    padding: 14px 24px;
    border-bottom: 1px solid #2a3d2e;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #8fa893;
  }

  .summary-sep { color: #3a5340; }

  .innings-block {
    border-bottom: 1px solid #2a3d2e;
  }

  .innings-block:last-child { border-bottom: none; }

  .innings-header {
    padding: 18px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #1a2b1e;
  }

  .innings-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #5a7d60;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .innings-team {
    font-size: 16px;
    font-weight: 700;
    color: #e8f0ea;
  }

  .innings-score {
    font-family: 'JetBrains Mono', monospace;
    font-size: 22px;
    font-weight: 700;
    color: #e8f0ea;
  }

  .innings-score .overs {
    font-size: 13px;
    font-weight: 400;
    color: #5a7d60;
  }

  .scorecard {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .scorecard thead th {
    padding: 8px 8px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #5a7d60;
    font-weight: 600;
    border-bottom: 1px solid #243028;
  }

  .scorecard th.name, .scorecard td.name { text-align: left; padding-left: 20px; }
  .scorecard th.howout, .scorecard td.howout { text-align: left; }
  .scorecard th.num, .scorecard td.num { text-align: right; padding-right: 10px; }

  .scorecard tbody tr {
    border-bottom: 1px solid #1e2d22;
  }

  .scorecard tbody td {
    padding: 9px 8px;
  }

  .scorecard td.name {
    font-weight: 600;
    color: #c8dccb;
  }

  .scorecard td.howout {
    color: #6a8d70;
    font-size: 12px;
  }

  .scorecard td.num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #e8f0ea;
  }

  .scorecard td.num.notout {
    color: #7ccf8a;
    font-weight: 700;
  }

  .scorecard td.num.dim { color: #6a8d70; }

  .scorecard tfoot td {
    padding: 10px 20px;
    font-size: 12px;
    color: #6a8d70;
    border-top: 1px solid #243028;
  }

  .scorecard.bowling { margin-top: 4px; }

  .scorecard.bowling thead th:first-child {
    font-size: 11px;
    text-transform: none;
    letter-spacing: 0;
    color: #6a8d70;
    font-weight: 500;
  }

  .bbb-section {
    padding: 14px 20px 18px;
    border-top: 1px solid #243028;
  }

  .bbb-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #5a7d60;
    font-weight: 600;
    margin-bottom: 10px;
  }

  .over-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid #1e2d22;
    font-size: 12px;
  }

  .over-row:last-child { border-bottom: none; }

  .over-num {
    font-family: 'JetBrains Mono', monospace;
    color: #5a7d60;
    font-size: 11px;
    min-width: 36px;
    font-weight: 500;
  }

  .over-bowler {
    color: #8fa893;
    min-width: 64px;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .over-balls {
    flex: 1;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .ball {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    background: #1e2d22;
    color: #8fa893;
    padding: 0 3px;
  }

  .ball.dot { color: #4a6b50; }
  .ball.four { background: #1a3a2a; color: #4ecb71; }
  .ball.six { background: #2a1a3a; color: #b47ce8; }
  .ball.w { background: #3a1a1a; color: #e84e4e; }
  .ball.wd { background: #2d2a1a; color: #c4a94e; font-size: 10px; }
  .ball.nb { background: #2d2a1a; color: #c4a94e; font-size: 10px; }
  .ball.body { background: #3a2a1a; color: #e89a4e; }

  .over-score {
    font-family: 'JetBrains Mono', monospace;
    color: #6a8d70;
    font-size: 12px;
    min-width: 40px;
    text-align: right;
  }

  .footer {
    padding: 16px 24px;
    text-align: center;
    font-size: 10px;
    color: #3a5340;
    letter-spacing: 1px;
    text-transform: uppercase;
    border-top: 1px solid #2a3d2e;
  }

  @media print {
    body { background: #fff; color: #1a1a1a; padding: 0; }
    .card { border: none; max-width: 100%; }
    .match-header { background: #f8f8f8; }
    .innings-header { background: #f0f0f0; }
    .scorecard td.num, .scorecard td.name { color: #1a1a1a; }
    .scorecard td.num.dim, .scorecard td.howout { color: #666; }
    .ball { background: #eee; color: #333; }
    .ball.four { background: #d4f5dd; color: #1a6b2a; }
    .ball.six { background: #e8d4f5; color: #5a2a8b; }
    .ball.w { background: #f5d4d4; color: #8b2a2a; }
  }
</style>
</head>
<body>
<div class="card">
  <div class="match-header">
    <div class="match-title">International Lawn Cricket</div>
    <div class="match-teams">
      ${match.teams[0].name}<span class="vs">vs</span>${match.teams[1].name}
    </div>
    <div class="match-meta">${match.totalOversPerTeam} overs per team &middot; ${date}</div>
    ${match.result ? `<div class="match-result">${match.result}</div>` : ''}
  </div>

  <div class="match-summary">${summary}</div>

  ${inningsBlocks}

  <div class="footer">International Lawn Cricket</div>
</div>
</body>
</html>`;
}

export function downloadMatchFile(match: Match, playerList: Player[]) {
  const html = exportMatchHTML(match, playerList);
  const blob = new Blob([html], { type: 'text/html' });
  const filename = `${match.teams[0].name}-vs-${match.teams[1].name}.html`
    .replace(/\s+/g, '-')
    .toLowerCase();

  if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename)] })) {
    const file = new File([blob], filename, { type: 'text/html' });
    navigator.share({ files: [file], title: `${match.teams[0].name} vs ${match.teams[1].name}` }).catch(() => {
      triggerDownload(blob, filename);
    });
  } else {
    triggerDownload(blob, filename);
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
