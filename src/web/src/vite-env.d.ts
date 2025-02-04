/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables
 * @version 4.3.9
 */
interface ImportMetaEnv {
  /** API endpoint base URL */
  readonly VITE_API_URL: string;
  
  /** WebSocket server URL */
  readonly VITE_WS_URL: string;
  
  /** Current environment name */
  readonly VITE_ENV: 'development' | 'staging' | 'production';
  
  /** Auth0 domain for authentication */
  readonly VITE_AUTH_DOMAIN: string;
  
  /** Auth0 client ID */
  readonly VITE_AUTH_CLIENT_ID: string;
  
  /** API request timeout in milliseconds */
  readonly VITE_API_TIMEOUT: number;
  
  /** Vite mode */
  readonly MODE: string;
  
  /** Base public path when served in development or production */
  readonly BASE_URL: string;
  
  /** Whether the app is running in production */
  readonly PROD: boolean;
  
  /** Whether the app is running in development */
  readonly DEV: boolean;
  
  /** Whether the app is running in SSR mode */
  readonly SSR: boolean;
}

/**
 * Type augmentation for import.meta.env
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Type declarations for static asset imports
 */
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.avif' {
  const content: string;
  export default content;
}

declare module '*.mp4' {
  const content: string;
  export default content;
}

declare module '*.webm' {
  const content: string;
  export default content;
}

declare module '*.ogg' {
  const content: string;
  export default content;
}

declare module '*.mp3' {
  const content: string;
  export default content;
}

declare module '*.wav' {
  const content: string;
  export default content;
}

declare module '*.woff' {
  const content: string;
  export default content;
}

declare module '*.woff2' {
  const content: string;
  export default content;
}

declare module '*.eot' {
  const content: string;
  export default content;
}

declare module '*.ttf' {
  const content: string;
  export default content;
}

declare module '*.otf' {
  const content: string;
  export default content;
}

declare module '*.wasm' {
  const content: WebAssembly.Module;
  export default content;
}