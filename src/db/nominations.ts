import { supabase } from "./client.js";

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
