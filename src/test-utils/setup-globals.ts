/**
 * Early Jest setup (registered via setupFiles, before test modules load).
 * jsdom does not provide TextEncoder/TextDecoder, but react-router 7 needs
 * them at import time, so they must exist before any test file is required.
 */
import { TextDecoder, TextEncoder } from 'node:util';

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}
