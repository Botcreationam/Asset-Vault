import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { userUnitsTable, unitsTransactionsTable, auditLogsTable } from "@workspace/db/schema";
import { eq, isNull } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";
import { logAudit } from "../lib/audit";
import { sendApprovalEmail, sendRejectionEmail } from "../lib/email";
import { schoolsTable } from "@workspace/db/schema";
import { z } from "zod";
import { authRateLimit, uploadRateLimit } from "../lib/rate-limit";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;
const WELCOME_UNITS = 50;

// Short-lived one-time exchange tokens for mobile auth (bypasses ASWebAuthenticationSession cookie isolation)
const mobileExchangeTokens = new Map<string, { sessionId: string; expiresAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [tok, data] of mobileExchangeTokens) {
    if (data.expiresAt < now) mobileExchangeTokens.delete(tok);
  }
}, 60_000);

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

/** Validate a mobile deep-link URL (Expo Go `exp://` or custom scheme `acadvault-mobile://`). */
function getSafeMobileReturnTo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.startsWith("exp://") || value.startsWith("acadvault-mobile://")) {
    return value;
  }
  return null;
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

  if (existing) return; // already onboarded

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

async function upsertUser(claims: Record<string, unknown>) {
  const email = ((claims.email as string) || "").toLowerCase() || null;
  const isAdmin = email && ADMIN_EMAILS.includes(email);

  const userData = {
    id: claims.sub as string,
    username: (claims.username as string) || null,
    email: email || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as
      | string
      | null,
  };

  const [existing] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userData.id));

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
    await logAudit("user_registered", user.id, user.id, {
      username: user.username,
      role,
    });
  }

  return user;
}

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

  // Check username uniqueness if being changed
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

  await logAudit("profile_update", req.user.id, req.user.id, {
    fields: Object.keys(body.data),
  });

  res.json({ success: true, user: updated });
});

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

  // Admins are auto-approved; everyone else starts as pending for review
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

router.get("/login", authRateLimit, async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);
  const mobileReturnTo = getSafeMobileReturnTo(req.query.mobileReturnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);
  if (mobileReturnTo) {
    setOidcCookie(res, "mobile_return_to", mobileReturnTo);
  }

  res.redirect(redirectTo.href);
});

router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);
  const mobileReturnTo = getSafeMobileReturnTo(req.cookies?.mobile_return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });
  res.clearCookie("mobile_return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(
    claims as unknown as Record<string, unknown>,
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);

  // If this was a mobile login, embed a one-time exchange token in the deep link.
  // The app uses this token to call /api/auth/exchange via a regular fetch, which sets
  // the session cookie through iOS's normal HTTP stack (not ASWebAuthenticationSession's
  // isolated cookie jar — those two stores do NOT share cookies).
  if (mobileReturnTo) {
    const exchangeToken = oidc.randomState();
    mobileExchangeTokens.set(exchangeToken, { sessionId: sid, expiresAt: Date.now() + 2 * 60 * 1000 });
    const deepLink = `${mobileReturnTo}${mobileReturnTo.includes("?") ? "&" : "?"}token=${exchangeToken}`;
    res.redirect(deepLink);
    return;
  }

  res.redirect(returnTo);
});

// Called by the mobile app after openAuthSessionAsync returns — trades the one-time exchange
// token for a real session cookie via a normal fetch (bypassing the ASWebAuthenticationSession
// cookie-jar isolation issue on iOS).
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

  mobileExchangeTokens.delete(token); // one-time use
  setSessionCookie(res, record.sessionId);
  res.json({ success: true });
});

router.post("/auth/profile-photo", uploadRateLimit, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const multer = (await import("multer")).default;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }).single("photo");

  upload(req, res, async (err: any) => {
    if (err) {
      res.status(400).json({ error: "Upload failed: " + err.message });
      return;
    }

    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedMimes.includes(file.mimetype)) {
        res.status(400).json({ error: "Only JPEG, PNG, GIF, and WebP images are allowed" });
        return;
      }

      const base64 = file.buffer.toString("base64");
      const dataUrl = `data:${file.mimetype};base64,${base64}`;

      await db
        .update(usersTable)
        .set({ profileImageUrl: dataUrl })
        .where(eq(usersTable.id, req.user!.id));

      res.json({ profileImageUrl: dataUrl });
    } catch (e) {
      console.error("Profile photo upload error:", e);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });
});

// Student ID image upload for verification
router.post("/auth/student-id-upload", uploadRateLimit, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const multer = (await import("multer")).default;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }).single("image");

  upload(req, res, async (err: any) => {
    if (err) {
      res.status(400).json({ error: "Upload failed: " + err.message });
      return;
    }
    try {
      const file = (req as any).file;
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

// ── Admin: list pending users ────────────────────────────────────────────────
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
  const { id } = req.params;
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

  // Get school name for email
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
  const { id } = req.params;
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
  const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["host"]}`;
  const contactUrl = `https://wa.me/260978277538`;

  if (user.email) {
    sendRejectionEmail({ to: user.email, name, school: schoolName, reason, contactUrl }).catch(console.error);
  }
  if (user.institutionalEmail && user.institutionalEmail !== user.email) {
    sendRejectionEmail({ to: user.institutionalEmail, name, school: schoolName, reason, contactUrl }).catch(console.error);
  }

  res.json({ success: true, user });
});

router.get("/logout", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

export default router;
