import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { userActiveSessionsTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const MAX_DEVICES_PER_USER = 3;
const SESSION_EXPIRY_MS = 30 * 60 * 1000;

const suspiciousActivityTracker = new Map<
  string,
  { resourceIds: Set<string>; windowStart: number; blocked: boolean; blockedUntil: number }
>();

const SUSPICIOUS_WINDOW_MS = 5 * 60 * 1000;
const SUSPICIOUS_RESOURCE_THRESHOLD = 20;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of suspiciousActivityTracker.entries()) {
    if (now > entry.windowStart + SUSPICIOUS_WINDOW_MS && (!entry.blocked || now > entry.blockedUntil)) {
      suspiciousActivityTracker.delete(key);
    }
  }
}, 60_000);

export function checkSuspiciousActivity(userId: string, resourceId: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  let entry = suspiciousActivityTracker.get(userId);

  if (entry?.blocked && now < entry.blockedUntil) {
    return { allowed: false, reason: "Suspicious activity detected. Access temporarily restricted." };
  }

  if (!entry || now > entry.windowStart + SUSPICIOUS_WINDOW_MS) {
    entry = { resourceIds: new Set(), windowStart: now, blocked: false, blockedUntil: 0 };
    suspiciousActivityTracker.set(userId, entry);
  }

  entry.resourceIds.add(resourceId);

  if (entry.resourceIds.size >= SUSPICIOUS_RESOURCE_THRESHOLD) {
    entry.blocked = true;
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    return { allowed: false, reason: "Unusual access pattern detected. Please try again later." };
  }

  return { allowed: true };
}

function generateDeviceFingerprint(req: Request): string {
  const ua = req.headers["user-agent"] || "unknown";
  const accept = req.headers["accept-language"] || "";
  return `${ua.slice(0, 100)}|${accept.slice(0, 50)}`;
}

export async function enforceDeviceLimit(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const userId = req.user.id;
    const sessionId = (req as any).sessionID || req.cookies?.["connect.sid"] || "unknown";
    const fingerprint = generateDeviceFingerprint(req);
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const ua = (req.headers["user-agent"] || "").slice(0, 500);
    const now = new Date();
    const cutoff = new Date(Date.now() - SESSION_EXPIRY_MS);

    await db
      .delete(userActiveSessionsTable)
      .where(
        and(
          eq(userActiveSessionsTable.userId, userId),
          sql`${userActiveSessionsTable.lastActiveAt} < ${cutoff}`,
        ),
      );

    const existingSessions = await db
      .select()
      .from(userActiveSessionsTable)
      .where(eq(userActiveSessionsTable.userId, userId))
      .orderBy(desc(userActiveSessionsTable.lastActiveAt));

    const currentSession = existingSessions.find(
      (s) => s.sessionId === sessionId || s.deviceFingerprint === fingerprint,
    );

    if (currentSession) {
      await db
        .update(userActiveSessionsTable)
        .set({ lastActiveAt: now, ipAddress: ip })
        .where(eq(userActiveSessionsTable.id, currentSession.id));
    } else {
      if (existingSessions.length >= MAX_DEVICES_PER_USER) {
        const oldest = existingSessions[existingSessions.length - 1];
        await db
          .delete(userActiveSessionsTable)
          .where(eq(userActiveSessionsTable.id, oldest.id));
      }

      await db.insert(userActiveSessionsTable).values({
        userId,
        sessionId,
        deviceFingerprint: fingerprint,
        ipAddress: ip,
        userAgent: ua,
        lastActiveAt: now,
      });
    }

    next();
  } catch (err) {
    req.log?.error?.({ err }, "Device limit check failed");
    res.status(503).json({ error: "Service temporarily unavailable. Please try again." });
    return;
  }
}

export function contentSecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'none'; object-src 'none'; frame-ancestors 'self';",
  );
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  next();
}
