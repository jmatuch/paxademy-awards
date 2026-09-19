import { createHandler } from "@vercel/slack-bolt";
import { app, receiver } from "../src/bolt/app.js";
import { toNodeHandler } from "../src/lib/vercelNodeAdapter.js";

export default toNodeHandler(createHandler(app, receiver));
