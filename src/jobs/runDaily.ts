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

async function runJob(
  jobKey: string,
  force: boolean,
  run: () => Promise<void>,
): Promise<JobResult> {
  if (!force) {
    const status = await getStatus(jobKey);
    if (status === "ok") return "skipped";
  }
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
    results.this_date = await runJob(thisDateJobKey(now), Boolean(force), () =>
      runThisDate(client, { now, teamId: TEAM_ID, channelId }),
    );
  }

  // Jan 1 runs monthly (December) before yearly, sequentially -- the one
  // place sub-jobs must not run concurrently (spec §7).
  if (shouldRunMonthly) {
    results.monthly_recap = await runJob(
      monthlyRecapJobKey(now),
      Boolean(force),
      () => runMonthlyRecap(client, { now, teamId: TEAM_ID, channelId }),
    );
  }
  if (shouldRunYearly) {
    results.yearly_top3 = await runJob(
      yearlyTop3JobKey(now),
      Boolean(force),
      () => runYearlyTop3(client, { now, teamId: TEAM_ID, channelId }),
    );
  }

  return results;
}
