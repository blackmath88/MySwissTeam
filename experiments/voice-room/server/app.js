import express from "express";

import { createSessionConfig } from "./sessionConfig.js";

const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

export function createApp({
  apiKey = process.env.OPENAI_API_KEY,
  environment = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    express.text({
      type: ["application/sdp", "text/plain"],
      limit: "1mb",
    }),
  );

  app.get("/health", (_request, response) => {
    response.json({ ok: true, realtimeConfigured: Boolean(apiKey) });
  });

  app.post("/session", async (request, response) => {
    if (!apiKey) {
      response.status(503).json({
        error: "OPENAI_API_KEY is not configured on the server.",
      });
      return;
    }

    if (typeof request.body !== "string" || !request.body.trim()) {
      response.status(400).json({ error: "Expected an SDP offer." });
      return;
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 20_000);

    try {
      const form = new FormData();
      form.set("sdp", request.body);
      form.set("session", JSON.stringify(createSessionConfig(environment)));

      const openAIResponse = await fetchImpl(OPENAI_REALTIME_CALLS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
        signal: abortController.signal,
      });

      const body = await openAIResponse.text();

      if (!openAIResponse.ok) {
        response.status(openAIResponse.status).json({
          error: "OpenAI Realtime session creation failed.",
          details: body.slice(0, 1_000),
        });
        return;
      }

      response.status(200).type("application/sdp").send(body);
    } catch (error) {
      const timedOut = error?.name === "AbortError";
      response.status(timedOut ? 504 : 502).json({
        error: timedOut
          ? "OpenAI Realtime session creation timed out."
          : "Unable to create an OpenAI Realtime session.",
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  return app;
}
