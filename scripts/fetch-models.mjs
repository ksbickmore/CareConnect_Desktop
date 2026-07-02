/**
 * Populates ./models with everything the local Whisper speech engine needs:
 *
 *   models/whisper-base.en/  quantized ONNX Whisper model (downloaded once
 *                            from the Hugging Face hub, ~85 MB)
 *   models/ort/              onnxruntime-web WASM runtime (copied from
 *                            node_modules, version-matched to transformers.js)
 *
 * Runs automatically before `npm run start/package/make`; it is a fast no-op
 * when the files are already present. The models directory is gitignored and
 * shipped with the packaged app via forge `extraResource`.
 */

import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const MODEL_ID = 'whisper-base.en';
const HUB_BASE = `https://huggingface.co/onnx-community/${MODEL_ID}/resolve/main`;
const MODEL_FILES = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
];

/**
 * onnxruntime-web loader + wasm binaries (must exactly match the
 * onnxruntime-web version pinned by @huggingface/transformers). The plain
 * variant is used for wasm inference, the jsep variant for WebGPU.
 */
const ORT_FILES = [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
];

async function exists(path) {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}) for ${url}`);
  }
  await mkdir(dirname(dest), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
}

let fetched = 0;

for (const file of MODEL_FILES) {
  const dest = join(root, 'models', MODEL_ID, file);
  if (await exists(dest)) continue;
  console.log(`[fetch-models] downloading ${MODEL_ID}/${file} …`);
  await download(`${HUB_BASE}/${file}`, dest);
  fetched++;
}

// Always copy the ORT runtime (cheap, local): the wasm binaries must match
// the onnxruntime-web JS version pinned by transformers.js, so a stale
// models/ort from a previous dependency version would break inference.
for (const file of ORT_FILES) {
  const dest = join(root, 'models', 'ort', file);
  const source = join(root, 'node_modules', 'onnxruntime-web', 'dist', file);
  if (!(await exists(source))) {
    throw new Error(`[fetch-models] missing ${source} — run npm install first`);
  }
  const [srcStat, destStat] = [await stat(source), await stat(dest).catch(() => null)];
  if (destStat && destStat.size === srcStat.size) continue;
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(source, dest);
  fetched++;
}

// Drop runtime files from previous onnxruntime-web versions (they would
// otherwise ship with the installer as dead weight).
for (const file of await readdir(join(root, 'models', 'ort')).catch(() => [])) {
  if (!ORT_FILES.includes(file)) {
    await rm(join(root, 'models', 'ort', file));
    console.log(`[fetch-models] removed stale ort/${file}`);
  }
}

console.log(
  fetched > 0
    ? `[fetch-models] done — ${fetched} file(s) fetched into models/`
    : '[fetch-models] models/ already up to date',
);
