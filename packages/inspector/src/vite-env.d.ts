/// <reference types="vite/client" />

// Allow Vite-style CSS imports in TypeScript during inspector type-checking.
declare module '*.css' {
  const content: Record<string, string>;

  export { content };
}
