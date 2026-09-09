// ==== Settings ====
var VERCEL_TOKEN_URL = "https://youomni-github-io.vercel.app/api/chat";

var SOCKET = null;
var AUDIO_CONTEXT = null;
var MIC_STREAM = null;
var IS_TALKING = false;

var WORKLET_NODE = null;

// Pre-fetched Token Cache
var CACHED_TOKEN = null;
var TOKEN_FETCH_PROMISE = null;

// Playback state
var PLAYBACK_CONTEXT = null;
var PLAYBACK_TIME = 0;
var PLAYBACK_GAIN = null;
var SCHEDULED_SOURCES = [];
var OUTPUT_VOLUME = 2.0;

const SYSTEM_INSTRUCTION_TEXT = `
TEXT HERE

`;

// Inline AudioWorklet code string with speech volume detection
const WORKLET_CODE = `
class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.targetBufferSize = 1600; // ~100ms chunks at 16kHz
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const float32Data = input[0];
      
      let sum = 0;
      for (let i = 0; i < float32Data.length; i++) {
        sum += float32Data[i] * float32Data[i];
      }
      const rms = Math.sqrt(sum / float32Data.length);

      for (let i = 0; i < float32Data.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Data[i]));
        this.buffer.push(s < 0 ? s * 0x8000 : s * 0x7FFF);
      }

      if (this.buffer.length >= this.targetBufferSize) {
        const int16Data = new Int16Array(this.buffer);
        this.port.postMessage({
          pcm: int16Data,
          rms: rms
        });
        this.buffer = [];
      }
    }
    return true;
  }
}
registerProcessor('mic-processor', MicProcessor);
`;

function prefetchToken() {
  if (TOKEN_FETCH_PROMISE) return TOKEN_FETCH_PROMISE;
  
  TOKEN_FETCH_PROMISE = fetch(VERCEL_TOKEN_URL)
    .then((RESP) => RESP.json())
    .then((DATA) => {
      if (DATA.token) {
        CACHED_TOKEN = DATA.token;
        return DATA.token;
      }
      throw new Error("No token returned");
    })
    .catch((ERR) => {
      console.error("Token prefetch error:", ERR);
      TOKEN_FETCH_PROMISE = null;
    });

  return TOKEN_FETCH_PROMISE;
}

prefetchToken();

async function startTalking() {
  if (IS_TALKING) return;
  IS_TALKING = true;

  try {
    const TOKEN_PROMISE = CACHED_TOKEN ? Promise.resolve(CACHED_TOKEN) : prefetchToken();
    const MIC_PROMISE = startMic();

    const [TOKEN] = await Promise.all([TOKEN_PROMISE, MIC_PROMISE]);

    if (!TOKEN) {
      console.error("No valid ephemeral token available.");
      IS_TALKING = false;
      return;
    }

    CACHED_TOKEN = null;
    TOKEN_FETCH_PROMISE = null;

    const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${TOKEN}`;
    SOCKET = new WebSocket(GEMINI_WS_URL);

    SOCKET.onopen = () => {
      console.log("WebSocket connected to Gemini");

      const SETUP_PAYLOAD = {
        setup: {
          model: "models/gemini-3.1-flash-live-preview",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Puck"
                }
              }
            }
          },
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION_TEXT }]
          }
        }
      };

      SOCKET.send(JSON.stringify(SETUP_PAYLOAD));

      const GREETING_PAYLOAD = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [
                { text: "Hello! Please introduce yourself and start reading Lesson 1 according to your instructions." }
              ]
            }
          ],
          turnComplete: true
        }
      };

      SOCKET.send(JSON.stringify(GREETING_PAYLOAD));

      setTimeout(prefetchToken, 1000);
    };

    SOCKET.onmessage = async (EVENT) => {
      let DATA_TEXT = EVENT.data;
      if (DATA_TEXT instanceof Blob) {
        DATA_TEXT = await DATA_TEXT.text();
      } else if (DATA_TEXT instanceof ArrayBuffer) {
        DATA_TEXT = new TextDecoder().decode(DATA_TEXT);
      }
      handleServerMessage(DATA_TEXT);
    };

    SOCKET.onclose = (EVENT) => {
      console.log("WebSocket closed:", EVENT.code, EVENT.reason);
      stopMic();
    };

    SOCKET.onerror = (ERR) => {
      console.error("WebSocket error:", ERR);
    };
  } catch (E) {
    console.error("Failed to initialize session:", E);
    IS_TALKING = false;
  }
}

async function stopTalking() {
  if (!IS_TALKING) return;
  IS_TALKING = false;

  await stopMic();
  stopPlayback();

  if (PLAYBACK_CONTEXT) {
    try {
      await PLAYBACK_CONTEXT.close();
    } catch (E) {
      console.error("Error closing PLAYBACK_CONTEXT:", E);
    }
    PLAYBACK_CONTEXT = null;
  }

  if (SOCKET) {
    SOCKET.onclose = null; // Remove listener to avoid duplicate stopMic calls
    SOCKET.close();
    SOCKET = null;
  }

  prefetchToken(); // Warm up token for the next press
}

window.startTalking = startTalking;
window.stopTalking = stopTalking;

// =========================
// MICROPHONE (AudioWorklet)
// =========================
async function startMic() {
  if (MIC_STREAM) return;

  MIC_STREAM = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  AUDIO_CONTEXT = new AudioContext({ sampleRate: 16000 });

  if (AUDIO_CONTEXT.state === "suspended") {
    await AUDIO_CONTEXT.resume();
  }

  const BLOB = new Blob([WORKLET_CODE], { type: "application/javascript" });
  const WORKLET_URL = URL.createObjectURL(BLOB);
  await AUDIO_CONTEXT.audioWorklet.addModule(WORKLET_URL);

  const SOURCE = AUDIO_CONTEXT.createMediaStreamSource(MIC_STREAM);

  WORKLET_NODE = new AudioWorkletNode(AUDIO_CONTEXT, "mic-processor");

  WORKLET_NODE.port.onmessage = (EVENT) => {
    if (!IS_TALKING || !SOCKET || SOCKET.readyState !== WebSocket.OPEN) return;

    const PCM16_DATA = EVENT.data.pcm;
    const RMS = EVENT.data.rms;

    const IS_USER_SPEAKING = RMS > 0.035;

    if (IS_USER_SPEAKING && SCHEDULED_SOURCES.length > 0) {
      stopPlayback();
    }

    const BASE64_DATA = arrayBufferToBase64(PCM16_DATA.buffer);

    const AUDIO_PAYLOAD = {
      realtimeInput: {
        audio: {
          mimeType: "audio/pcm;rate=16000",
          data: BASE64_DATA
        }
      }
    };

    SOCKET.send(JSON.stringify(AUDIO_PAYLOAD));
  };

  SOURCE.connect(WORKLET_NODE);
  WORKLET_NODE.connect(AUDIO_CONTEXT.destination);
}

async function stopMic() {
  if (WORKLET_NODE) {
    WORKLET_NODE.disconnect();
    WORKLET_NODE = null;
  }

  if (MIC_STREAM) {
    MIC_STREAM.getTracks().forEach((T) => T.stop());
    MIC_STREAM = null;
  }

  if (AUDIO_CONTEXT) {
    try {
      await AUDIO_CONTEXT.close();
    } catch (E) {
      console.error("Error closing AUDIO_CONTEXT:", E);
    }
    AUDIO_CONTEXT = null;
  }
}

function arrayBufferToBase64(BUFFER) {
  let BINARY = "";
  const BYTES = new Uint8Array(BUFFER);
  for (let I = 0; I < BYTES.byteLength; I++) {
    BINARY += String.fromCharCode(BYTES[I]);
  }
  return btoa(BINARY);
}

// =========================
// SERVER AUDIO HANDLING
// =========================
function handleServerMessage(RAW_DATA) {
  let MESSAGE;
  try {
    MESSAGE = JSON.parse(RAW_DATA);
  } catch (E) {
    console.error("JSON parse error on message:", E, RAW_DATA);
    return;
  }

  if (MESSAGE?.serverContent?.outputTranscription?.text) {
    if (typeof window.advanceFocusToText === "function") {
      window.advanceFocusToText(MESSAGE.serverContent.outputTranscription.text);
    }
  }

  if (MESSAGE?.serverContent?.interrupted) {
    stopPlayback();
    return;
  }

  const PARTS = MESSAGE?.serverContent?.modelTurn?.parts;
  if (!PARTS) return;

  for (const PART of PARTS) {
    const AUDIO_BASE64 = PART?.inlineData?.data;
    if (AUDIO_BASE64) playAudioChunk(AUDIO_BASE64);
  }
}

// =========================
// PLAYBACK
// =========================
function stopPlayback() {
  for (const SOURCE of SCHEDULED_SOURCES) {
    try { SOURCE.stop(); } catch {}
  }
  SCHEDULED_SOURCES = [];
  PLAYBACK_TIME = PLAYBACK_CONTEXT ? PLAYBACK_CONTEXT.currentTime : 0;
}

function playAudioChunk(BASE64_DATA) {
  if (!PLAYBACK_CONTEXT) {
    PLAYBACK_CONTEXT = new AudioContext({ sampleRate: 24000 });
    PLAYBACK_TIME = PLAYBACK_CONTEXT.currentTime;

    PLAYBACK_GAIN = PLAYBACK_CONTEXT.createGain();
    PLAYBACK_GAIN.gain.value = OUTPUT_VOLUME;
    PLAYBACK_GAIN.connect(PLAYBACK_CONTEXT.destination);
  }

  if (PLAYBACK_CONTEXT.state === "suspended") {
    PLAYBACK_CONTEXT.resume();
  }

  const BINARY = atob(BASE64_DATA);
  const BYTES = new Uint8Array(BINARY.length);
  for (let I = 0; I < BINARY.length; I++) {
    BYTES[I] = BINARY.charCodeAt(I);
  }

  const DATA_VIEW = new DataView(BYTES.buffer);
  const INT16_COUNT = Math.floor(BYTES.length / 2);
  const FLOAT32 = new Float32Array(INT16_COUNT);

  for (let I = 0; I < INT16_COUNT; I++) {
    const INT16_VAL = DATA_VIEW.getInt16(I * 2, true);
    FLOAT32[I] = INT16_VAL / 32768.0;
  }

  const BUFFER = PLAYBACK_CONTEXT.createBuffer(1, FLOAT32.length, 24000);
  BUFFER.copyToChannel(FLOAT32, 0);

  const SOURCE = PLAYBACK_CONTEXT.createBufferSource();
  SOURCE.buffer = BUFFER;
  SOURCE.connect(PLAYBACK_GAIN);

  const NOW = PLAYBACK_CONTEXT.currentTime;
  const START_AT = Math.max(NOW, PLAYBACK_TIME);

  SOURCE.start(START_AT);
  PLAYBACK_TIME = START_AT + BUFFER.duration;

  SCHEDULED_SOURCES.push(SOURCE);

  SOURCE.onended = () => {
    SCHEDULED_SOURCES = SCHEDULED_SOURCES.filter((S) => S !== SOURCE);
  };
}