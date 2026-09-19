import { z } from "zod";

const envSchema = z.object({
  SLACK_BOT_TOKEN: z.string().min(1),
  SLACK_SIGNING_SECRET: z.string().min(1),
  SUPABASE_URL: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
});

export const env = envSchema.parse(process.env);
