/// <reference types="vite/client" />

declare const __DEBUG_BUILD__: boolean;
declare const __TRACK_VARIABLES__: boolean;

interface ImportMetaEnv {
  readonly VITE_MAINTENANCE_MODE?: string;
  readonly VITE_MAINTENANCE_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
