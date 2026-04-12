import { type Request, type Response, type NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  }
}, 60_000);

export function rateLimit(opts: {
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
  name: string;
}) {
  const { windowMs, max, name } = opts;
  const store = new Map<string, RateLimitEntry>();
  stores.set(name, store);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = opts.keyFn ? opts.keyFn(req) : (req.user as any)?.id || req.ip || "anon";
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    entry.count++;
    next();
  };
}

export const postRateLimit = rateLimit({
  name: "create-post",
  windowMs: 60_000,
  max: 10,
});

export const commentRateLimit = rateLimit({
  name: "create-comment",
  windowMs: 60_000,
  max: 30,
});

export const reactionRateLimit = rateLimit({
  name: "toggle-reaction",
  windowMs: 60_000,
  max: 60,
});

export const messageRateLimit = rateLimit({
  name: "send-message",
  windowMs: 60_000,
  max: 60,
});

export const uploadRateLimit = rateLimit({
  name: "upload-photo",
  windowMs: 300_000,
  max: 5,
});

export const authRateLimit = rateLimit({
  name: "auth-login",
  windowMs: 300_000,
  max: 15,
  keyFn: (req) => req.ip || "anon",
});

export const topupRateLimit = rateLimit({
  name: "topup-units",
  windowMs: 3600_000,
  max: 5,
});

export const downloadRateLimit = rateLimit({
  name: "download-resource",
  windowMs: 60_000,
  max: 10,
});

export const apiRateLimit = rateLimit({
  name: "global-api",
  windowMs: 60_000,
  max: 200,
  keyFn: (req) => (req.user as any)?.id || req.ip || "anon",
});
