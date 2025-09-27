import { useEffect, useState } from 'react';

export interface HeapFailSafeEvent {
  level: 'warn' | 'critical' | 'emergency';
  usedMb: number;
  timestamp: number;
}

export const useHeapFailSafe = () => {
  const [event, setEvent] = useState<HeapFailSafeEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const handler = (nativeEvent: Event) => {
      const customEvent = nativeEvent as CustomEvent<{ level: HeapFailSafeEvent['level']; usedMb: number }>;
      if (!customEvent?.detail) {
        return;
      }

      setEvent({
        level: customEvent.detail.level,
        usedMb: customEvent.detail.usedMb,
        timestamp: Date.now()
      });
    };

    window.addEventListener('heap-failsafe', handler);
    return () => {
      window.removeEventListener('heap-failsafe', handler);
    };
  }, []);

  return event;
};
