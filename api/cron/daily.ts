import { env } from "../../src/lib/env.js";
import { toNodeHandler } from "../../src/lib/vercelNodeAdapter.js";

// Stub: bearer-auth check wired now, real sub-job orchestration lands in Phase 8
// (src/jobs/runDaily.ts).
async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  return new Response("Not implemented", { status: 501 });
}

export default toNodeHandler(handler);
