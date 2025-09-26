// Advanced error tracking for minified code (development-only)
import { isDebugBuild } from '@/utils/debugFlags';

interface VariableTrace {
  name: string;
  location: string;
  stack: string;
  timestamp: number;
  context: any;
}

interface TDZEvent {
  variable: string;
  message: string;
  referenceStack?: string;
  trackerStack?: string;
  timestamp: string;
}

const MAX_ACCESS_LOG_ENTRIES = 200;
const MAX_TDZ_EVENTS = 200;
const MAX_VARIABLE_REGISTRY = 200;

type DebugTracker = {
  trackVariableDeclaration: (name: string, value: unknown, location: string) => void;
  trackVariableAccess: (name: string, location: string) => VariableTrace | null;
  getAccessLog: () => VariableTrace[];
  getVariableRegistry: () => Map<string, any>;
  getTDZEvents: () => TDZEvent[];
  dumpDebugInfo: () => void;
};

const noopTracker: DebugTracker = {
  trackVariableDeclaration: () => {},
  trackVariableAccess: () => null,
  getAccessLog: () => [],
  getVariableRegistry: () => new Map(),
  getTDZEvents: () => [],
  dumpDebugInfo: () => {}
};

const pushBounded = <T,>(collection: T[], item: T, limit: number) => {
  collection.push(item);
  if (collection.length > limit) {
    collection.shift();
  }
};

const enforceMapLimit = (collection: Map<string, any>, limit: number) => {
  if (collection.size < limit) return;
  const iterator = collection.keys().next();
  if (!iterator.done) {
    collection.delete(iterator.value);
  }
};

let debugTrackerImpl: DebugTracker = noopTracker;

if (isDebugBuild) {
  const variableRegistry = new Map<string, any>();
  const accessLog: VariableTrace[] = [];
  const tdzEvents: TDZEvent[] = [];

  // Override console.error to catch ReferenceErrors
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: any[]) => {
    const message = args[0]?.toString?.() ?? '';
    if (message.includes('Cannot access') && message.includes('before initialization')) {
      const referenceStack = typeof args[0]?.stack === 'string' ? args[0].stack : undefined;
      const trackerStack = new Error().stack;
      const variableMatch = /Cannot access '([^']+)' before initialization/.exec(message);
      const variableName = variableMatch?.[1] ?? 'unknown';

      const timestamp = new Date().toISOString();
      const eventInfo: TDZEvent = {
        variable: variableName,
        message,
        referenceStack,
        trackerStack,
        timestamp
      };
      pushBounded(tdzEvents, eventInfo, MAX_TDZ_EVENTS);

      if (console.group) {
        console.group('🛑 [CRITICAL] TDZ Error Detected');
        console.log('Variable:', variableName);
        console.log('Timestamp:', timestamp);
        console.log('Location:', typeof window !== 'undefined' ? window.location.href : 'unknown');
        console.log('UserAgent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown');
        if (referenceStack) {
          console.log('Reference stack:', referenceStack);
        }
        if (trackerStack) {
          console.log('Tracker stack:', trackerStack);
        }
        if (typeof window !== 'undefined') {
          (window as any).__TDZ_EVENTS__ = [...tdzEvents];
          (window as any).__TDZ_VARIABLE_REGISTRY__ = Array.from(variableRegistry.entries());
          (window as any).__TDZ_ACCESS_LOG__ = [...accessLog];
        }
        console.groupEnd();
      }
    }
    originalConsoleError(...args);
  };

  debugTrackerImpl = {
    trackVariableDeclaration: (name: string, value: unknown, location: string) => {
      if (!isDebugBuild) return;
      enforceMapLimit(variableRegistry, MAX_VARIABLE_REGISTRY);
      variableRegistry.set(name, { value, location, timestamp: Date.now() });
      console.log(`🧾 [VAR-DECLARE] '${name}' at ${location}:`, typeof value);
    },

    trackVariableAccess: (name: string, location: string) => {
      if (!isDebugBuild) return null;

      const trace: VariableTrace = {
        name,
        location,
        stack: new Error().stack || '',
        timestamp: Date.now(),
        context: variableRegistry.get(name)
      };

      pushBounded(accessLog, trace, MAX_ACCESS_LOG_ENTRIES);

      if (!variableRegistry.has(name)) {
        console.warn(`⚠️ [TDZ-RISK] Accessing undeclared '${name}' at ${location}`);
        console.log('📘 [REGISTRY] Current variables:', Array.from(variableRegistry.keys()));
        if (trace.stack) {
          console.log('🧵 [TDZ-STACK]', trace.stack);
        }
      } else {
        console.log(`✅ [VAR-ACCESS] '${name}' safely accessed at ${location}`);
      }

      return trace;
    },

    getAccessLog: () => accessLog,
    getVariableRegistry: () => variableRegistry,
    getTDZEvents: () => tdzEvents,

    dumpDebugInfo: () => {
      if (!isDebugBuild) return;
      console.group('🔍 [DEBUG-DUMP] Variable Initialization Analysis');
      console.log('Variables declared:', Array.from(variableRegistry.entries()));
      console.log('Access attempts:', accessLog);
      console.log('Potential TDZ violations:', accessLog.filter(log => !variableRegistry.has(log.name)));
      console.log('Captured TDZ events:', tdzEvents);
      console.groupEnd();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      if (!isDebugBuild) {
        return;
      }
      if (event.message.includes('Cannot access') && event.message.includes('before initialization')) {
        console.group('🛑 [TDZ-ERROR] Temporal Dead Zone Violation Detected');
        console.error('Error:', event.error);
        console.log('Filename:', event.filename);
        console.log('Line:', event.lineno, 'Column:', event.colno);
        console.log('Stack:', event.error?.stack);
        debugTrackerImpl.dumpDebugInfo();
        console.groupEnd();
      }
    });
  }
}

export const debugTracker = debugTrackerImpl;
