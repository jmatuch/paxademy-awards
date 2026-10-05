import { DateTime } from "luxon";
import { env } from "../../src/lib/env.js";
import { TIMEZONE } from "../../src/lib/time.js";
import { slackClient } from "../../src/lib/slackClient.js";
import { toNodeHandler } from "../../src/lib/vercelNodeAdapter.js";
import { runDaily, type JobName } from "../../src/jobs/runDaily.js";

const VALID_JOBS: JobName[] = ["this_date", "monthly_recap", "yearly_top3"];

function isJobName(value: string | null): value is JobName {
  return VALID_JOBS.includes(value as JobName);
}

async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const forceParam = url.searchParams.get("force");
  const dateParam = url.searchParams.get("date");

  const force = isJobName(forceParam) ? forceParam : undefined;
  const now = dateParam
    ? DateTime.fromISO(dateParam, { zone: TIMEZONE })
    : DateTime.now().setZone(TIMEZONE);

  if (!now.isValid) {
    return new Response(`Invalid date: ${now.invalidExplanation}`, {
      status: 400,
    });
  }

  const results = await runDaily(slackClient, { now, force });

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export default toNodeHandler(handler);
