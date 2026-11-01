import { createRedactor, redactValue, type Redactor } from './redact';
import type { LogLevel, RedactionConfig, Sink } from './types';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface ConsoleAdapterOptions {
  /** Minimum level to emit. Lower-priority calls are dropped. Default: `debug`. */
  level?: LogLevel;
  /** Redaction configuration merged over safe defaults. */
  redaction?: RedactionConfig;
  /** Output sink. Defaults to `console`. */
  sink?: Sink;
}

/**
 * Console adapter that formats a log line with redacted, safely serialized
 * metadata and writes it to a sink (defaults to `console`).
 */
export class ConsoleAdapter {
  private readonly priority: number;
  private readonly redactor: Redactor;
  private readonly sink: Sink;

  constructor(options: ConsoleAdapterOptions = {}) {
    this.priority = LEVEL_PRIORITY[options.level ?? 'debug'];
    this.redactor = createRedactor(options.redaction);
    this.sink = options.sink ?? (console as unknown as Sink);
  }

  log(level: LogLevel, message: string, meta?: unknown): void {
    if (LEVEL_PRIORITY[level] < this.priority) {
      return;
    }
    const line = meta === undefined ? message : `${message} ${redactValue(meta, this.redactor)}`;
    this.sink[level](line);
  }
}
