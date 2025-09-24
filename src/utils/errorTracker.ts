// Advanced error tracking for minified code
interface VariableTrace {
  name: string;
  location: string;
  stack: string;
  timestamp: number;
  context: any;
}

const variableRegistry = new Map<string, any>();
const accessLog: VariableTrace[] = [];
interface TDZEvent {
  variable: string;
  message: string;
  referenceStack?: string;
  trackerStack?: string;
  timestamp: string;
}

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
    tdzEvents.push(eventInfo);

    console.group('🚨 [CRITICAL] TDZ Error Detected');
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
      (window as any).__TDZ_EVENTS__ = tdzEvents;
      (window as any).__TDZ_VARIABLE_REGISTRY__ = Array.from(variableRegistry.entries());
      (window as any).__TDZ_ACCESS_LOG__ = accessLog;
    }
    console.groupEnd();
  }
  originalConsoleError(...args);
};

// Track variable declarations and access
export const debugTracker = {
  trackVariableDeclaration: (name: string, value: any, location: string) => {
    console.log(`📝 [VAR-DECLARE] '${name}' at ${location}:`, typeof value);
    variableRegistry.set(name, { value, location, timestamp: Date.now() });
  },
  
  trackVariableAccess: (name: string, location: string) => {
    const trace: VariableTrace = {
      name,
      location,
      stack: new Error().stack || '',
      timestamp: Date.now(),
      context: variableRegistry.get(name)
    };
    
    accessLog.push(trace);
    
    if (!variableRegistry.has(name)) {
      console.error(`❌ [TDZ-RISK] Accessing undeclared '${name}' at ${location}`);
      console.log('📊 [REGISTRY] Current variables:', Array.from(variableRegistry.keys()));
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
    console.group('🔍 [DEBUG-DUMP] Variable Initialization Analysis');
    console.log('Variables declared:', Array.from(variableRegistry.entries()));
    console.log('Access attempts:', accessLog);
    console.log('Potential TDZ violations:', accessLog.filter(log => !variableRegistry.has(log.name)));
    console.log('Captured TDZ events:', tdzEvents);
    console.groupEnd();
  }
};

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message.includes('Cannot access') && event.message.includes('before initialization')) {
      console.group('🚨 [TDZ-ERROR] Temporal Dead Zone Violation Detected');
      console.error('Error:', event.error);
      console.log('Filename:', event.filename);
      console.log('Line:', event.lineno, 'Column:', event.colno);
      console.log('Stack:', event.error?.stack);
      debugTracker.dumpDebugInfo();
      console.groupEnd();
    }
  });
}
