/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_HOST?: string;
  readonly VITE_ADMIN_HOST?: string;
  readonly VITE_PUBLIC_ORIGIN?: string;
  readonly VITE_ADMIN_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
