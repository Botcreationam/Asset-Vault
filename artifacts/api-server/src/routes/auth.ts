import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { userUnitsTable, unitsTransactionsTable, auditLogsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
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
import { z } from "zod";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;
const WELCOME_UNITS = 50;

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

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "frankmwalu04@gmail.com")
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
    .values({ ...userData, role })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        ...(isAdmin ? { role: "admin" } : {}),
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

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

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

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

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
  res.redirect(returnTo);
});

router.post("/auth/profile-photo", async (req: Request, res: Response) => {
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
