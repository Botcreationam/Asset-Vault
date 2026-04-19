import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getTrialInfo } from "../lib/trial";
import {
  clearSession,
  getSessionId,
  getSession,
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

  const [dbUser] = await db
    .select({
      role: usersTable.role,
      username: usersTable.username,
      nickname: usersTable.nickname,
      program: usersTable.program,
      academicYear: usersTable.academicYear,
      semester: usersTable.semester,
      onboardingCompleted: usersTable.onboardingCompleted,
      createdAt: usersTable.createdAt,
      email: usersTable.email,
      schoolId: usersTable.schoolId,
      institutionalEmail: usersTable.institutionalEmail,
      approvalStatus: usersTable.approvalStatus,
      rejectionReason: usersTable.rejectionReason,
    })
    .from(usersTable)
    .where(eq(usersTable.id, session.user.id));

  const trial = getTrialInfo(dbUser?.createdAt ?? new Date());

  req.user = {
    ...session.user,
    role: (dbUser?.role ?? "student") as "student" | "moderator" | "admin",
    username: dbUser?.username ?? undefined,
    nickname: dbUser?.nickname ?? null,
    program: dbUser?.program ?? null,
    academicYear: dbUser?.academicYear ?? null,
    semester: dbUser?.semester ?? null,
    onboardingCompleted: dbUser?.onboardingCompleted ?? false,
    unitsBalance: 0,
    isTrialActive: trial.isActive,
    trialDaysRemaining: trial.daysRemaining,
    trialEndsAt: trial.endsAt.toISOString(),
    email: dbUser?.email ?? null,
    schoolId: dbUser?.schoolId ?? null,
    institutionalEmail: dbUser?.institutionalEmail ?? null,
    approvalStatus: (dbUser?.approvalStatus ?? "approved") as "pending" | "approved" | "rejected",
    rejectionReason: dbUser?.rejectionReason ?? null,
  };
  next();
}
