import { getAuth, createClerkClient } from "@clerk/express";
import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { userUnitsTable, unitsTransactionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "../lib/audit";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const WELCOME_UNITS = 50;

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: {
        id: string;
        role: "student" | "moderator" | "admin";
        username?: string;
        email?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        profileImageUrl?: string | null;
        unitsBalance: number;
      };
    }
  }
}

async function grantWelcomeUnits(userId: string) {
  const [existing] = await db
    .select({ userId: userUnitsTable.userId })
    .from(userUnitsTable)
    .where(eq(userUnitsTable.userId, userId));

  if (existing) return;

  await db.insert(userUnitsTable).values({ userId, balance: WELCOME_UNITS }).onConflictDoNothing();
  await db.insert(unitsTransactionsTable).values({
    userId,
    type: "credit",
    amount: WELCOME_UNITS,
    description: `Welcome bonus — ${WELCOME_UNITS} free units to get you started`,
  });
  await logAudit("units_welcome", userId, userId, { amount: WELCOME_UNITS });
}

async function upsertUser(userId: string): Promise<typeof usersTable.$inferSelect | null> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (existing) {
    if (ADMIN_EMAILS.length > 0 && existing.email && ADMIN_EMAILS.includes(existing.email.toLowerCase())) {
      if (existing.role !== "admin") {
        await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, userId));
        existing.role = "admin";
      }
    }
    return existing;
  }

  let clerkUser: { emailAddresses: { emailAddress: string }[]; firstName: string | null; lastName: string | null; imageUrl: string; username: string | null } | null = null;
  try {
    clerkUser = await clerkClient.users.getUser(userId);
  } catch {
    return null;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() ?? null;
  const isAdmin = email ? ADMIN_EMAILS.includes(email) : false;

  const userData = {
    id: userId,
    email,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    profileImageUrl: clerkUser.imageUrl ?? null,
    username: clerkUser.username ?? null,
    role: isAdmin ? ("admin" as const) : ("student" as const),
  };

  const [newUser] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { ...userData, updatedAt: new Date() },
    })
    .returning();

  await grantWelcomeUnits(newUser.id);
  await logAudit("user_registered", newUser.id, newUser.id, { email, role: userData.role });

  return newUser;
}

export async function populateUser(req: Request, _res: Response, next: NextFunction) {
  req.isAuthenticated = function () {
    return this.user != null;
  };

  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;

  if (!userId) {
    next();
    return;
  }

  try {
    const dbUser = await upsertUser(userId);
    if (!dbUser) {
      next();
      return;
    }

    req.user = {
      id: dbUser.id,
      role: (dbUser.role ?? "student") as "student" | "moderator" | "admin",
      username: dbUser.username ?? undefined,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      unitsBalance: 0,
    };
  } catch {
    // If upsert fails, continue unauthenticated
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
