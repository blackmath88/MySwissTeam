import assert from "node:assert/strict";
import test from "node:test";

import { createSessionConfig } from "./sessionConfig.js";

test("session config enables hands-free VAD and barge-in", () => {
  const config = createSessionConfig({
    OPENAI_REALTIME_MODEL: "test-model",
    OPENAI_REALTIME_VOICE: "test-voice",
    OPENAI_API_KEY: "must-not-appear",
  });

  assert.equal(config.type, "realtime");
  assert.equal(config.model, "test-model");
  assert.equal(config.audio.output.voice, "test-voice");
  assert.deepEqual(config.output_modalities, ["audio"]);
  assert.deepEqual(config.audio.input.turn_detection, {
    type: "server_vad",
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
    create_response: true,
    interrupt_response: true,
  });
  assert.equal(JSON.stringify(config).includes("must-not-appear"), false);
});
