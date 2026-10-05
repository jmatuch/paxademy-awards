import { supabase } from "./client.js";

export type JobStatus = "ok" | "error";

export async function getStatus(jobKey: string): Promise<JobStatus | null> {
  const { data, error } = await supabase
    .from("job_runs")
    .select("status")
    .eq("job_key", jobKey)
    .maybeSingle();

  if (error) throw error;
  return (data?.status as JobStatus | undefined) ?? null;
}

export async function markOk(jobKey: string, detail?: string): Promise<void> {
  const { error } = await supabase.from("job_runs").upsert(
    {
      job_key: jobKey,
      status: "ok",
      detail: detail ?? null,
      ran_at: new Date().toISOString(),
    },
    { onConflict: "job_key" },
  );

  if (error) throw error;
}

export async function markError(jobKey: string, detail: string): Promise<void> {
  const { error } = await supabase.from("job_runs").upsert(
    {
      job_key: jobKey,
      status: "error",
      detail,
      ran_at: new Date().toISOString(),
    },
    { onConflict: "job_key" },
  );

  if (error) throw error;
}
