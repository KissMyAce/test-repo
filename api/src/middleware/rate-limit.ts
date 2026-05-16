import { NextFunction, Request, Response } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

const authLimiter = new RateLimiterMemory({
  points: 8,
  duration: 60,
  blockDuration: 120,
});

export const authRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = `${req.ip}:${req.path}`;
    await authLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({
      error: "RATE_LIMITED",
      message: "Too many requests. Please retry shortly.",
    });
  }
};
