/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: string;
  /** "1" only in `--mode capture` builds used for screenshots. */
  readonly VITE_CAPTURE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
