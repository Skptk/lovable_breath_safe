export const isDebugBuild = typeof __DEBUG_BUILD__ !== 'undefined'
  ? __DEBUG_BUILD__
  : import.meta.env.MODE === 'debug';

export function debugLog(namespace: string, message: string, ...context: unknown[]) {
  if (isDebugBuild) {
    console.log(`🛠️ [${namespace}] ${message}`, ...context);
  }
}

export function debugWarn(namespace: string, message: string, ...context: unknown[]) {
  if (isDebugBuild) {
    console.warn(`⚠️ [${namespace}] ${message}`, ...context);
  }
}

export function debugError(namespace: string, message: string, ...context: unknown[]) {
  if (isDebugBuild) {
    console.error(`❌ [${namespace}] ${message}`, ...context);
  }
}

export function debugTrace(namespace: string, message: string) {
  if (isDebugBuild) {
    console.trace(`🧭 [${namespace}] ${message}`);
  }
}
