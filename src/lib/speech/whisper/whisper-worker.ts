/**
 * Web Worker hosting the transformers.js Whisper pipeline. Runs off the UI
 * thread; the model stays in memory after the first load. All model and ONNX
 * runtime files are served locally from `/models/` (Vite middleware in dev,
 * the `app://` protocol in the packaged app) — remote loading is disabled so
 * the app never phones home.
 *
 * Protocol (messages from `worker-transcriber.ts`):
 *   in:  { type: 'transcribe', id, pcm: Float32Array }   16kHz mono PCM
 *   out: { type: 'partial', id, text }                   while decoding
 *        { type: 'final',   id, text }
 *        { type: 'error',   id, message }
 */

import {
  env,
  pipeline,
  WhisperTextStreamer,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';

env.allowLocalModels = true; // off by default in browser builds
env.allowRemoteModels = false;
env.localModelPath = '/models/';
// The models load from local disk in a few hundred ms; the Cache API also
// rejects the app:// scheme in the packaged build, logging a warning per file.
env.useBrowserCache = false;
if (env.backends.onnx?.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/models/ort/';
}

const MODEL = 'whisper-base.en';

export interface TranscribeRequest {
  type: 'transcribe';
  id: number;
  pcm: Float32Array;
}

export type TranscribeResponse =
  | { type: 'partial'; id: number; text: string }
  | { type: 'final'; id: number; text: string }
  | { type: 'error'; id: number; message: string };

let pipelinePromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

function getPipeline(): Promise<AutomaticSpeechRecognitionPipeline> {
  pipelinePromise ??= pipeline('automatic-speech-recognition', MODEL, {
    dtype: 'q8',
  }).catch((e: unknown) => {
    // Allow a retry on the next utterance instead of caching the failure.
    pipelinePromise = null;
    throw new Error(
      `Speech model failed to load: ${e instanceof Error ? e.message : String(e)}`,
    );
  });
  return pipelinePromise;
}

const post = (message: TranscribeResponse) => self.postMessage(message);

self.onmessage = async ({ data }: MessageEvent<TranscribeRequest>) => {
  if (data.type !== 'transcribe') return;
  const { id, pcm } = data;
  try {
    const transcriber = await getPipeline();

    // Stream decoded words back as they are produced. The ASR pipeline types
    // its tokenizer as the base class, but it is a WhisperTokenizer at runtime.
    const tokenizer =
      transcriber.tokenizer as ConstructorParameters<typeof WhisperTextStreamer>[0];
    let partial = '';
    const streamer = new WhisperTextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        partial += text;
        post({ type: 'partial', id, text: partial });
      },
    });

    const output = await transcriber(pcm, { streamer });
    const result = Array.isArray(output) ? output[0] : output;
    post({ type: 'final', id, text: result.text ?? '' });
  } catch (e) {
    post({
      type: 'error',
      id,
      message: e instanceof Error ? e.message : String(e),
    });
  }
};
