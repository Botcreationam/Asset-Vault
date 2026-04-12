import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  userUnitsTable,
  unitsTransactionsTable,
  usersTable,
  auditLogsTable,
} from "@workspace/db/schema";
import {
  TopUpUnitsBody,
  AdminGrantUnitsBody,
  AdminGrantUnitsParams,
  AdminUpdateUserRoleBody,
  AdminUpdateUserRoleParams,
} from "@workspace/api-zod";
import { eq, desc, sql } from "drizzle-orm";
import { logAudit } from "../lib/audit";
import { topupRateLimit } from "../lib/rate-limit";

const router: IRouter = Router();

async function ensureUserUnits(userId: string) {
  const [existing] = await db
    .select()
    .from(userUnitsTable)
    .where(eq(userUnitsTable.userId, userId));

  if (!existing) {
    await db.insert(userUnitsTable).values({
      userId,
      balance: 0,
    }).onConflictDoNothing();

    return 0;
  }

  return existing.balance;
}

router.get("/units/balance", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const balance = await ensureUserUnits(req.user.id);
    res.json({ balance });
  } catch (err) {
    req.log.error({ err }, "Failed to get units balance");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/units/transactions", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const transactions = await db
      .select()
      .from(unitsTransactionsTable)
      .where(eq(unitsTransactionsTable.userId, req.user.id))
      .orderBy(desc(unitsTransactionsTable.createdAt))
      .limit(50);

    res.json({ transactions });
  } catch (err) {
    req.log.error({ err }, "Failed to get transactions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/units/topup", topupRateLimit, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (req.user.role !== "admin") {
      res.status(403).json({ error: "Self-service topup is disabled. Contact an admin to receive units." });
      return;
    }

    const body = TopUpUnitsBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const { amount } = body.data;
    if (amount <= 0 || amount > 1000) {
      res.status(400).json({ error: "Invalid amount (max 1000)" });
      return;
    }

    await ensureUserUnits(req.user.id);

    const [updated] = await db
      .update(userUnitsTable)
      .set({
        balance: sql`${userUnitsTable.balance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(userUnitsTable.userId, req.user.id))
      .returning({ balance: userUnitsTable.balance });

    await db.insert(unitsTransactionsTable).values({
      userId: req.user.id,
      type: "credit",
      amount,
      description: `Admin self top-up of ${amount} units`,
    });

    await logAudit("grant_units", req.user.id, req.user.id, { amount, selfTopup: true });

    res.json({ balance: updated?.balance ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to top up units");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/users", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const PERM_ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .limit(200);

    const usersWithUnits = await Promise.all(
      users.map(async (u) => {
        const balance = await ensureUserUnits(u.id);
        const isPermanentAdmin = !!(u.email && PERM_ADMIN_EMAILS.includes(u.email.toLowerCase()));
        return { ...u, unitsBalance: balance, downloadCount: 0, isPermanentAdmin };
      })
    );

    res.json({ users: usersWithUnits });
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/users/:userId/role", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const params = AdminUpdateUserRoleParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    const body = AdminUpdateUserRoleBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const PERMANENT_ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const [targetUser] = await db
      .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, params.data.userId));

    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (
      targetUser.email &&
      PERMANENT_ADMIN_EMAILS.includes(targetUser.email.toLowerCase()) &&
      body.data.role !== "admin"
    ) {
      res.status(403).json({ error: "This admin account is permanently protected and cannot be demoted" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ role: body.data.role })
      .where(eq(usersTable.id, params.data.userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await logAudit("change_role", req.user.id, updated.id, {
      newRole: body.data.role,
    });

    const balance = await ensureUserUnits(updated.id);
    res.json({ ...updated, unitsBalance: balance, downloadCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to update user role");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/users/:userId/units", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const params = AdminGrantUnitsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    const body = AdminGrantUnitsBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const { amount, description } = body.data;
    await ensureUserUnits(params.data.userId);

    const [updated] = await db
      .update(userUnitsTable)
      .set({
        balance: sql`${userUnitsTable.balance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(userUnitsTable.userId, params.data.userId))
      .returning({ balance: userUnitsTable.balance });

    await db.insert(unitsTransactionsTable).values({
      userId: params.data.userId,
      type: "credit",
      amount,
      description: description ?? `Admin granted ${amount} units`,
    });

    await logAudit("grant_units", req.user.id, params.data.userId, {
      amount,
      description,
    });

    res.json({ balance: updated?.balance ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to grant units");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: list audit logs ────────────────────────────────────────────────────
router.get("/admin/audit-logs", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const logs = await db
      .select({
        id: auditLogsTable.id,
        action: auditLogsTable.action,
        actorId: auditLogsTable.actorId,
        targetId: auditLogsTable.targetId,
        details: auditLogsTable.details,
        createdAt: auditLogsTable.createdAt,
        actorUsername: usersTable.username,
        actorFirstName: usersTable.firstName,
        actorLastName: usersTable.lastName,
      })
      .from(auditLogsTable)
      .leftJoin(usersTable, eq(auditLogsTable.actorId, usersTable.id))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(200);

    res.json({ logs });
  } catch (err) {
    req.log.error({ err }, "Failed to get audit logs");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { ensureUserUnits };
export default router;
