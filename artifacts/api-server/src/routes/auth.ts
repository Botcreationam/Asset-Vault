import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { userUnitsTable, unitsTransactionsTable, auditLogsTable } from "@workspace/db/schema";
import { eq, isNull } from "drizzle-orm";
import {
  clearSession,
  getSessionId,
  createSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
  type SessionUser,
} from "../lib/auth";
import { logAudit } from "../lib/audit";
import { sendApprovalEmail, sendRejectionEmail } from "../lib/email";
import { schoolsTable } from "@workspace/db/schema";
import { z } from "zod";
import { authRateLimit, uploadRateLimit } from "../lib/rate-limit";
import { supabaseAdmin } from "../lib/supabase";

const WELCOME_UNITS = 50;

// Short-lived one-time exchange tokens for mobile auth
const mobileExchangeTokens = new Map<string, { sessionId: string; expiresAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [tok, data] of mobileExchangeTokens) {
    if (data.expiresAt < now) mobileExchangeTokens.delete(tok);
  }
}, 60_000);

const router: IRouter = Router();

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Grant welcome units to a brand-new user. No-op if they already have a row. */
async function grantWelcomeUnits(userId: string) {
  const [existing] = await db
    .select({ userId: userUnitsTable.userId })
    .from(userUnitsTable)
    .where(eq(userUnitsTable.userId, userId));

  if (existing) return;

  await db.insert(userUnitsTable).values({
    userId,
    balance: WELCOME_UNITS,
  }).onConflictDoNothing();

  await db.insert(unitsTransactionsTable).values({
    userId,
    type: "credit",
    amount: WELCOME_UNITS,
    description: `Welcome bonus — ${WELCOME_UNITS} free units to get you started`,
  });

  await logAudit("units_welcome", userId, userId, { amount: WELCOME_UNITS });
}

async function upsertUser(supabaseUserId: string, email: string | null, meta?: Record<string, unknown>) {
  const normalizedEmail = email?.toLowerCase() ?? null;
  const isAdmin = normalizedEmail && ADMIN_EMAILS.includes(normalizedEmail);

  const userData = {
    id: supabaseUserId,
    email: normalizedEmail,
    firstName: (meta?.first_name as string) || null,
    lastName: (meta?.last_name as string) || null,
    profileImageUrl: (meta?.avatar_url as string) || null,
  };

  const [existing] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, supabaseUserId));

  const isNew = !existing;
  const role = isAdmin ? "admin" : (existing?.role ?? "student");

  const [user] = await db
    .insert(usersTable)
    .values({
      ...userData,
      role,
      ...(isAdmin ? { approvalStatus: "approved" } : {}),
    })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        ...(isAdmin ? { role: "admin", approvalStatus: "approved" } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  if (isNew) {
    await grantWelcomeUnits(user.id);
    await logAudit("user_registered", user.id, user.id, { role });
  }

  return user;
}

function toSessionUser(dbUser: { id: string; email: string | null; firstName: string | null; lastName: string | null; profileImageUrl: string | null }): SessionUser {
  return {
    id: dbUser.id,
    email: dbUser.email ?? undefined,
    firstName: dbUser.firstName ?? undefined,
    lastName: dbUser.lastName ?? undefined,
    profileImageUrl: dbUser.profileImageUrl ?? undefined,
  };
}

// ── GET /api/auth/user ────────────────────────────────────────────────────────
router.get("/auth/user", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json({ authenticated: false });
    return;
  }

  const [unitsRow] = await db
    .select({ balance: userUnitsTable.balance })
    .from(userUnitsTable)
    .where(eq(userUnitsTable.userId, req.user.id));

  res.json({
    authenticated: true,
    user: {
      ...req.user,
      unitsBalance: unitsRow?.balance ?? 0,
    },
  });
});

// ── POST /api/auth/signin — email/password sign-in ───────────────────────────
const SignInBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/auth/signin", authRateLimit, async (req: Request, res: Response) => {
  const body = SignInBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid email or password format" });
    return;
  }

  const { data: authData, error } = await supabaseAdmin.auth.signInWithPassword({
    email: body.data.email,
    password: body.data.password,
  });

  if (error || !authData.user) {
    res.status(401).json({ error: error?.message ?? "Invalid credentials" });
    return;
  }

  const dbUser = await upsertUser(
    authData.user.id,
    authData.user.email ?? null,
    authData.user.user_metadata,
  );

  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email ?? undefined,
      firstName: dbUser.firstName ?? undefined,
      lastName: dbUser.lastName ?? undefined,
      profileImageUrl: dbUser.profileImageUrl ?? undefined,
    },
    access_token: authData.session!.access_token,
    refresh_token: authData.session!.refresh_token,
    expires_at: authData.session!.expires_at,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.json({ success: true });
});

// ── POST /api/auth/signup — new account registration ─────────────────────────
const SignUpBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

router.post("/auth/signup", authRateLimit, async (req: Request, res: Response) => {
  const body = SignUpBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.errors[0]?.message ?? "Invalid data" });
    return;
  }

  const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
    email: body.data.email,
    password: body.data.password,
    user_metadata: {
      first_name: body.data.firstName ?? null,
      last_name: body.data.lastName ?? null,
    },
    email_confirm: true,
  });

  if (error || !authData.user) {
    if (error?.message?.includes("already registered") || error?.code === "email_exists") {
      res.status(409).json({ error: "An account with this email already exists" });
    } else {
      res.status(400).json({ error: error?.message ?? "Registration failed" });
    }
    return;
  }

  const dbUser = await upsertUser(
    authData.user.id,
    authData.user.email ?? null,
    authData.user.user_metadata,
  );

  // Sign the user in immediately
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: body.data.email,
    password: body.data.password,
  });

  if (signInError || !signInData.session) {
    res.json({ success: true, requiresLogin: true });
    return;
  }

  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email ?? undefined,
      firstName: dbUser.firstName ?? undefined,
      lastName: dbUser.lastName ?? undefined,
      profileImageUrl: dbUser.profileImageUrl ?? undefined,
    },
    access_token: signInData.session.access_token,
    refresh_token: signInData.session.refresh_token,
    expires_at: signInData.session.expires_at,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.json({ success: true });
});

// ── POST /api/auth/magic-link — send magic link email ────────────────────────
router.post("/auth/magic-link", authRateLimit, async (req: Request, res: Response) => {
  const body = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const { error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: body.data.email,
  });

  if (error) {
    res.status(500).json({ error: "Failed to send magic link" });
    return;
  }

  res.json({ success: true });
});

// ── POST /api/auth/supabase-token — exchange Supabase JWT for session cookie ─
// Called by the frontend after it receives a Supabase session (e.g. OAuth callback,
// magic link, or mobile deep link). Verifies the token with Supabase, upserts the
// user row, then creates our own server-side session.
router.post("/auth/supabase-token", authRateLimit, async (req: Request, res: Response) => {
  const body = z.object({
    access_token: z.string(),
    refresh_token: z.string().optional(),
  }).safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "access_token required" });
    return;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(body.data.access_token);
  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const dbUser = await upsertUser(user.id, user.email ?? null, user.user_metadata);

  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email ?? undefined,
      firstName: dbUser.firstName ?? undefined,
      lastName: dbUser.lastName ?? undefined,
      profileImageUrl: dbUser.profileImageUrl ?? undefined,
    },
    access_token: body.data.access_token,
    refresh_token: body.data.refresh_token,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.json({ success: true });
});

// ── Mobile auth: exchange one-time token for session cookie ──────────────────
router.get("/auth/exchange", async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : null;
  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }

  const record = mobileExchangeTokens.get(token);
  if (!record || record.expiresAt < Date.now()) {
    mobileExchangeTokens.delete(token);
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  mobileExchangeTokens.delete(token);
  setSessionCookie(res, record.sessionId);
  res.json({ success: true });
});

// ── PATCH /api/auth/profile ───────────────────────────────────────────────────
const UpdateProfileBody = z.object({
  username: z.string().min(2).max(50).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

router.patch("/auth/profile", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const body = UpdateProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid data", details: body.error.flatten() });
    return;
  }

  const updates: Partial<{ username: string; firstName: string; lastName: string; updatedAt: Date }> = {
    updatedAt: new Date(),
  };
  if (body.data.username !== undefined) updates.username = body.data.username;
  if (body.data.firstName !== undefined) updates.firstName = body.data.firstName;
  if (body.data.lastName !== undefined) updates.lastName = body.data.lastName;

  if (body.data.username) {
    const [taken] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, body.data.username));
    if (taken && taken.id !== req.user.id) {
      res.status(409).json({ error: "Username is already taken" });
      return;
    }
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user.id))
    .returning();

  await logAudit("profile_update", req.user.id, req.user.id, { fields: Object.keys(body.data) });
  res.json({ success: true, user: updated });
});

// ── POST /api/auth/onboarding ─────────────────────────────────────────────────
const OnboardingBody = z.object({
  nickname: z.string().min(2).max(50),
  program: z.string().min(2).max(100),
  academicYear: z.string().min(1).max(20),
  semester: z.string().min(1).max(10),
  schoolId: z.string().optional(),
  institutionalEmail: z.string().email().optional().or(z.literal("")),
  studentIdImageUrl: z.string().url().optional().or(z.literal("")),
});

router.post("/auth/onboarding", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const body = OnboardingBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid data", details: body.error.flatten() });
    return;
  }

  const isAdmin = req.user.role === "admin";

  const [updated] = await db
    .update(usersTable)
    .set({
      nickname: body.data.nickname.trim(),
      program: body.data.program.trim(),
      academicYear: body.data.academicYear,
      semester: body.data.semester,
      schoolId: body.data.schoolId || null,
      institutionalEmail: body.data.institutionalEmail || null,
      studentIdImageUrl: body.data.studentIdImageUrl || null,
      approvalStatus: isAdmin ? "approved" : "pending",
      onboardingCompleted: true,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, req.user.id))
    .returning();

  req.user.nickname = updated.nickname;
  req.user.program = updated.program;
  req.user.academicYear = updated.academicYear;
  req.user.semester = updated.semester;
  req.user.onboardingCompleted = true;

  await logAudit("user_registered", req.user.id, req.user.id, {
    program: updated.program,
    academicYear: updated.academicYear,
    semester: updated.semester,
    schoolId: updated.schoolId,
    approvalStatus: updated.approvalStatus,
  });

  res.json({ success: true, user: updated });
});

// ── POST /api/auth/profile-photo ──────────────────────────────────────────────
router.post("/auth/profile-photo", uploadRateLimit, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const multer = (await import("multer")).default;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }).single("photo");

  upload(req, res, async (err: unknown) => {
    if (err) {
      res.status(400).json({ error: "Upload failed: " + (err instanceof Error ? err.message : String(err)) });
      return;
    }

    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedMimes.includes(file.mimetype)) {
        res.status(400).json({ error: "Only JPEG, PNG, GIF, and WebP images are allowed" });
        return;
      }

      // Upload to Supabase Storage
      const ext = file.mimetype.split("/")[1] ?? "jpg";
      const path = `avatars/${req.user!.id}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("avatars")
        .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });

      let profileImageUrl: string;
      if (uploadError) {
        // Fall back to base64 data URL if storage fails
        const base64 = file.buffer.toString("base64");
        profileImageUrl = `data:${file.mimetype};base64,${base64}`;
      } else {
        const { data } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);
        profileImageUrl = data.publicUrl;
      }

      await db
        .update(usersTable)
        .set({ profileImageUrl })
        .where(eq(usersTable.id, req.user!.id));

      res.json({ profileImageUrl });
    } catch (e) {
      console.error("Profile photo upload error:", e);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });
});

// ── POST /api/auth/student-id-upload ──────────────────────────────────────────
router.post("/auth/student-id-upload", uploadRateLimit, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const multer = (await import("multer")).default;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }).single("image");

  upload(req, res, async (err: unknown) => {
    if (err) {
      res.status(400).json({ error: "Upload failed: " + (err instanceof Error ? err.message : String(err)) });
      return;
    }
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) { res.status(400).json({ error: "No file uploaded" }); return; }
      const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedMimes.includes(file.mimetype)) {
        res.status(400).json({ error: "Only image files are allowed" });
        return;
      }
      const base64 = file.buffer.toString("base64");
      const dataUrl = `data:${file.mimetype};base64,${base64}`;
      res.json({ url: dataUrl });
    } catch (e) {
      console.error("Student ID upload error:", e);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });
});

// ── Admin: list pending users ─────────────────────────────────────────────────
router.get("/admin/users/pending", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      nickname: usersTable.nickname,
      program: usersTable.program,
      academicYear: usersTable.academicYear,
      semester: usersTable.semester,
      schoolId: usersTable.schoolId,
      schoolName: schoolsTable.name,
      institutionalEmail: usersTable.institutionalEmail,
      studentIdImageUrl: usersTable.studentIdImageUrl,
      approvalStatus: usersTable.approvalStatus,
      rejectionReason: usersTable.rejectionReason,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(schoolsTable, eq(usersTable.schoolId, schoolsTable.id))
    .where(eq(usersTable.approvalStatus, "pending"))
    .orderBy(usersTable.createdAt);
  res.json(rows);
});

// ── Admin: approve user ───────────────────────────────────────────────────────
router.post("/admin/users/:id/approve", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const id = req.params.id as string;
  const [user] = await db
    .update(usersTable)
    .set({ approvalStatus: "approved", rejectionReason: null, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await logAudit("approve_user", req.user.id, user.id, { email: user.email });

  let schoolName = "your institution";
  if (user.schoolId) {
    const [school] = await db.select({ name: schoolsTable.name }).from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
    if (school) schoolName = school.name;
  }

  const name = user.nickname || user.firstName || "Student";
  const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["host"]}`;

  if (user.email) {
    sendApprovalEmail({ to: user.email, name, school: schoolName, loginUrl: origin }).catch(console.error);
  }
  if (user.institutionalEmail && user.institutionalEmail !== user.email) {
    sendApprovalEmail({ to: user.institutionalEmail, name, school: schoolName, loginUrl: origin }).catch(console.error);
  }

  res.json({ success: true, user });
});

// ── Admin: reject user ────────────────────────────────────────────────────────
router.post("/admin/users/:id/reject", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const id = req.params.id as string;
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";

  const [user] = await db
    .update(usersTable)
    .set({ approvalStatus: "rejected", rejectionReason: reason || null, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await logAudit("reject_user", req.user.id, user.id, { email: user.email, reason });

  let schoolName = "your institution";
  if (user.schoolId) {
    const [school] = await db.select({ name: schoolsTable.name }).from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
    if (school) schoolName = school.name;
  }

  const name = user.nickname || user.firstName || "Student";
  const contactUrl = `https://wa.me/260978277538`;

  if (user.email) {
    sendRejectionEmail({ to: user.email, name, school: schoolName, reason, contactUrl }).catch(console.error);
  }
  if (user.institutionalEmail && user.institutionalEmail !== user.email) {
    sendRejectionEmail({ to: user.institutionalEmail, name, school: schoolName, reason, contactUrl }).catch(console.error);
  }

  res.json({ success: true, user });
});

// ── GET /api/logout ────────────────────────────────────────────────────────────
router.post("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

// Keep legacy GET /logout for any bookmarks
router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.redirect("/");
});

export default router;
