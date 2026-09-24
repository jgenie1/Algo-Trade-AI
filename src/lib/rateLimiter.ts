import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically clean up expired entries every 2 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, record] of this.store.entries()) {
          if (now > record.resetTime) {
            this.store.delete(key);
          }
        }
      }, 120000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Checks if an identifier exceeds the maximum request limit within a window.
   * @param identifier IP or unique client identifier
   * @param limit Maximum requests allowed in the timeframe
   * @param windowMs Timeframe window in milliseconds (e.g. 60000 for 1 min)
   */
  public check(
    identifier: string,
    limit: number = 30,
    windowMs: number = 60000
  ): { limited: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.store.get(identifier);

    if (!record || now > record.resetTime) {
      this.store.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { limited: false, remaining: limit - 1, resetTime: now + windowMs };
    }

    if (record.count >= limit) {
      return { limited: true, remaining: 0, resetTime: record.resetTime };
    }

    record.count += 1;
    return { limited: false, remaining: limit - record.count, resetTime: record.resetTime };
  }
}

export const rateLimiter = new InMemoryRateLimiter();

export function getClientIp(req: Request | NextRequest): string {
  if ('headers' in req && typeof req.headers.get === 'function') {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
  }
  return '127.0.0.1';
}
