/**
 * Centralized logging utility
 * In production, this would integrate with a service like Sentry or LogRocket
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    const formatted = this.formatMessage('info', message, context);

    if (this.isDevelopment) {
      console.log(formatted);
    }

    // In production, send to monitoring service
    if (this.isProduction) {
      this.sendToMonitoring('info', message, context);
    }
  }

  warn(message: string, context?: LogContext) {
    const formatted = this.formatMessage('warn', message, context);
    console.warn(formatted);

    if (this.isProduction) {
      this.sendToMonitoring('warn', message, context);
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { error };

    const formatted = this.formatMessage('error', message, { ...context, ...errorDetails });
    console.error(formatted);

    if (this.isProduction) {
      this.sendToMonitoring('error', message, { ...context, ...errorDetails });
    }
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext) {
    const message = `Performance: ${operation} took ${duration}ms`;

    if (duration > 1000) {
      this.warn(message, context);
    } else if (this.isDevelopment) {
      this.debug(message, context);
    }
  }

  // Security-related logging
  security(event: string, context?: LogContext) {
    const message = `Security Event: ${event}`;
    this.warn(message, { ...context, type: 'security' });
  }

  // Database query logging
  database(query: string, duration?: number, error?: Error) {
    if (error) {
      this.error(`Database query failed: ${query}`, error, { duration });
    } else if (this.isDevelopment) {
      this.debug(`Database query executed: ${query}`, { duration });
    }
  }

  // API request/response logging
  api(method: string, path: string, status: number, duration?: number, error?: Error) {
    const message = `API ${method} ${path} - ${status}`;

    if (status >= 500 || error) {
      this.error(message, error, { duration });
    } else if (status >= 400) {
      this.warn(message, { duration });
    } else if (this.isDevelopment) {
      this.info(message, { duration });
    }
  }

  private sendToMonitoring(level: LogLevel, message: string, context?: LogContext) {
    // In production, this would send to a service like Sentry
    // For now, we'll just store critical errors

    if (level === 'error' || level === 'warn') {
      // TODO: Integrate with error monitoring service
      // Example: Sentry.captureMessage(message, level, context);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export helper for timing operations
export function measurePerformance<T>(
  operation: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();

  try {
    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        logger.performance(operation, duration);
      });
    }

    const duration = performance.now() - start;
    logger.performance(operation, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`Operation failed: ${operation}`, error, { duration });
    throw error;
  }
}