// src/shared/logger.ts
// Logger browser-safe: usa console en el frontend, pino en el servidor.
// Vite expone import.meta.env; Node.js expone process.env.

const isDev = (() => {
  try {
    // Vite (browser/worker)
    return import.meta.env?.MODE === 'development';
  } catch {
    // Node.js (server / worker sin Vite)
    return (typeof process !== 'undefined' ? process.env.NODE_ENV : 'production') === 'development';
  }
})();

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

type LogFn = (obj: object | string, msg?: string, ...args: unknown[]) => void;

interface Logger {
  level: LogLevel;
  trace: LogFn;
  debug: LogFn;
  info:  LogFn;
  warn:  LogFn;
  error: LogFn;
  fatal: LogFn;
}

function makeLogFn(level: LogLevel, consoleFn: (...args: unknown[]) => void, active: boolean): LogFn {
  if (!active) return () => { /* noop */ };
  return (obj, msg, ...rest) => {
    const prefix = `[${level.toUpperCase()}]`;
    if (typeof obj === 'string') {
      consoleFn(prefix, obj, ...rest);
    } else {
      consoleFn(prefix, msg ?? '', obj, ...rest);
    }
  };
}

const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const activeLevel: LogLevel = isDev ? 'debug' : 'warn';
const activeIdx = levels.indexOf(activeLevel);

export const logger: Logger = {
  level: activeLevel,
  trace: makeLogFn('trace', console.debug.bind(console), activeIdx <= 0),
  debug: makeLogFn('debug', console.debug.bind(console), activeIdx <= 1),
  info:  makeLogFn('info',  console.info.bind(console),  activeIdx <= 2),
  warn:  makeLogFn('warn',  console.warn.bind(console),  activeIdx <= 3),
  error: makeLogFn('error', console.error.bind(console), activeIdx <= 4),
  fatal: makeLogFn('fatal', console.error.bind(console), activeIdx <= 5),
};

export default logger;