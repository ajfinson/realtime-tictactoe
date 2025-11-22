export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m'  // Red
};

const RESET_COLOR = '\x1b[0m';

class Logger {
  private config: LoggerConfig;
  private context?: string;

  constructor(config: LoggerConfig, context?: string) {
    this.config = config;
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(entry: LogEntry): string {
    const contextStr = entry.context ? `[${entry.context}]` : '';
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    return `${entry.timestamp} ${entry.level.toUpperCase()} ${contextStr} ${entry.message}${dataStr}`;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      context: this.context,
      data
    };

    if (this.config.enableConsole) {
      const color = LOG_COLORS[level];
      const formatted = this.formatMessage(entry);
      console.log(`${color}${formatted}${RESET_COLOR}`);
    }

    if (this.config.enableFile && this.config.filePath) {
      // File logging could be implemented here with fs.appendFileSync
      // For now, keeping it simple without file dependencies
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  // Create a child logger with a specific context
  child(context: string): Logger {
    return new Logger(this.config, context);
  }
}

// Load logger configuration from environment
export function loadLoggerConfig(): LoggerConfig {
  const level = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';
  return {
    level: ['debug', 'info', 'warn', 'error'].includes(level) ? level : 'info',
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH
  };
}

// Export default logger instance
export const logger = new Logger(loadLoggerConfig());

// Export Logger class for custom instances
export { Logger };
