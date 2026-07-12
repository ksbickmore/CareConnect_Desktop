import { dispatchSave, useSaveActionsStore } from './save-actions';

const register = (id: string, scope: 'screen' | 'dialog', run: () => void) =>
  useSaveActionsStore.getState().register({ id, scope, run });

describe('save actions registry', () => {
  it('returns false when nothing is registered', () => {
    expect(dispatchSave()).toBe(false);
  });

  it('runs the registered screen action', () => {
    const run = jest.fn();
    register('screen-1', 'screen', run);

    expect(dispatchSave()).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('an open dialog beats the screen behind it', () => {
    const screenRun = jest.fn();
    const dialogRun = jest.fn();
    register('screen-1', 'screen', screenRun);
    register('dialog-1', 'dialog', dialogRun);

    expect(dispatchSave()).toBe(true);
    expect(dialogRun).toHaveBeenCalledTimes(1);
    expect(screenRun).not.toHaveBeenCalled();
  });

  it('the most recently registered entry of a scope wins', () => {
    const first = jest.fn();
    const second = jest.fn();
    register('screen-1', 'screen', first);
    register('screen-2', 'screen', second);

    dispatchSave();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('unregistered entries no longer receive dispatches', () => {
    const run = jest.fn();
    register('screen-1', 'screen', run);
    useSaveActionsStore.getState().unregister('screen-1');

    expect(dispatchSave()).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });
});
