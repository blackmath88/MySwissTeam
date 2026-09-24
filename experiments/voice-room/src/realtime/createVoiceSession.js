export const VOICE_SESSION_STATES = Object.freeze([
  "connecting",
  "listening",
  "user_speaking",
  "thinking",
  "agent_speaking",
  "interrupted",
  "error",
]);

const OPEN_TIMEOUT_MS = 15_000;

function noop() {}

function defaultRuntime() {
  return {
    RTCPeerConnection: globalThis.RTCPeerConnection,
    mediaDevices: globalThis.navigator?.mediaDevices,
    fetch: globalThis.fetch,
    createAudioElement: () => document.createElement("audio"),
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };
}

function normalizeError(error, fallbackMessage) {
  if (error instanceof Error) return error;
  return new Error(fallbackMessage, { cause: error });
}

/**
 * Minimal frontend seam for EO-01 and EO-04.
 *
 * Transcript callback payloads are:
 * `{ role: "user" | "assistant", text, final, event }`.
 * The remote MediaStream is both played internally and passed unchanged to
 * `onRemoteAudioStream` so EO-04 can attach its analyser.
 */
export function createVoiceSession(
  {
    onStateChange = noop,
    onTranscript = noop,
    onRemoteAudioStream = noop,
    onError = noop,
    sessionEndpoint = "/session",
  } = {},
  runtimeOverrides = {},
) {
  const runtime = { ...defaultRuntime(), ...runtimeOverrides };

  let state = null;
  let peerConnection = null;
  let dataChannel = null;
  let localStream = null;
  let remoteStream = null;
  let audioElement = null;
  let responseActive = false;
  let deliberatelyDisconnected = false;
  let connectPromise = null;

  function setState(nextState) {
    if (!VOICE_SESSION_STATES.includes(nextState)) {
      throw new Error(`Unsupported voice session state: ${nextState}`);
    }
    if (state === nextState) return;
    state = nextState;
    onStateChange(nextState);
  }

  function reportError(error, fallbackMessage) {
    const normalized = normalizeError(error, fallbackMessage);
    setState("error");
    onError(normalized);
    return normalized;
  }

  function emitTranscript(role, text, final, event) {
    if (!text) return;
    onTranscript({ role, text, final, event });
  }

  function handleRealtimeEvent(event) {
    switch (event.type) {
      case "session.created":
      case "session.updated":
        if (state === "connecting") setState("listening");
        break;

      case "input_audio_buffer.speech_started":
        if (responseActive || state === "agent_speaking") {
          responseActive = false;
          setState("interrupted");
        }
        setState("user_speaking");
        break;

      case "input_audio_buffer.speech_stopped":
        setState("thinking");
        break;

      case "response.created":
        responseActive = true;
        setState("thinking");
        break;

      case "response.output_audio.delta":
        responseActive = true;
        setState("agent_speaking");
        break;

      case "conversation.item.input_audio_transcription.delta":
        emitTranscript("user", event.delta, false, event);
        break;

      case "conversation.item.input_audio_transcription.completed":
        emitTranscript("user", event.transcript, true, event);
        break;

      case "response.output_audio_transcript.delta":
        responseActive = true;
        setState("agent_speaking");
        emitTranscript("assistant", event.delta, false, event);
        break;

      case "response.output_audio_transcript.done":
        emitTranscript("assistant", event.transcript, true, event);
        break;

      case "response.done": {
        const wasCancelled = event.response?.status === "cancelled";
        responseActive = false;
        if (wasCancelled && state !== "user_speaking") {
          setState("interrupted");
        }
        if (state !== "user_speaking") setState("listening");
        break;
      }

      case "error":
        reportError(
          new Error(event.error?.message || "OpenAI Realtime session error."),
          "OpenAI Realtime session error.",
        );
        break;

      default:
        break;
    }
  }

  function handleDataMessage(messageEvent) {
    try {
      handleRealtimeEvent(JSON.parse(messageEvent.data));
    } catch (error) {
      reportError(error, "Received an invalid Realtime event.");
    }
  }

  function stopMedia() {
    for (const track of localStream?.getTracks?.() || []) track.stop();
    localStream = null;

    if (audioElement) {
      audioElement.pause?.();
      audioElement.srcObject = null;
      audioElement.remove?.();
      audioElement = null;
    }
    remoteStream = null;
  }

  function disconnect() {
    deliberatelyDisconnected = true;
    connectPromise = null;
    responseActive = false;

    if (dataChannel) {
      dataChannel.removeEventListener?.("message", handleDataMessage);
      dataChannel.close();
      dataChannel = null;
    }

    stopMedia();
    peerConnection?.close();
    peerConnection = null;
    state = null;
  }

  async function openSession() {
    deliberatelyDisconnected = false;
    setState("connecting");

    if (!runtime.RTCPeerConnection) {
      throw new Error("WebRTC is not supported in this browser.");
    }
    if (!runtime.mediaDevices?.getUserMedia) {
      throw new Error("Microphone capture is not supported in this browser.");
    }
    if (!runtime.fetch) {
      throw new Error("Fetch is not supported in this browser.");
    }

    const pc = new runtime.RTCPeerConnection();
    peerConnection = pc;

    audioElement = runtime.createAudioElement();
    audioElement.autoplay = true;
    audioElement.playsInline = true;

    pc.addEventListener("track", (event) => {
      const stream = event.streams?.[0];
      if (!stream) return;
      remoteStream = stream;
      audioElement.srcObject = stream;
      audioElement.play?.().catch((error) => {
        reportError(error, "Remote audio playback was blocked.");
      });
      onRemoteAudioStream(stream);
    });

    pc.addEventListener("connectionstatechange", () => {
      if (deliberatelyDisconnected) return;
      if (pc.connectionState === "connected" && state === "connecting") {
        setState("listening");
      }
      if (["failed", "disconnected"].includes(pc.connectionState)) {
        reportError(
          new Error(`WebRTC connection ${pc.connectionState}.`),
          "WebRTC connection failed.",
        );
      }
    });

    localStream = await runtime.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    for (const track of localStream.getAudioTracks()) {
      pc.addTrack(track, localStream);
    }

    const dc = pc.createDataChannel("oai-events");
    dataChannel = dc;
    dc.addEventListener("message", handleDataMessage);

    const opened = new Promise((resolve, reject) => {
      const timeout = runtime.setTimeout(() => {
        reject(new Error("Realtime data channel timed out."));
      }, OPEN_TIMEOUT_MS);

      dc.addEventListener(
        "open",
        () => {
          runtime.clearTimeout(timeout);
          setState("listening");
          resolve();
        },
        { once: true },
      );

      dc.addEventListener(
        "error",
        () => {
          runtime.clearTimeout(timeout);
          reject(new Error("Realtime data channel failed to open."));
        },
        { once: true },
      );
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sessionResponse = await runtime.fetch(sessionEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: offer.sdp,
    });
    const answerSdp = await sessionResponse.text();

    if (!sessionResponse.ok) {
      throw new Error(
        `Realtime session request failed (${sessionResponse.status}): ${answerSdp}`,
      );
    }

    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    await opened;
  }

  function connect() {
    if (connectPromise) return connectPromise;
    connectPromise = openSession().catch((error) => {
      const normalized = reportError(error, "Unable to connect voice session.");
      disconnect();
      state = "error";
      throw normalized;
    });
    return connectPromise;
  }

  async function reconnect() {
    disconnect();
    return connect();
  }

  function sendEvent(event) {
    if (dataChannel?.readyState !== "open") {
      throw new Error("Realtime data channel is not open.");
    }
    dataChannel.send(
      JSON.stringify({ event_id: crypto.randomUUID(), ...event }),
    );
  }

  return {
    connect,
    disconnect,
    reconnect,
    sendEvent,
    getState: () => state,
    getLocalAudioStream: () => localStream,
    getRemoteAudioStream: () => remoteStream,
  };
}
