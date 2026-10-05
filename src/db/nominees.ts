import { supabase } from "./client.js";

export async function attachNominees(
  nominationId: string,
  nominees: { userId: string; displayName: string | null }[],
): Promise<void> {
  const { error } = await supabase.from("nomination_nominees").insert(
    nominees.map((n) => ({
      nomination_id: nominationId,
      user_id: n.userId,
      display_name: n.displayName,
    })),
  );

  if (error) throw error;
}

export async function replaceNominees(
  nominationId: string,
  nominees: { userId: string; displayName: string | null }[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("nomination_nominees")
    .delete()
    .eq("nomination_id", nominationId);

  if (deleteError) throw deleteError;
  await attachNominees(nominationId, nominees);
}
