import assert from "node:assert/strict";
import test from "node:test";

import { createVoiceSession } from "./createVoiceSession.js";

class FakeDataChannel extends EventTarget {
  constructor() {
    super();
    this.readyState = "connecting";
    this.sent = [];
  }

  open() {
    this.readyState = "open";
    this.dispatchEvent(new Event("open"));
  }

  emitMessage(payload) {
    const event = new Event("message");
    Object.defineProperty(event, "data", { value: JSON.stringify(payload) });
    this.dispatchEvent(event);
  }

  send(payload) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = "closed";
  }
}

class FakePeerConnection extends EventTarget {
  static instances = [];

  constructor() {
    super();
    this.connectionState = "new";
    this.channel = new FakeDataChannel();
    this.senders = [];
    FakePeerConnection.instances.push(this);
  }

  addTrack(track) {
    this.senders.push({ track });
  }

  createDataChannel() {
    return this.channel;
  }

  async createOffer() {
    return { type: "offer", sdp: "offer-sdp" };
  }

  async setLocalDescription(description) {
    this.localDescription = description;
  }

  async setRemoteDescription(description) {
    this.remoteDescription = description;
    queueMicrotask(() => this.channel.open());
  }

  emitRemoteStream(stream) {
    const event = new Event("track");
    Object.defineProperty(event, "streams", { value: [stream] });
    this.dispatchEvent(event);
  }

  close() {
    this.connectionState = "closed";
  }
}

function createRuntime() {
  const tracks = [{ stopped: false, stop() { this.stopped = true; } }];
  const localStream = {
    tracks,
    getTracks: () => tracks,
    getAudioTracks: () => tracks,
  };
  const audioElement = {
    autoplay: false,
    playsInline: false,
    srcObject: null,
    play: async () => {},
    pause: () => {},
    remove: () => {},
  };

  return {
    localStream,
    audioElement,
    runtime: {
      RTCPeerConnection: FakePeerConnection,
      mediaDevices: { getUserMedia: async () => localStream },
      fetch: async (_url, request) => {
        assert.equal(request.body, "offer-sdp");
        assert.equal(request.headers["Content-Type"], "application/sdp");
        return new Response("answer-sdp", { status: 200 });
      },
      createAudioElement: () => audioElement,
      setTimeout,
      clearTimeout,
    },
  };
}

test("adapter connects, exposes audio, transcripts two-way, and maps VAD states", async () => {
  FakePeerConnection.instances = [];
  const states = [];
  const transcripts = [];
  const remoteStreams = [];
  const { runtime } = createRuntime();

  const session = createVoiceSession(
    {
      onStateChange: (state) => states.push(state),
      onTranscript: (transcript) => transcripts.push(transcript),
      onRemoteAudioStream: (stream) => remoteStreams.push(stream),
    },
    runtime,
  );

  await session.connect();
  const peer = FakePeerConnection.instances[0];
  const channel = peer.channel;

  assert.deepEqual(states.slice(0, 2), ["connecting", "listening"]);
  assert.deepEqual(peer.remoteDescription, {
    type: "answer",
    sdp: "answer-sdp",
  });

  const remoteStream = { id: "remote" };
  peer.emitRemoteStream(remoteStream);
  assert.equal(session.getRemoteAudioStream(), remoteStream);
  assert.deepEqual(remoteStreams, [remoteStream]);

  channel.emitMessage({ type: "input_audio_buffer.speech_started" });
  channel.emitMessage({
    type: "conversation.item.input_audio_transcription.completed",
    transcript: "Hello",
  });
  channel.emitMessage({ type: "input_audio_buffer.speech_stopped" });
  channel.emitMessage({ type: "response.created" });
  channel.emitMessage({
    type: "response.output_audio_transcript.delta",
    delta: "Hi",
  });
  channel.emitMessage({
    type: "response.output_audio_transcript.done",
    transcript: "Hi there",
  });
  channel.emitMessage({ type: "response.done", response: { status: "completed" } });

  assert.deepEqual(states.slice(-4), [
    "user_speaking",
    "thinking",
    "agent_speaking",
    "listening",
  ]);
  assert.equal(transcripts[0].role, "user");
  assert.equal(transcripts[0].text, "Hello");
  assert.equal(transcripts.at(-1).role, "assistant");
  assert.equal(transcripts.at(-1).final, true);

  channel.emitMessage({ type: "response.created" });
  channel.emitMessage({ type: "response.output_audio.delta", delta: "ignored" });
  channel.emitMessage({ type: "input_audio_buffer.speech_started" });
  assert.deepEqual(states.slice(-3), [
    "agent_speaking",
    "interrupted",
    "user_speaking",
  ]);

  session.disconnect();
});

test("disconnect stops the microphone and reconnect creates a fresh peer", async () => {
  FakePeerConnection.instances = [];
  const first = createRuntime();
  const session = createVoiceSession({}, first.runtime);

  await session.connect();
  session.disconnect();
  assert.equal(first.localStream.tracks[0].stopped, true);

  await session.reconnect();
  assert.equal(FakePeerConnection.instances.length, 2);
  assert.equal(session.getState(), "listening");
  session.disconnect();
});
