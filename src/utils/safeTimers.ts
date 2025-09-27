const hasWindow = typeof window !== 'undefined';
const hasDocument = typeof document !== 'undefined';

type SkipReason = 'hidden' | 'predicate';

type SafeIntervalOptions = {
  pauseWhenHidden?: boolean;
  shouldRun?: () => boolean;
  immediate?: boolean;
  onSkip?: (reason: SkipReason) => void;
};

const noop = () => {};
export type CancelSafeInterval = () => void;

export function createSafeInterval(
  callback: () => void,
  intervalMs: number,
  options: SafeIntervalOptions = {}
): CancelSafeInterval {
  if (!hasWindow || typeof intervalMs !== 'number' || intervalMs <= 0) {
    return noop;
  }

  const {
    pauseWhenHidden = true,
    shouldRun,
    immediate = false,
    onSkip
  } = options;

  let disposed = false;
  let timeoutId: number | null = null;

  const clearScheduled = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const schedule = () => {
    if (disposed) {
      return;
    }
    clearScheduled();
    timeoutId = window.setTimeout(tick, intervalMs);
  };

  const tick = () => {
    if (disposed) {
      return;
    }

    if (pauseWhenHidden && hasDocument && document.visibilityState === 'hidden') {
      onSkip?.('hidden');
      schedule();
      return;
    }

    if (shouldRun && !shouldRun()) {
      onSkip?.('predicate');
      schedule();
      return;
    }

    try {
      callback();
    } catch (error) {
      console.error('[safeTimers] Unhandled error inside safe interval callback', error);
    }

    schedule();
  };

  const cancel = () => {
    disposed = true;
    clearScheduled();
  };

  if (immediate) {
    tick();
  } else {
    schedule();
  }

  return cancel;
}
