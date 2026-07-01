'use client';

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  Match,
  Player,
  DeliveryOutcome,
  WicketType,
  PlayerId,
  Innings,
} from '@/types';
import { db } from './db';
import {
  processDelivery,
  checkEndOfOver,
  checkInningsEnd,
  finalizeInnings,
  createNewInnings,
} from './scoring-engine';
import {
  getInningsOrder,
  getNextInningsIndex,
  calculateMatchResult,
  updateOversUsedByTeam,
} from './match-engine';

export type ModalState =
  | { type: 'none' }
  | { type: 'wicket' }
  | { type: 'select_bowler' }
  | { type: 'select_batter' }
  | { type: 'innings_complete'; reason: string }
  | { type: 'match_complete'; result: string };

interface ScoringStore {
  activeMatch: Match | null;
  modal: ModalState;

  loadMatch: (id: string) => Promise<void>;
  createMatch: (config: {
    teamAName: string;
    teamBName: string;
    teamAPlayers: PlayerId[];
    teamBPlayers: PlayerId[];
    totalOversPerTeam: number;
    battingFirstTeamIndex: number;
  }) => Promise<string>;

  setCurrentBatter: (batterId: PlayerId) => void;
  setCurrentBowler: (bowlerId: PlayerId) => void;
  recordDelivery: (outcome: DeliveryOutcome, wicketType?: WicketType) => void;
  undoLastDelivery: () => void;
  startNextInnings: () => void;
  setModal: (modal: ModalState) => void;
  saveMatch: () => Promise<void>;
}

export const useScoringStore = create<ScoringStore>((set, get) => ({
  activeMatch: null,
  modal: { type: 'none' },

  loadMatch: async (id: string) => {
    const match = await db.matches.get(id);
    if (match) set({ activeMatch: match as Match, modal: { type: 'none' } });
  },

  createMatch: async (config) => {
    const id = nanoid();
    const order = getInningsOrder(config.battingFirstTeamIndex);
    const firstInnings = createNewInnings(0, order[0].battingTeamIndex, order[0].bowlingTeamIndex);

    const match: Match = {
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'in_progress',
      teams: [
        { name: config.teamAName, playerIds: config.teamAPlayers },
        { name: config.teamBName, playerIds: config.teamBPlayers },
      ],
      totalOversPerTeam: config.totalOversPerTeam,
      innings: [firstInnings],
      currentInningsIndex: 0,
      oversUsedByTeam: [0, 0],
      battingFirstTeamIndex: config.battingFirstTeamIndex,
    };

    await db.matches.put(match);
    set({ activeMatch: match });
    return id;
  },

  setCurrentBatter: (batterId: PlayerId) => {
    const match = get().activeMatch;
    if (!match) return;
    const updated = structuredClone(match);
    const innings = updated.innings[updated.currentInningsIndex];
    innings.currentBatterId = batterId;
    if (!innings.battingOrder.includes(batterId)) {
      innings.battingOrder.push(batterId);
    }
    if (!innings.batters.find(b => b.playerId === batterId)) {
      innings.batters.push({
        playerId: batterId,
        runsScored: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        bodyCount: 0,
        isOut: false,
      });
    }
    updated.updatedAt = Date.now();

    if (checkEndOfOver(innings)) {
      innings.lastOverBowlerId = innings.currentBowlerId;
      innings.currentBowlerId = null;
      updated.innings[updated.currentInningsIndex] = innings;
      set({ activeMatch: updated, modal: { type: 'select_bowler' } });
    } else {
      set({ activeMatch: updated, modal: { type: 'none' } });
    }
    db.matches.put(updated);
  },

  setCurrentBowler: (bowlerId: PlayerId) => {
    const match = get().activeMatch;
    if (!match) return;
    const updated = structuredClone(match);
    const innings = updated.innings[updated.currentInningsIndex];
    innings.currentBowlerId = bowlerId;
    if (!innings.bowlers.find(b => b.playerId === bowlerId)) {
      innings.bowlers.push({
        playerId: bowlerId,
        oversBowled: 0,
        ballsBowled: 0,
        runsConceded: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
      });
    }
    updated.updatedAt = Date.now();
    set({ activeMatch: updated, modal: { type: 'none' } });
    db.matches.put(updated);
  },

  recordDelivery: (outcome: DeliveryOutcome, wicketType?: WicketType) => {
    const match = get().activeMatch;
    if (!match) return;

    const updated = structuredClone(match);
    let innings = updated.innings[updated.currentInningsIndex];

    if (!innings.currentBatterId || !innings.currentBowlerId) return;

    innings = processDelivery(innings, outcome, wicketType);
    updated.innings[updated.currentInningsIndex] = innings;
    updated.updatedAt = Date.now();

    const endCheck = checkInningsEnd(innings, updated);

    if (endCheck.ended && endCheck.reason) {
      innings = finalizeInnings(innings, endCheck.reason);
      updated.innings[updated.currentInningsIndex] = innings;
      updated.oversUsedByTeam = updateOversUsedByTeam(updated);

      const nextIdx = getNextInningsIndex(updated);
      if (nextIdx === null || updated.currentInningsIndex === 3) {
        const result = calculateMatchResult(updated);
        updated.result = result ?? 'Match drawn';
        updated.status = 'completed';
        set({ activeMatch: updated, modal: { type: 'match_complete', result: updated.result } });
      } else {
        set({
          activeMatch: updated,
          modal: {
            type: 'innings_complete',
            reason: endCheck.reason === 'all_out' ? 'All Out' : 'Overs Exhausted',
          },
        });
      }
      db.matches.put(updated);
      return;
    }

    if (innings.currentBatterId === null) {
      set({ activeMatch: updated, modal: { type: 'select_batter' } });
      db.matches.put(updated);
      return;
    }

    if (checkEndOfOver(innings)) {
      innings.lastOverBowlerId = innings.currentBowlerId;
      innings.currentBowlerId = null;
      updated.innings[updated.currentInningsIndex] = innings;
      set({ activeMatch: updated, modal: { type: 'select_bowler' } });
      db.matches.put(updated);
      return;
    }

    set({ activeMatch: updated, modal: { type: 'none' } });
    db.matches.put(updated);
  },

  undoLastDelivery: () => {
    const match = get().activeMatch;
    if (!match) return;

    const updated = structuredClone(match);
    const innings = updated.innings[updated.currentInningsIndex];
    if (innings.deliveries.length === 0) return;

    const lastDelivery = innings.deliveries.pop()!;
    const batter = innings.batters.find(b => b.playerId === lastDelivery.batterId);
    const bowler = innings.bowlers.find(b => b.playerId === lastDelivery.bowlerId);

    if (batter) {
      batter.runsScored -= lastDelivery.runs;
      if (lastDelivery.isLegal) batter.ballsFaced--;
      if (lastDelivery.outcome === 'four') batter.fours--;
      if (lastDelivery.outcome === 'six') batter.sixes--;
      if (lastDelivery.outcome === 'body') {
        batter.bodyCount--;
        if (batter.bodyCount < 3 && batter.isOut && batter.wicketType === 'body') {
          batter.isOut = false;
          batter.wicketType = undefined;
          batter.bowlerWhoGotOut = undefined;
          innings.totalWickets--;
          if (bowler) bowler.wickets--;
        }
      }
      if (lastDelivery.outcome === 'wicket') {
        batter.isOut = false;
        batter.wicketType = undefined;
        batter.bowlerWhoGotOut = undefined;
        innings.totalWickets--;
        if (bowler) bowler.wickets--;
      }
    }

    if (bowler) {
      bowler.runsConceded -= lastDelivery.runs + lastDelivery.extras;
      if (lastDelivery.isLegal) {
        if (bowler.ballsBowled === 0) {
          bowler.oversBowled--;
          bowler.ballsBowled = 5;
        } else {
          bowler.ballsBowled--;
        }
      }
      if (lastDelivery.outcome === 'wide') bowler.wides--;
      if (lastDelivery.outcome === 'no_ball') bowler.noBalls--;
    }

    innings.totalRuns -= lastDelivery.runs + lastDelivery.extras;
    if (lastDelivery.isLegal) innings.legalBallsBowled--;
    if (lastDelivery.outcome === 'wide') {
      innings.totalExtras--;
      innings.wideRuns--;
    }
    if (lastDelivery.outcome === 'no_ball') {
      innings.totalExtras--;
      innings.noBallRuns--;
    }

    innings.currentBatterId = lastDelivery.batterId;
    innings.currentBowlerId = lastDelivery.bowlerId;
    updated.updatedAt = Date.now();

    set({ activeMatch: updated, modal: { type: 'none' } });
    db.matches.put(updated);
  },

  startNextInnings: () => {
    const match = get().activeMatch;
    if (!match) return;

    const updated = structuredClone(match);
    const nextIdx = getNextInningsIndex(updated);
    if (nextIdx === null) return;

    const order = getInningsOrder(updated.battingFirstTeamIndex);
    const newInnings = createNewInnings(
      nextIdx,
      order[nextIdx].battingTeamIndex,
      order[nextIdx].bowlingTeamIndex
    );

    while (updated.innings.length <= nextIdx) {
      updated.innings.push(null as unknown as Innings);
    }
    updated.innings[nextIdx] = newInnings;
    updated.currentInningsIndex = nextIdx;
    updated.updatedAt = Date.now();

    set({ activeMatch: updated, modal: { type: 'select_batter' } });
    db.matches.put(updated);
  },

  setModal: (modal: ModalState) => set({ modal }),

  saveMatch: async () => {
    const match = get().activeMatch;
    if (match) await db.matches.put(match);
  },
}));
