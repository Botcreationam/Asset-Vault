import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import {
  resourcesTable,
  unitsTransactionsTable,
  userUnitsTable,
  auditLogsTable,
  resourceRatingsTable,
  materialRequestsTable,
} from "@workspace/db/schema";
import { eq, count, sum, avg, desc, gte, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/admin/analytics", async (req, res) => {
  if (!req.isAuthenticated() || req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers] = await db
      .select({ count: count(usersTable.id) })
      .from(usersTable);

    const [totalResources] = await db
      .select({ count: count(resourcesTable.id) })
      .from(resourcesTable)
      .where(eq(resourcesTable.isActive, true));

    const [totalDownloads] = await db
      .select({ total: sum(resourcesTable.downloadCount) })
      .from(resourcesTable);

    const [totalViews] = await db
      .select({ total: sum(resourcesTable.viewCount) })
      .from(resourcesTable);

    const [unitsCirculating] = await db
      .select({ total: sum(userUnitsTable.balance) })
      .from(userUnitsTable);

    const [unitsGranted] = await db
      .select({ total: sum(unitsTransactionsTable.amount) })
      .from(unitsTransactionsTable)
      .where(eq(unitsTransactionsTable.type, "credit"));

    const topResources = await db
      .select({
        id: resourcesTable.id,
        name: resourcesTable.name,
        type: resourcesTable.type,
        downloadCount: resourcesTable.downloadCount,
        viewCount: resourcesTable.viewCount,
      })
      .from(resourcesTable)
      .where(eq(resourcesTable.isActive, true))
      .orderBy(desc(resourcesTable.downloadCount))
      .limit(10);

    const recentActivity = await db
      .select({
        id: auditLogsTable.id,
        action: auditLogsTable.action,
        actorId: auditLogsTable.actorId,
        details: auditLogsTable.details,
        createdAt: auditLogsTable.createdAt,
        username: usersTable.username,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
      })
      .from(auditLogsTable)
      .leftJoin(usersTable, eq(auditLogsTable.actorId, usersTable.id))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(20);

    const resourcesByType = await db
      .select({
        type: resourcesTable.type,
        count: count(resourcesTable.id),
      })
      .from(resourcesTable)
      .where(eq(resourcesTable.isActive, true))
      .groupBy(resourcesTable.type);

    const [avgRating] = await db
      .select({ avg: avg(resourceRatingsTable.rating) })
      .from(resourceRatingsTable);

    const [totalRatings] = await db
      .select({ count: count(resourceRatingsTable.id) })
      .from(resourceRatingsTable);

    const [pendingRequests] = await db
      .select({ count: count(materialRequestsTable.id) })
      .from(materialRequestsTable)
      .where(eq(materialRequestsTable.status, "pending"));

    const recentUsers = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(5);

    res.json({
      overview: {
        totalUsers: totalUsers.count,
        totalResources: totalResources.count,
        totalDownloads: Number(totalDownloads.total) || 0,
        totalViews: Number(totalViews.total) || 0,
        unitsCirculating: Number(unitsCirculating.total) || 0,
        unitsGranted: Number(unitsGranted.total) || 0,
        avgRating: avgRating.avg ? parseFloat(avgRating.avg as string) : 0,
        totalRatings: totalRatings.count,
        pendingRequests: pendingRequests.count,
      },
      topResources,
      resourcesByType,
      recentActivity,
      recentUsers,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
