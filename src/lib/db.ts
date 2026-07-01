import { supabase } from './supabase';
import type { Player, Match } from '@/types';

export const db = {
  players: {
    async list(): Promise<Player[]> {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []).map(row => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
      }));
    },

    async getByIds(ids: string[]): Promise<Player[]> {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .in('id', ids);
      if (error) throw error;
      return (data ?? []).map(row => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
      }));
    },

    async add(player: Player): Promise<void> {
      const { error } = await supabase.from('players').insert({
        id: player.id,
        name: player.name,
        created_at: player.createdAt,
      });
      if (error) throw error;
    },

    async remove(id: string): Promise<void> {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
  },

  matches: {
    async list(): Promise<Match[]> {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(row => row.data as Match);
    },

    async get(id: string): Promise<Match | undefined> {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? (data.data as Match) : undefined;
    },

    async put(match: Match): Promise<void> {
      const { error } = await supabase.from('matches').upsert({
        id: match.id,
        status: match.status,
        data: match,
        created_at: match.createdAt,
        updated_at: match.updatedAt,
      });
      if (error) throw error;
    },

    async remove(id: string): Promise<void> {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
  },
};
