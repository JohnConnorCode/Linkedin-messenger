export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  volumeThreshold?: number;
  errorFilter?: (error: any) => boolean;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private requestCount: number = 0;
  private lastFailureTime?: Date;
  private nextAttempt?: Date;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly volumeThreshold: number;
  private readonly errorFilter: (error: any) => boolean;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
    this.volumeThreshold = options.volumeThreshold || 10;
    this.errorFilter = options.errorFilter || (() => true);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.nextAttempt && Date.now() < this.nextAttempt.getTime()) {
        throw new Error(`Circuit breaker is OPEN. Next attempt at ${this.nextAttempt.toISOString()}`);
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.requestCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.successCount = 0;
        this.state = CircuitState.CLOSED;
        console.log('Circuit breaker: CLOSED (recovered)');
      }
    }
  }

  private onFailure(error: any): void {
    this.requestCount++;

    if (!this.errorFilter(error)) {
      return; // Don't count filtered errors
    }

    this.failureCount++;
    this.lastFailureTime = new Date();
    this.successCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.timeout);
      console.log(`Circuit breaker: OPEN (failed in HALF_OPEN state). Reopening at ${this.nextAttempt.toISOString()}`);
      return;
    }

    if (this.requestCount >= this.volumeThreshold &&
        this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.timeout);
      console.log(`Circuit breaker: OPEN (threshold exceeded). Reopening at ${this.nextAttempt.toISOString()}`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttempt = undefined;
  }
}

// Rate limiter for LinkedIn-specific protection
export class LinkedInRateLimiter {
  private messagesSent: Map<string, number[]> = new Map();
  private readonly limits = {
    perMinute: 3,
    perHour: 20,
    perDay: 100,
    perWeek: 300
  };

  canSendMessage(accountId: string): boolean {
    const now = Date.now();
    const timestamps = this.messagesSent.get(accountId) || [];

    // Clean old timestamps
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const cleaned = timestamps.filter(ts => ts > oneWeekAgo);

    // Check all rate limits
    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const messagesLastMinute = cleaned.filter(ts => ts > oneMinuteAgo).length;
    const messagesLastHour = cleaned.filter(ts => ts > oneHourAgo).length;
    const messagesLastDay = cleaned.filter(ts => ts > oneDayAgo).length;
    const messagesLastWeek = cleaned.length;

    if (messagesLastMinute >= this.limits.perMinute) {
      console.log(`Rate limit: ${messagesLastMinute} messages in last minute (limit: ${this.limits.perMinute})`);
      return false;
    }

    if (messagesLastHour >= this.limits.perHour) {
      console.log(`Rate limit: ${messagesLastHour} messages in last hour (limit: ${this.limits.perHour})`);
      return false;
    }

    if (messagesLastDay >= this.limits.perDay) {
      console.log(`Rate limit: ${messagesLastDay} messages in last day (limit: ${this.limits.perDay})`);
      return false;
    }

    if (messagesLastWeek >= this.limits.perWeek) {
      console.log(`Rate limit: ${messagesLastWeek} messages in last week (limit: ${this.limits.perWeek})`);
      return false;
    }

    return true;
  }

  recordMessage(accountId: string): void {
    const timestamps = this.messagesSent.get(accountId) || [];
    timestamps.push(Date.now());
    this.messagesSent.set(accountId, timestamps);
  }

  getTimeUntilReset(accountId: string): number {
    const now = Date.now();
    const timestamps = this.messagesSent.get(accountId) || [];

    if (timestamps.length === 0) return 0;

    const oneMinuteAgo = now - (60 * 1000);
    const messagesLastMinute = timestamps.filter(ts => ts > oneMinuteAgo).length;

    if (messagesLastMinute >= this.limits.perMinute) {
      const oldestInWindow = Math.min(...timestamps.filter(ts => ts > oneMinuteAgo));
      return (oldestInWindow + 60 * 1000) - now;
    }

    return 0;
  }

  getRateLimitStatus(accountId: string) {
    const now = Date.now();
    const timestamps = this.messagesSent.get(accountId) || [];

    const oneMinuteAgo = now - (60 * 1000);
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const cleaned = timestamps.filter(ts => ts > oneWeekAgo);

    return {
      minute: {
        used: cleaned.filter(ts => ts > oneMinuteAgo).length,
        limit: this.limits.perMinute
      },
      hour: {
        used: cleaned.filter(ts => ts > oneHourAgo).length,
        limit: this.limits.perHour
      },
      day: {
        used: cleaned.filter(ts => ts > oneDayAgo).length,
        limit: this.limits.perDay
      },
      week: {
        used: cleaned.length,
        limit: this.limits.perWeek
      }
    };
  }
}