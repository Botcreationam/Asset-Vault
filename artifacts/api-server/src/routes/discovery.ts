import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resourcesTable, unitsTransactionsTable, resourceRatingsTable } from "@workspace/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

const router: IRouter = Router();

const RESOURCE_FIELDS = {
  id: resourcesTable.id,
  name: resourcesTable.name,
  description: resourcesTable.description,
  type: resourcesTable.type,
  folderId: resourcesTable.folderId,
  fileSize: resourcesTable.fileSize,
  downloadCost: resourcesTable.downloadCost,
  downloadCount: resourcesTable.downloadCount,
  viewCount: resourcesTable.viewCount,
  tags: resourcesTable.tags,
  createdAt: resourcesTable.createdAt,
};

function formatResource(r: any) {
  return {
    ...r,
    tags: r.tags ? r.tags.split(",").filter(Boolean) : [],
    createdAt: r.createdAt,
  };
}

// GET /discovery/trending — top resources by views + downloads in last 14 days
router.get("/discovery/trending", async (_req, res) => {
  try {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        ...RESOURCE_FIELDS,
        score: sql<number>`(${resourcesTable.viewCount} + ${resourcesTable.downloadCount} * 3)`.as("score"),
      })
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.isActive, true),
          gte(resourcesTable.createdAt, since),
        ),
      )
      .orderBy(desc(sql`${resourcesTable.viewCount} + ${resourcesTable.downloadCount} * 3`))
      .limit(8);

    // If not enough recent resources, fall back to all-time
    if (rows.length < 4) {
      const allRows = await db
        .select({
          ...RESOURCE_FIELDS,
          score: sql<number>`(${resourcesTable.viewCount} + ${resourcesTable.downloadCount} * 3)`.as("score"),
        })
        .from(resourcesTable)
        .where(eq(resourcesTable.isActive, true))
        .orderBy(desc(sql`${resourcesTable.viewCount} + ${resourcesTable.downloadCount} * 3`))
        .limit(8);
      res.json({ resources: allRows.map(formatResource) });
      return;
    }

    res.json({ resources: rows.map(formatResource) });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /discovery/top-rated — top resources by average star rating
router.get("/discovery/top-rated", async (_req, res) => {
  try {
    const rows = await db
      .select({
        ...RESOURCE_FIELDS,
        avgRating: sql<number>`ROUND(AVG(${resourceRatingsTable.rating})::numeric, 1)`.as("avg_rating"),
        ratingCount: sql<number>`COUNT(${resourceRatingsTable.id})`.as("rating_count"),
      })
      .from(resourcesTable)
      .innerJoin(resourceRatingsTable, eq(resourceRatingsTable.resourceId, resourcesTable.id))
      .where(eq(resourcesTable.isActive, true))
      .groupBy(
        resourcesTable.id,
        resourcesTable.name,
        resourcesTable.description,
        resourcesTable.type,
        resourcesTable.folderId,
        resourcesTable.fileSize,
        resourcesTable.downloadCost,
        resourcesTable.downloadCount,
        resourcesTable.viewCount,
        resourcesTable.tags,
        resourcesTable.createdAt,
      )
      .having(sql`COUNT(${resourceRatingsTable.id}) >= 1`)
      .orderBy(
        desc(sql`AVG(${resourceRatingsTable.rating})`),
        desc(sql`COUNT(${resourceRatingsTable.id})`),
      )
      .limit(8);

    res.json({ resources: rows.map(formatResource) });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /discovery/recent — latest 8 resources
router.get("/discovery/recent", async (_req, res) => {
  try {
    const rows = await db
      .select(RESOURCE_FIELDS)
      .from(resourcesTable)
      .where(eq(resourcesTable.isActive, true))
      .orderBy(desc(resourcesTable.createdAt))
      .limit(8);

    res.json({ resources: rows.map(formatResource) });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /discovery/stats — platform-level statistics
router.get("/discovery/stats", async (_req, res) => {
  try {
    const [stats] = await db
      .select({
        totalResources: sql<number>`COUNT(*)`.as("total_resources"),
        totalDownloads: sql<number>`COALESCE(SUM(${resourcesTable.downloadCount}), 0)`.as("total_downloads"),
        totalViews: sql<number>`COALESCE(SUM(${resourcesTable.viewCount}), 0)`.as("total_views"),
      })
      .from(resourcesTable)
      .where(eq(resourcesTable.isActive, true));

    res.json({
      totalResources: Number(stats?.totalResources ?? 0),
      totalDownloads: Number(stats?.totalDownloads ?? 0),
      totalViews: Number(stats?.totalViews ?? 0),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /users/me/downloads — current user's download history
router.get("/users/me/downloads", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const rows = await db
      .select({
        txId: unitsTransactionsTable.id,
        amount: unitsTransactionsTable.amount,
        downloadedAt: unitsTransactionsTable.createdAt,
        resourceId: resourcesTable.id,
        resourceName: resourcesTable.name,
        resourceType: resourcesTable.type,
        resourceFileSize: resourcesTable.fileSize,
        resourceFolderId: resourcesTable.folderId,
        resourceIsActive: resourcesTable.isActive,
      })
      .from(unitsTransactionsTable)
      .innerJoin(resourcesTable, eq(unitsTransactionsTable.resourceId, resourcesTable.id))
      .where(
        and(
          eq(unitsTransactionsTable.userId, req.user!.id),
          eq(unitsTransactionsTable.type, "debit"),
        ),
      )
      .orderBy(desc(unitsTransactionsTable.createdAt))
      .limit(100);

    res.json({
      downloads: rows.map((r) => ({
        txId: r.txId,
        amount: r.amount,
        downloadedAt: r.downloadedAt,
        resource: {
          id: r.resourceId,
          name: r.resourceName,
          type: r.resourceType,
          fileSize: r.resourceFileSize,
          folderId: r.resourceFolderId,
          isActive: r.resourceIsActive,
        },
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get download history");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
