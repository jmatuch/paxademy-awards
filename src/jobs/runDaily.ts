import type { WebClient } from "@slack/web-api";
import type { DateTime } from "luxon";
import { TEAM_ID } from "../lib/constants.js";
import {
  isFirstOfMonth,
  isJan1,
  monthlyRecapJobKey,
  shouldRunSixAmJob,
  thisDateJobKey,
  yearlyTop3JobKey,
} from "../lib/time.js";
import { getSettings } from "../db/settings.js";
import { getStatus, markError, markOk } from "../db/jobRuns.js";
import { runThisDate } from "./thisDate.js";
import { runMonthlyRecap } from "./monthlyRecap.js";
import { runYearlyTop3 } from "./yearlyRecap.js";

export type JobName = "this_date" | "monthly_recap" | "yearly_top3";
export type JobResult = "ok" | "error" | "skipped";

export interface RunDailyParams {
  now: DateTime;
  force?: JobName;
}

// Idempotency always applies, even when forced -- `force` only bypasses the
// *schedule* gate (running on a day/time a job wouldn't naturally fire), not
// duplicate-prevention. Otherwise two identical `force` calls (e.g. the
// acceptance check for "two triggers on the same day post once") would post
// twice, and a real operator re-hitting the endpoint could spam the channel.
async function runJob(
  jobKey: string,
  run: () => Promise<void>,
): Promise<JobResult> {
  const status = await getStatus(jobKey);
  if (status === "ok") return "skipped";
  try {
    await run();
    await markOk(jobKey);
    return "ok";
  } catch (error) {
    await markError(
      jobKey,
      error instanceof Error ? error.message : String(error),
    );
    return "error";
  }
}

export async function runDaily(
  client: WebClient,
  { now, force }: RunDailyParams,
): Promise<Record<string, JobResult>> {
  if (!force && !shouldRunSixAmJob(now)) {
    return {};
  }

  const settings = await getSettings(TEAM_ID);
  const channelId = settings.nominationChannelId;

  const shouldRunThisDate = force === "this_date" || !force;
  const shouldRunMonthly =
    force === "monthly_recap" || (!force && isFirstOfMonth(now));
  const shouldRunYearly = force === "yearly_top3" || (!force && isJan1(now));

  const results: Record<string, JobResult> = {};

  if (!channelId) {
    if (shouldRunThisDate) results.this_date = "error";
    if (shouldRunMonthly) results.monthly_recap = "error";
    if (shouldRunYearly) results.yearly_top3 = "error";
    return results;
  }

  if (shouldRunThisDate) {
    results.this_date = await runJob(thisDateJobKey(now), () =>
      runThisDate(client, { now, teamId: TEAM_ID, channelId }),
    );
  }

  // Jan 1 runs monthly (December) before yearly, sequentially -- the one
  // place sub-jobs must not run concurrently (spec §7).
  if (shouldRunMonthly) {
    results.monthly_recap = await runJob(monthlyRecapJobKey(now), () =>
      runMonthlyRecap(client, { now, teamId: TEAM_ID, channelId }),
    );
  }
  if (shouldRunYearly) {
    results.yearly_top3 = await runJob(yearlyTop3JobKey(now), () =>
      runYearlyTop3(client, { now, teamId: TEAM_ID, channelId }),
    );
  }

  return results;
}
