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

// Override console.error to catch ReferenceErrors
const originalConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
  if (args[0]?.toString().includes('Cannot access') || args[0]?.toString().includes('before initialization')) {
    console.log('🚨 [CRITICAL] TDZ Error Detected:', {
      error: args[0],
      stack: new Error().stack,
      timestamp: new Date().toISOString(),
      location: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    });
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
    } else {
      console.log(`✅ [VAR-ACCESS] '${name}' safely accessed at ${location}`);
    }
    
    return trace;
  },
  
  getAccessLog: () => accessLog,
  getVariableRegistry: () => variableRegistry,
  
  dumpDebugInfo: () => {
    console.group('🔍 [DEBUG-DUMP] Variable Initialization Analysis');
    console.log('Variables declared:', Array.from(variableRegistry.entries()));
    console.log('Access attempts:', accessLog);
    console.log('Potential TDZ violations:', accessLog.filter(log => !variableRegistry.has(log.name)));
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
