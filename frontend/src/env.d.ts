// Types for the VITE_* variables, so import.meta.env.VITE_API_URL is a known string.
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
