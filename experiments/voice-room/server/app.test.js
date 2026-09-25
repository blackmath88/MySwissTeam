import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "./app.js";

async function withServer(app, run) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("session endpoint refuses to run without a server key", async () => {
  await withServer(createApp({ apiKey: "" }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: "offer-sdp",
    });

    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /not configured/i);
  });
});

test("session endpoint keeps the key server-side and returns SDP", async () => {
  let upstreamRequest;
  const fetchImpl = async (url, options) => {
    upstreamRequest = { url, options };
    return new Response("answer-sdp", {
      status: 200,
      headers: { "Content-Type": "application/sdp" },
    });
  };

  await withServer(
    createApp({ apiKey: "server-only-key", fetchImpl }),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: "offer-sdp",
      });

      assert.equal(response.status, 200);
      assert.equal(await response.text(), "answer-sdp");
    },
  );

  assert.equal(
    upstreamRequest.url,
    "https://api.openai.com/v1/realtime/calls",
  );
  assert.equal(
    upstreamRequest.options.headers.Authorization,
    "Bearer server-only-key",
  );
  assert.equal(upstreamRequest.options.body.get("sdp"), "offer-sdp");
  assert.equal(
    upstreamRequest.options.body.get("session").includes("server-only-key"),
    false,
  );
});

test("server hosts the experience and session endpoint on one safe origin", async () => {
  await withServer(createApp({ apiKey: "" }), async (baseUrl) => {
    const page = await fetch(`${baseUrl}/?voice=realtime`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>Gschwätz<\/title>/);

    const appModule = await fetch(`${baseUrl}/src/App.js`);
    assert.equal(appModule.status, 200);

    const envFile = await fetch(`${baseUrl}/.env`);
    assert.equal(envFile.status, 404);

    const serverSource = await fetch(`${baseUrl}/server/app.js`);
    assert.equal(serverSource.status, 404);
  });
});
