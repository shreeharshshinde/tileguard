/**
 * Platform-aware default write function.
 *
 * Uses process.stdout.write when available (Node.js), otherwise falls back
 * to console methods for browser/non-Node environments.
 */

export type WriteFn = (text: string) => void;

/**
 * Creates the default write function with platform detection.
 * Prefers process.stdout.write (Node), falls back to the provided console
 * method for portability (browser, Deno, workers, etc.).
 */
export function createDefaultWrite(fallback: 'log' | 'info' = 'log'): WriteFn {
  if (typeof process !== 'undefined' && process.stdout?.write !== undefined) {
    return (text: string) => {
      process.stdout.write(text);
    };
  }
  // Non-Node environment — use console as the output channel.
  // This is intentional runtime logging, not debug output.
  return fallback === 'info'
    ? (text: string) => console.info(text)
    : (text: string) => console.log(text);
}
