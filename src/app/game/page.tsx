'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useScoringStore } from '@/lib/store';
import { db } from '@/lib/db';
import type { Player, PlayerId, DeliveryOutcome, WicketType } from '@/types';
import { MatchHeader } from '@/components/scoring/MatchHeader';
import { BatterCard } from '@/components/scoring/BatterCard';
import { BowlerCard } from '@/components/scoring/BowlerCard';
import { ScoringPanel } from '@/components/scoring/ScoringPanel';
import { WicketModal } from '@/components/scoring/WicketModal';
import { PlayerSelectModal } from '@/components/scoring/PlayerSelectModal';
import { Modal } from '@/components/ui/Modal';

function ScoringPageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';

  const {
    activeMatch,
    modal,
    loadMatch,
    setCurrentBatter,
    setCurrentBowler,
    recordDelivery,
    undoLastDelivery,
    startNextInnings,
    setModal,
  } = useScoringStore();

  const [players, setPlayers] = useState<Record<PlayerId, Player>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatch(id).then(() => setLoading(false));
  }, [id, loadMatch]);

  useEffect(() => {
    db.players.list().then(all => {
      const map: Record<string, Player> = {};
      all.forEach(p => { map[p.id] = p; });
      setPlayers(map);
    });
  }, []);

  if (loading || !activeMatch) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-muted">Loading match...</p>
      </div>
    );
  }

  const match = activeMatch;
  const currentInnings = match.innings[match.currentInningsIndex];
  if (!currentInnings) return null;

  const battingTeamIndex = currentInnings.battingTeamIndex;
  const bowlingTeamIndex = currentInnings.bowlingTeamIndex;
  const battingTeam = match.teams[battingTeamIndex];
  const bowlingTeam = match.teams[bowlingTeamIndex];

  const currentBatter = currentInnings.batters.find(
    b => b.playerId === currentInnings.currentBatterId
  );
  const currentBowler = currentInnings.bowlers.find(
    b => b.playerId === currentInnings.currentBowlerId
  );

  const needsBatter = !currentInnings.currentBatterId;
  const needsBowler = !currentInnings.currentBowlerId;
  const canScore = !needsBatter && !needsBowler && !currentInnings.isComplete;

  const battersThatBatted = currentInnings.battingOrder;
  const availableBatters = battingTeam.playerIds.filter(
    pid => !currentInnings.batters.find(b => b.playerId === pid && b.isOut)
      && pid !== currentInnings.currentBatterId
  );

  function handleScore(outcome: DeliveryOutcome) {
    if (!canScore) return;
    recordDelivery(outcome);
  }

  function handleWicketSelect(type: WicketType) {
    recordDelivery('wicket', type);
  }

  const bodyCount = currentBatter?.bodyCount ?? 0;

  const showBatterSelect = needsBatter || modal.type === 'select_batter';
  const showBowlerSelect = needsBowler || modal.type === 'select_bowler';

  const outBatterIds = currentInnings.batters
    .filter(b => b.isOut)
    .map(b => b.playerId);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between bg-bg-primary px-4 py-2 border-b border-border">
        <Link href="/" className="text-text-secondary text-sm">
          ← Home
        </Link>
        <Link
          href={`/game/scorecard?id=${id}`}
          className="text-text-secondary text-sm hover:text-text-primary"
        >
          Scorecard
        </Link>
      </div>

      <MatchHeader match={match} innings={currentInnings} />

      {bodyCount > 0 && (
        <div className={`px-4 py-2 flex items-center gap-2 ${
          bodyCount >= 2 ? 'bg-accent-red/15' : 'bg-accent-orange/10'
        }`}>
          <span className={`text-xs font-semibold ${
            bodyCount >= 2 ? 'text-accent-red' : 'text-accent-orange'
          }`}>
            BODY COUNT: {bodyCount}/3
          </span>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < bodyCount
                    ? bodyCount >= 2 ? 'bg-accent-red' : 'bg-accent-orange'
                    : 'bg-bg-card border border-border'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 px-4 py-3">
        <BatterCard
          batter={currentBatter}
          player={currentInnings.currentBatterId ? players[currentInnings.currentBatterId] : undefined}
        />
        <BowlerCard
          bowler={currentBowler}
          player={currentInnings.currentBowlerId ? players[currentInnings.currentBowlerId] : undefined}
        />
      </div>

      <div className="flex-1" />

      <ScoringPanel
        onScore={handleScore}
        onWicket={() => setModal({ type: 'wicket' })}
        onUndo={undoLastDelivery}
        disabled={!canScore}
        bodyCount={bodyCount}
      />

      {currentInnings.deliveries.length > 0 && (
        <div className="px-4 py-2 border-t border-border/50">
          <p className="text-xs text-text-muted">
            Last ball: {(() => {
              const last = currentInnings.deliveries[currentInnings.deliveries.length - 1];
              const batterName = players[last.batterId]?.name ?? 'Unknown';
              switch (last.outcome) {
                case 'wicket': return `${batterName} OUT (${last.wicketType})`;
                case 'body': return last.wicketType
                  ? `${batterName} OUT (body - 3rd hit)`
                  : `${batterName} body hit (${currentBatter?.bodyCount ?? 0}/3)`;
                case 'wide': return 'Wide (+1)';
                case 'no_ball': return 'No Ball (+1)';
                case 'four': return `${batterName} FOUR`;
                case 'six': return `${batterName} SIX`;
                default: return `${batterName} ${last.runs} run${last.runs !== 1 ? 's' : ''}`;
              }
            })()}
          </p>
        </div>
      )}

      <WicketModal
        open={modal.type === 'wicket'}
        onClose={() => setModal({ type: 'none' })}
        onSelect={handleWicketSelect}
        bodyCount={bodyCount}
      />

      <PlayerSelectModal
        open={showBatterSelect && !currentInnings.isComplete}
        title="Select Next Batter"
        playerIds={battingTeam.playerIds}
        excludeIds={outBatterIds}
        onSelect={setCurrentBatter}
      />

      <PlayerSelectModal
        open={showBowlerSelect && !showBatterSelect && !currentInnings.isComplete}
        title="Select Bowler"
        playerIds={bowlingTeam.playerIds}
        disabledIds={currentInnings.lastOverBowlerId ? [currentInnings.lastOverBowlerId] : []}
        disabledReason="Bowled last over"
        onSelect={setCurrentBowler}
      />

      {modal.type === 'innings_complete' && (
        <Modal open title="Innings Complete" onClose={undefined}>
          <div className="text-center">
            <p className="text-text-secondary mb-2">
              {match.teams[battingTeamIndex].name}: {currentInnings.totalRuns}/{currentInnings.totalWickets}
            </p>
            <p className="text-sm text-text-muted mb-4">{modal.reason}</p>
            <button
              onClick={startNextInnings}
              className="w-full py-3 bg-accent-green text-bg-primary font-semibold rounded-lg active:scale-[0.98] transition-transform"
            >
              Start Next Innings
            </button>
          </div>
        </Modal>
      )}

      {modal.type === 'match_complete' && (
        <Modal open title="Match Over" onClose={undefined}>
          <div className="text-center">
            <p className="font-[family-name:var(--font-display)] text-lg font-bold text-accent-gold mb-4">
              {modal.result}
            </p>
            <div className="space-y-2">
              <Link
                href={`/game/scorecard?id=${id}`}
                className="block w-full py-3 bg-accent-green text-bg-primary font-semibold rounded-lg text-center"
              >
                View Scorecard
              </Link>
              <Link
                href="/"
                className="block w-full py-3 bg-bg-card border border-border text-text-secondary font-semibold rounded-lg text-center"
              >
                Home
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function ScoringPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-text-muted">Loading...</p></div>}>
      <ScoringPageInner />
    </Suspense>
  );
}
