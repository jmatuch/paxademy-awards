import { supabase } from "./client.js";

export async function getHideIntro(
  teamId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_prefs")
    .select("hide_intro")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.hide_intro ?? false;
}

export async function setHideIntro(
  teamId: string,
  userId: string,
  value: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("user_prefs")
    .upsert(
      { team_id: teamId, user_id: userId, hide_intro: value },
      { onConflict: "team_id,user_id" },
    );

  if (error) throw error;
}
