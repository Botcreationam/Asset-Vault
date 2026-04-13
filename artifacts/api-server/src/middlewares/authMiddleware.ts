import * as oidc from "openid-client";
import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  updateSession,
  type SessionData,
} from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

async function refreshIfExpired(
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || now <= session.expires_at) return session;

  if (!session.refresh_token) return null;

  try {
    const config = await getOidcConfig();
    const tokens = await oidc.refreshTokenGrant(
      config,
      session.refresh_token,
    );
    session.access_token = tokens.access_token;
    session.refresh_token = tokens.refresh_token ?? session.refresh_token;
    session.expires_at = tokens.expiresIn()
      ? now + tokens.expiresIn()!
      : session.expires_at;
    await updateSession(sid, session);
    return session;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const sid = getSessionId(req);
  if (!sid) {
    next();
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }

  const refreshed = await refreshIfExpired(sid, session);
  if (!refreshed) {
    await clearSession(res, sid);
    next();
    return;
  }

  const [dbUser] = await db
    .select({
      role: usersTable.role,
      username: usersTable.username,
      nickname: usersTable.nickname,
      program: usersTable.program,
      academicYear: usersTable.academicYear,
      semester: usersTable.semester,
      onboardingCompleted: usersTable.onboardingCompleted,
    })
    .from(usersTable)
    .where(eq(usersTable.id, refreshed.user.id));

  req.user = {
    ...refreshed.user,
    role: (dbUser?.role ?? "student") as "student" | "moderator" | "admin",
    username: dbUser?.username ?? undefined,
    nickname: dbUser?.nickname ?? null,
    program: dbUser?.program ?? null,
    academicYear: dbUser?.academicYear ?? null,
    semester: dbUser?.semester ?? null,
    onboardingCompleted: dbUser?.onboardingCompleted ?? false,
    unitsBalance: 0,
  };
  next();
}
