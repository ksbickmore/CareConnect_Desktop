import {
  isSpeechAvailable,
  requestSpeechPermissions,
  startListening,
  stopListening,
} from './speech-recognition';
import {
  FakeSpeechRecognition,
  installSpeech,
  removeSpeech,
} from '@/test-utils/mocks';

afterEach(() => {
  removeSpeech();
});

describe('without a SpeechRecognition implementation', () => {
  it('reports speech as unavailable', async () => {
    expect(isSpeechAvailable()).toBe(false);
    await expect(requestSpeechPermissions()).resolves.toBe(false);
  });

  it('startListening degrades to onError + onEnd without throwing', () => {
    const onError = jest.fn();
    const onEnd = jest.fn();
    const unsubscribe = startListening({ onError, onEnd });
    expect(onError).toHaveBeenCalledWith('Speech recognition is not available.');
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(() => unsubscribe()).not.toThrow();
  });

  it('stopListening is a no-op', () => {
    expect(() => stopListening()).not.toThrow();
  });
});

describe('with a SpeechRecognition implementation', () => {
  beforeEach(() => {
    installSpeech();
  });

  it('reports speech as available', async () => {
    expect(isSpeechAvailable()).toBe(true);
    await expect(requestSpeechPermissions()).resolves.toBe(true);
  });

  it('configures and starts a recognition session', () => {
    startListening({});
    const rec = FakeSpeechRecognition.latest();
    expect(rec.started).toBe(true);
    expect(rec.lang).toBe('en-US');
    expect(rec.interimResults).toBe(true);
    expect(rec.continuous).toBe(false);
  });

  it('honors the continuous option', () => {
    startListening({}, { continuous: true });
    expect(FakeSpeechRecognition.latest().continuous).toBe(true);
  });

  it('routes interim results to onPartial and final results to onFinal (trimmed)', () => {
    const onPartial = jest.fn();
    const onFinal = jest.fn();
    startListening({ onPartial, onFinal });
    const rec = FakeSpeechRecognition.latest();

    rec.emitResult('open medi', false);
    expect(onPartial).toHaveBeenCalledWith('open medi');
    expect(onFinal).not.toHaveBeenCalled();

    rec.emitResult('  open medications  ', true);
    expect(onFinal).toHaveBeenCalledWith('open medications');
  });

  it('suppresses aborted and no-speech errors', () => {
    const onError = jest.fn();
    startListening({ onError });
    const rec = FakeSpeechRecognition.latest();
    rec.emitError('aborted');
    rec.emitError('no-speech');
    expect(onError).not.toHaveBeenCalled();
  });

  it('surfaces real errors, preferring the message', () => {
    const onError = jest.fn();
    startListening({ onError });
    const rec = FakeSpeechRecognition.latest();
    rec.emitError('network', 'Network unreachable');
    expect(onError).toHaveBeenCalledWith('Network unreachable');
    rec.emitError('audio-capture', '');
    expect(onError).toHaveBeenCalledWith('audio-capture');
  });

  it('fires onEnd when the session ends', () => {
    const onEnd = jest.fn();
    startListening({ onEnd });
    FakeSpeechRecognition.latest().emitEnd();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('stopListening stops the active session', () => {
    startListening({});
    stopListening();
    expect(FakeSpeechRecognition.latest().stopped).toBe(true);
  });

  it('unsubscribe detaches the handlers', () => {
    const onFinal = jest.fn();
    const unsubscribe = startListening({ onFinal });
    const rec = FakeSpeechRecognition.latest();
    unsubscribe();
    rec.emitResult('ignored', true);
    expect(onFinal).not.toHaveBeenCalled();
  });

  it('folds a throwing start() into onError + onEnd', () => {
    class Failing extends FakeSpeechRecognition {
      override start(): void {
        throw new Error('mic busy');
      }
    }
    window.SpeechRecognition =
      Failing as unknown as SpeechRecognitionConstructor;
    const onError = jest.fn();
    const onEnd = jest.fn();
    startListening({ onError, onEnd });
    expect(onError).toHaveBeenCalledWith('mic busy');
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
