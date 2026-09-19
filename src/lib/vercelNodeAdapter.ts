import type { IncomingMessage, ServerResponse } from "node:http";
import { buffer } from "node:stream/consumers";

type WebHandler = (req: Request) => Promise<Response>;

// Plain (non-framework) Vercel Node.js functions are invoked with the
// classic (req, res) signature, not a Web-standard Request/Response, even
// with Fluid Compute enabled -- that conversion is normally done by a
// framework's own adapter (Next.js, Hono, Nitro), none of which we use.
// This wraps a Web-standard handler so it can be used as a Vercel function.
export function toNodeHandler(handler: WebHandler) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const host = req.headers.host ?? "localhost";
    const url = `https://${host}${req.url ?? "/"}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    const method = req.method ?? "GET";
    const hasBody = method !== "GET" && method !== "HEAD";
    const body = hasBody ? await buffer(req) : undefined;

    const webRequest = new Request(url, { method, headers, body });
    const webResponse = await handler(webRequest);

    res.statusCode = webResponse.status;
    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = Buffer.from(await webResponse.arrayBuffer());
    res.end(responseBody);
  };
}
