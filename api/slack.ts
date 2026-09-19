import { createHandler } from "@vercel/slack-bolt";
import { app, receiver } from "../src/bolt/app.js";

export default createHandler(app, receiver);
