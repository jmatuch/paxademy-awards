import { supabase } from "./client.js";

export async function upsertReaction(
  nominationId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  const { error } = await supabase.from("nomination_reactions").upsert(
    { nomination_id: nominationId, user_id: userId, emoji },
    { onConflict: "nomination_id,user_id,emoji" },
  );

  if (error) throw error;
}

export async function replaceReactionsForNomination(
  nominationId: string,
  entries: { userId: string; emoji: string }[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("nomination_reactions")
    .delete()
    .eq("nomination_id", nominationId);

  if (deleteError) throw deleteError;
  if (entries.length === 0) return;

  const { error } = await supabase.from("nomination_reactions").insert(
    entries.map((e) => ({
      nomination_id: nominationId,
      user_id: e.userId,
      emoji: e.emoji,
    })),
  );

  if (error) throw error;
}

export async function deleteReaction(
  nominationId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  const { error } = await supabase
    .from("nomination_reactions")
    .delete()
    .eq("nomination_id", nominationId)
    .eq("user_id", userId)
    .eq("emoji", emoji);

  if (error) throw error;
}
