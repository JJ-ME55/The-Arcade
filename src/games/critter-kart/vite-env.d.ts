// @ts-nocheck
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
