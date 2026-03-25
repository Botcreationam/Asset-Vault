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
import { eq, desc } from "drizzle-orm";
import { logAudit } from "../lib/audit";

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

router.post("/units/topup", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const body = TopUpUnitsBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const { amount } = body.data;
    if (amount <= 0 || amount > 10000) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }

    const currentBalance = await ensureUserUnits(req.user.id);

    await db
      .insert(userUnitsTable)
      .values({ userId: req.user.id, balance: currentBalance + amount })
      .onConflictDoUpdate({
        target: userUnitsTable.userId,
        set: { balance: currentBalance + amount, updatedAt: new Date() },
      });

    await db.insert(unitsTransactionsTable).values({
      userId: req.user.id,
      type: "credit",
      amount,
      description: `Top-up of ${amount} units`,
    });

    res.json({ balance: currentBalance + amount });
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

    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
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
        return { ...u, unitsBalance: balance, downloadCount: 0 };
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
    const currentBalance = await ensureUserUnits(params.data.userId);
    const newBalance = currentBalance + amount;

    await db
      .insert(userUnitsTable)
      .values({ userId: params.data.userId, balance: newBalance })
      .onConflictDoUpdate({
        target: userUnitsTable.userId,
        set: { balance: newBalance, updatedAt: new Date() },
      });

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

    res.json({ balance: newBalance });
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
