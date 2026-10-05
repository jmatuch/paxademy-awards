import { supabase } from "./client.js";

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
