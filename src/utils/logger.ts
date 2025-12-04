/**
 * Pino Logger Utility
 * 
 * A centralized logging utility using Pino for high-performance structured logging.
 * 
 * Features:
 * - Environment-aware configuration (dev vs production)
 * - Pretty printing in development, JSON in production
 * - File logging support (configurable via environment variables)
 * - Support for child loggers with context
 * - Proper error object serialization
 * - Automatic log file rotation (daily files)
 * 
 * Environment Variables:
 * - LOG_LEVEL: Log level (trace, debug, info, warn, error, fatal). Default: 'debug' in dev, 'info' in production
 * - SERVICE_NAME: Service name for log identification. Default: 'node-app'
 * - LOG_TO_FILE: Enable file logging ('true' or '1'). Default: disabled
 * - LOG_DIR: Directory for log files. Default: './logs' (relative to project root)
 * 
 * When file logging is enabled:
 * - All logs are written to: logs/app-YYYY-MM-DD.log
 * - Error logs (error and fatal) are also written to: logs/error-YYYY-MM-DD.log
 * - Log files are created daily (one file per day)
 * - Logs are appended to existing files (no rotation, but daily files)
 * 
 * Usage:
 *   import logger from './utils/logger.js';
 *   
 *   // Simple logging
 *   logger.info('Server started');
 *   logger.error('Database connection failed', error);
 *   
 *   // Structured logging
 *   logger.info({ userId: 123, action: 'login' }, 'User logged in');
 *   
 *   // Child logger with context
 *   const userLogger = logger.child({ module: 'user' });
 *   userLogger.info('Processing user request');
 * 
 * Example .env configuration:
 *   LOG_LEVEL=info
 *   SERVICE_NAME=my-app
 *   LOG_TO_FILE=true
 *   LOG_DIR=./logs
 */

import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine log level from environment
const logLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')) as pino.Level;

// Check if file logging is enabled
const enableFileLogging = process.env.LOG_TO_FILE === 'true' || process.env.LOG_TO_FILE === '1';
const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');

// Create logs directory if file logging is enabled
if (enableFileLogging) {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// Base logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: logLevel,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: process.env.SERVICE_NAME || 'node-app',
    env: process.env.NODE_ENV || 'development',
  },
};

// Setup streams for logging
const streams: pino.StreamEntry[] = [];

// Add console stream with pretty printing in development
if (process.env.NODE_ENV !== 'production') {
  streams.push({
    level: logLevel as pino.Level,
    stream: pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        errorLikeObjectKeys: ['err', 'error'],
      },
    }),
  });
} else {
  // In production, use standard output
  streams.push({
    level: logLevel as pino.Level,
    stream: process.stdout,
  });
}

// Add file streams if file logging is enabled
if (enableFileLogging) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const logFileName = `app-${today}.log`;
  const errorLogFileName = `error-${today}.log`;
  
  const logFilePath = path.join(logDir, logFileName);
  const errorLogFilePath = path.join(logDir, errorLogFileName);

  // Stream for all logs
  streams.push({
    level: logLevel as pino.Level,
    stream: fs.createWriteStream(logFilePath, { flags: 'a' }),
  });

  // Separate stream for errors and above
  streams.push({
    level: 'error' as pino.Level,
    stream: fs.createWriteStream(errorLogFilePath, { flags: 'a' }),
  });
}

// Create the base logger with multiple streams
const baseLogger = pino(loggerConfig, pino.multistream(streams));

/**
 * Enhanced logger wrapper with convenient methods
 */
const logger = {
  /**
   * Log an info message
   * @param obj - Object with metadata or string message
   * @param msg - Optional message string
   * @param ...args - Additional arguments
   */
  info(obj: object | string, msg?: string, ...args: unknown[]): void {
    if (typeof obj === 'string') {
      if (args.length > 0) {
        baseLogger.info({}, obj, ...args);
      } else {
        baseLogger.info(obj);
      }
    } else if (msg) {
      baseLogger.info(obj, msg, ...args);
    } else {
      baseLogger.info(obj);
    }
  },

  /**
   * Log a debug message
   * @param obj - Object with metadata or string message
   * @param msg - Optional message string
   * @param ...args - Additional arguments
   */
  debug(obj: object | string, msg?: string, ...args: unknown[]): void {
    if (typeof obj === 'string') {
      if (args.length > 0) {
        baseLogger.debug({}, obj, ...args);
      } else {
        baseLogger.debug(obj);
      }
    } else if (msg) {
      baseLogger.debug(obj, msg, ...args);
    } else {
      baseLogger.debug(obj);
    }
  },

  /**
   * Log a warning message
   * @param obj - Object with metadata or string message
   * @param msg - Optional message string
   * @param ...args - Additional arguments
   */
  warn(obj: object | string, msg?: string, ...args: unknown[]): void {
    if (typeof obj === 'string') {
      if (args.length > 0) {
        baseLogger.warn({}, obj, ...args);
      } else {
        baseLogger.warn(obj);
      }
    } else if (msg) {
      baseLogger.warn(obj, msg, ...args);
    } else {
      baseLogger.warn(obj);
    }
  },

  /**
   * Log an error message
   * Automatically handles Error objects with proper serialization
   * @param obj - Error object, object with metadata, or string message
   * @param msg - Optional message string
   * @param ...args - Additional arguments
   */
  error(obj: Error | object | string, msg?: string, ...args: unknown[]): void {
    // Handle Error objects specially
    if (obj instanceof Error) {
      baseLogger.error(
        {
          err: {
            message: obj.message,
            stack: obj.stack,
            name: obj.name,
            ...(obj as any).code && { code: (obj as any).code },
          },
        },
        msg || obj.message,
        ...args
      );
      return;
    }

    if (typeof obj === 'string') {
      if (args.length > 0) {
        baseLogger.error({}, obj, ...args);
      } else {
        baseLogger.error(obj);
      }
    } else if (msg) {
      baseLogger.error(obj, msg, ...args);
    } else {
      baseLogger.error(obj);
    }
  },

  /**
   * Log a fatal error
   * @param obj - Error object, object with metadata, or string message
   * @param msg - Optional message string
   * @param ...args - Additional arguments
   */
  fatal(obj: Error | object | string, msg?: string, ...args: unknown[]): void {
    if (obj instanceof Error) {
      baseLogger.fatal(
        {
          err: {
            message: obj.message,
            stack: obj.stack,
            name: obj.name,
            ...(obj as any).code && { code: (obj as any).code },
          },
        },
        msg || obj.message,
        ...args
      );
      return;
    }

    if (typeof obj === 'string') {
      if (args.length > 0) {
        baseLogger.fatal({}, obj, ...args);
      } else {
        baseLogger.fatal(obj);
      }
    } else if (msg) {
      baseLogger.fatal(obj, msg, ...args);
    } else {
      baseLogger.fatal(obj);
    }
  },

  /**
   * Create a child logger with additional context
   * Useful for adding module/component names to all logs
   * 
   * @param bindings - Context object to add to all logs
   * @returns Child logger instance
   * 
   * @example
   * const userLogger = logger.child({ module: 'user' });
   * userLogger.info('Processing request'); // Will include module: 'user' in log
   */
  child(bindings: pino.Bindings): pino.Logger {
    return baseLogger.child(bindings);
  },
};

export default logger;
export { baseLogger as pinoLogger };

