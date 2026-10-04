import { supabase } from "./client.js";

export interface Settings {
  nominationChannelId: string | null;
  nominationChannelName: string | null;
}

export async function getSettings(teamId: string): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .select("nomination_channel_id, nomination_channel_name")
    .eq("team_id", teamId)
    .maybeSingle();

  if (error) throw error;
  return {
    nominationChannelId: data?.nomination_channel_id ?? null,
    nominationChannelName: data?.nomination_channel_name ?? null,
  };
}

export async function upsertNominationChannel(
  teamId: string,
  channelId: string,
  channelName: string,
  updatedBy: string,
): Promise<void> {
  const { error } = await supabase.from("settings").upsert(
    {
      team_id: teamId,
      nomination_channel_id: channelId,
      nomination_channel_name: channelName,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "team_id" },
  );

  if (error) throw error;
}
