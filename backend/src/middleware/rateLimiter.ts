import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Applied to all /api/auth/* routes.
 * Default: 20 requests per 15 minutes per IP.
 * Configurable via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX env vars.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,   // Return rate-limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
  },
  skip: () => env.NODE_ENV === 'test', // Disable during tests
});
