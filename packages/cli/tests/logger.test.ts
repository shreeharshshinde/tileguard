import { describe, it, expect } from 'vitest';
import { createLogger, type LogLevel } from '../src/logging/Logger.js';

describe('createLogger', () => {
  function captureOutput(level: LogLevel) {
    const lines: string[] = [];
    const logger = createLogger({ level, write: (text) => lines.push(text) });
    return { logger, lines };
  }

  describe('quiet level', () => {
    it('suppresses info output', () => {
      const { logger, lines } = captureOutput('quiet');
      logger.info('hello');
      expect(lines).toHaveLength(0);
    });

    it('suppresses warn output', () => {
      const { logger, lines } = captureOutput('quiet');
      logger.warn('warning');
      expect(lines).toHaveLength(0);
    });

    it('suppresses phase output', () => {
      const { logger, lines } = captureOutput('quiet');
      logger.phase('loading');
      expect(lines).toHaveLength(0);
    });

    it('suppresses error output', () => {
      const { logger, lines } = captureOutput('quiet');
      logger.error('oops');
      expect(lines).toHaveLength(0);
    });

    it('suppresses verbose output', () => {
      const { logger, lines } = captureOutput('quiet');
      logger.verbose('detail');
      expect(lines).toHaveLength(0);
    });

    it('suppresses debug output', () => {
      const { logger, lines } = captureOutput('quiet');
      logger.debug('internal');
      expect(lines).toHaveLength(0);
    });
  });

  describe('normal level', () => {
    it('shows info messages', () => {
      const { logger, lines } = captureOutput('normal');
      logger.info('info message');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('info message');
    });

    it('shows warn messages', () => {
      const { logger, lines } = captureOutput('normal');
      logger.warn('watch out');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('watch out');
    });

    it('shows error messages', () => {
      const { logger, lines } = captureOutput('normal');
      logger.error('broken');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('broken');
    });

    it('shows phase messages', () => {
      const { logger, lines } = captureOutput('normal');
      logger.phase('Loading tiles');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Loading tiles');
    });

    it('suppresses verbose output', () => {
      const { logger, lines } = captureOutput('normal');
      logger.verbose('extra detail');
      expect(lines).toHaveLength(0);
    });

    it('suppresses debug output', () => {
      const { logger, lines } = captureOutput('normal');
      logger.debug('internal state');
      expect(lines).toHaveLength(0);
    });

    it('suppresses timing output', () => {
      const { logger, lines } = captureOutput('normal');
      logger.timing('parse', 42.5);
      expect(lines).toHaveLength(0);
    });
  });

  describe('verbose level', () => {
    it('shows verbose messages', () => {
      const { logger, lines } = captureOutput('verbose');
      logger.verbose('expanded detail');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('expanded detail');
    });

    it('shows timing messages', () => {
      const { logger, lines } = captureOutput('verbose');
      logger.timing('decode', 123.4);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('decode');
      expect(lines[0]).toContain('123.4');
    });

    it('still shows normal level messages', () => {
      const { logger, lines } = captureOutput('verbose');
      logger.info('visible');
      logger.warn('also visible');
      logger.error('still visible');
      expect(lines).toHaveLength(3);
    });

    it('suppresses debug output', () => {
      const { logger, lines } = captureOutput('verbose');
      logger.debug('should not appear');
      expect(lines).toHaveLength(0);
    });
  });

  describe('debug level', () => {
    it('shows debug messages', () => {
      const { logger, lines } = captureOutput('debug');
      logger.debug('deep internals');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('deep internals');
    });

    it('shows all lower-level messages', () => {
      const { logger, lines } = captureOutput('debug');
      logger.info('a');
      logger.warn('b');
      logger.error('c');
      logger.verbose('d');
      logger.phase('e');
      logger.timing('f', 1);
      logger.debug('g');
      expect(lines).toHaveLength(7);
    });
  });

  describe('output formatting', () => {
    it('error() includes ✗ prefix', () => {
      const { logger, lines } = captureOutput('normal');
      logger.error('something failed');
      expect(lines[0]).toMatch(/^✗ /);
    });

    it('warn() includes ⚠ prefix', () => {
      const { logger, lines } = captureOutput('normal');
      logger.warn('caution');
      expect(lines[0]).toMatch(/^⚠ /);
    });

    it('phase() includes ▸ prefix', () => {
      const { logger, lines } = captureOutput('normal');
      logger.phase('step one');
      expect(lines[0]).toMatch(/^▸ /);
    });

    it('timing() includes ⏱ and formatted duration', () => {
      const { logger, lines } = captureOutput('verbose');
      logger.timing('parse', 55.3);
      expect(lines[0]).toContain('⏱');
      expect(lines[0]).toContain('55.3ms');
    });

    it('debug() includes [debug] tag', () => {
      const { logger, lines } = captureOutput('debug');
      logger.debug('trace info');
      expect(lines[0]).toContain('[debug]');
    });

    it('all messages end with newline', () => {
      const { logger, lines } = captureOutput('debug');
      logger.info('msg');
      logger.error('err');
      logger.warn('wrn');
      logger.verbose('vrb');
      logger.debug('dbg');
      logger.phase('phs');
      logger.timing('tmg', 1);
      for (const line of lines) {
        expect(line).toMatch(/\n$/);
      }
    });
  });

  describe('custom write function', () => {
    it('receives formatted output', () => {
      const captured: string[] = [];
      const logger = createLogger({
        level: 'normal',
        write: (text) => captured.push(text),
      });
      logger.info('hello world');
      expect(captured).toHaveLength(1);
      expect(captured[0]).toBe('hello world\n');
    });
  });

  describe('level getter', () => {
    it('returns the configured level', () => {
      const logger = createLogger({ level: 'verbose', write: () => {} });
      expect(logger.level).toBe('verbose');
    });

    it('defaults to normal when no level specified', () => {
      const logger = createLogger({ write: () => {} });
      expect(logger.level).toBe('normal');
    });
  });
});
