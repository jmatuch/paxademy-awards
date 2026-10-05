import { DateTime } from "luxon";
import { supabase } from "./client.js";
import { TIMEZONE } from "../lib/time.js";

export interface NominationRecord {
  id: string;
  teamId: string;
  awardName: string;
  why: string | null;
  nominatorUserId: string;
  channelId: string | null;
  messageTs: string | null;
  nomineeIds: string[];
}

export async function findByMessageRef(
  channelId: string,
  messageTs: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("nominations")
    .select("id")
    .eq("channel_id", channelId)
    .eq("message_ts", messageTs)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getById(id: string): Promise<NominationRecord | null> {
  const { data, error } = await supabase
    .from("nominations")
    .select(
      "id, team_id, award_name, why, nominator_user_id, channel_id, message_ts, nomination_nominees(user_id)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    teamId: data.team_id,
    awardName: data.award_name,
    why: data.why,
    nominatorUserId: data.nominator_user_id,
    channelId: data.channel_id,
    messageTs: data.message_ts,
    nomineeIds: data.nomination_nominees.map((n) => n.user_id),
  };
}

export async function updateNomination(
  id: string,
  params: { awardName: string; why: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("nominations")
    .update({
      award_name: params.awardName,
      why: params.why,
      edited_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function insertNomination(params: {
  teamId: string;
  awardName: string;
  why: string | null;
  nominatorUserId: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("nominations")
    .insert({
      team_id: params.teamId,
      award_name: params.awardName,
      why: params.why,
      nominator_user_id: params.nominatorUserId,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function setMessageRef(
  id: string,
  channelId: string,
  messageTs: string,
): Promise<void> {
  const { error } = await supabase
    .from("nominations")
    .update({ channel_id: channelId, message_ts: messageTs })
    .eq("id", id);

  if (error) throw error;
}

export async function softDelete(
  id: string,
  deletedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from("nominations")
    .update({ deleted_at: new Date().toISOString(), deleted_by: deletedBy })
    .eq("id", id);

  if (error) throw error;
}

export interface HistoryRow {
  id: string;
  awardName: string;
  why: string | null;
  nominatorUserId: string;
  nomineeIds: string[];
  createdAt: string;
  votes: number;
  channelId?: string | null;
  messageTs?: string | null;
}

async function getVotesForNominations(
  ids: string[],
): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("nomination_votes")
    .select("nomination_id, votes")
    .in("nomination_id", ids);

  if (error) throw error;
  return new Map((data ?? []).map((d) => [d.nomination_id, d.votes]));
}

export async function listHistory(
  teamId: string,
  range: { start: DateTime | null; end: DateTime | null },
  limit: number,
): Promise<{ rows: HistoryRow[]; totalInRange: number }> {
  let query = supabase
    .from("nominations")
    .select(
      "id, award_name, why, nominator_user_id, created_at, nomination_nominees(user_id)",
      { count: "exact" },
    )
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (range.start) query = query.gte("created_at", range.start.toISO());
  if (range.end) query = query.lt("created_at", range.end.toISO());

  const { data, error, count } = await query;
  if (error) throw error;

  const ids = (data ?? []).map((d) => d.id);
  const votesByNomination = await getVotesForNominations(ids);

  const rows: HistoryRow[] = (data ?? []).map((d) => ({
    id: d.id,
    awardName: d.award_name,
    why: d.why,
    nominatorUserId: d.nominator_user_id,
    nomineeIds: d.nomination_nominees.map((n) => n.user_id),
    createdAt: d.created_at,
    votes: votesByNomination.get(d.id) ?? 0,
  }));

  return { rows, totalInRange: count ?? rows.length };
}

// Unlike listHistory, this returns every matching row (no cap) with votes,
// ordered oldest-first to match the Top 3 tiebreak rule (earliest created_at
// wins a tie). Used by the monthly/yearly recap jobs, which need the full
// set to compute totals and rankings, not a capped display page.
export async function listNominationsInRange(
  teamId: string,
  range: { start: DateTime | null; end: DateTime | null },
): Promise<HistoryRow[]> {
  let query = supabase
    .from("nominations")
    .select(
      "id, award_name, why, nominator_user_id, channel_id, message_ts, created_at, nomination_nominees(user_id)",
    )
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (range.start) query = query.gte("created_at", range.start.toISO());
  if (range.end) query = query.lt("created_at", range.end.toISO());

  const { data, error } = await query;
  if (error) throw error;

  const ids = (data ?? []).map((d) => d.id);
  const votesByNomination = await getVotesForNominations(ids);

  return (data ?? []).map((d) => ({
    id: d.id,
    awardName: d.award_name,
    why: d.why,
    nominatorUserId: d.nominator_user_id,
    nomineeIds: d.nomination_nominees.map((n) => n.user_id),
    createdAt: d.created_at,
    votes: votesByNomination.get(d.id) ?? 0,
    channelId: d.channel_id,
    messageTs: d.message_ts,
  }));
}

export interface SimpleNomination {
  id: string;
  awardName: string;
  why: string | null;
  nominatorUserId: string;
  nomineeIds: string[];
  createdAt: string;
}

// Broad SQL-side filter only (team, not deleted, before the given year) --
// the exact local month/day (and Feb 29 fallback) match happens in the
// this_date job itself, since that's a recurring/modular match that doesn't
// translate to a single SQL range.
export async function listNominationsBeforeYear(
  teamId: string,
  year: number,
): Promise<SimpleNomination[]> {
  const cutoff = DateTime.fromObject({ year }, { zone: TIMEZONE }).startOf(
    "year",
  );

  const { data, error } = await supabase
    .from("nominations")
    .select(
      "id, award_name, why, nominator_user_id, created_at, nomination_nominees(user_id)",
    )
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .lt("created_at", cutoff.toISO())
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((d) => ({
    id: d.id,
    awardName: d.award_name,
    why: d.why,
    nominatorUserId: d.nominator_user_id,
    nomineeIds: d.nomination_nominees.map((n) => n.user_id),
    createdAt: d.created_at,
  }));
}
