const DEFAULT_MODEL = "gpt-realtime";
const DEFAULT_VOICE = "marin";

export function createSessionConfig(environment = process.env) {
  return {
    type: "realtime",
    model: environment.OPENAI_REALTIME_MODEL || DEFAULT_MODEL,
    output_modalities: ["audio"],
    audio: {
      input: {
        transcription: {
          model: "gpt-4o-mini-transcribe",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
          interrupt_response: true,
        },
      },
      output: {
        voice: environment.OPENAI_REALTIME_VOICE || DEFAULT_VOICE,
      },
    },
  };
}
