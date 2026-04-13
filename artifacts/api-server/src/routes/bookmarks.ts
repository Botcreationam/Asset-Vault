import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resourceBookmarksTable, resourcesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

// GET /bookmarks — list user's bookmarked resources
router.get("/bookmarks", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const rows = await db
      .select({
        bookmarkId: resourceBookmarksTable.id,
        bookmarkedAt: resourceBookmarksTable.createdAt,
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
      })
      .from(resourceBookmarksTable)
      .innerJoin(resourcesTable, eq(resourceBookmarksTable.resourceId, resourcesTable.id))
      .where(
        and(
          eq(resourceBookmarksTable.userId, req.user!.id),
          eq(resourcesTable.isActive, true),
        ),
      )
      .orderBy(desc(resourceBookmarksTable.createdAt));

    res.json({
      bookmarks: rows.map((r) => ({
        bookmarkId: r.bookmarkId,
        bookmarkedAt: r.bookmarkedAt,
        id: r.id,
        name: r.name,
        description: r.description,
        type: r.type,
        folderId: r.folderId,
        fileSize: r.fileSize,
        downloadCost: r.downloadCost,
        downloadCount: r.downloadCount,
        viewCount: r.viewCount,
        tags: r.tags ? r.tags.split(",").filter(Boolean) : [],
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list bookmarks");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /bookmarks/:resourceId — toggle bookmark
router.post("/bookmarks/:resourceId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { resourceId } = req.params;
  try {
    const [existing] = await db
      .select({ id: resourceBookmarksTable.id })
      .from(resourceBookmarksTable)
      .where(
        and(
          eq(resourceBookmarksTable.userId, req.user!.id),
          eq(resourceBookmarksTable.resourceId, resourceId),
        ),
      );

    if (existing) {
      await db.delete(resourceBookmarksTable).where(eq(resourceBookmarksTable.id, existing.id));
      res.json({ bookmarked: false });
    } else {
      await db.insert(resourceBookmarksTable).values({ userId: req.user!.id, resourceId });
      res.json({ bookmarked: true });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to toggle bookmark");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /bookmarks/check/:resourceId — check if bookmarked
router.get("/bookmarks/check/:resourceId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.json({ bookmarked: false });
    return;
  }
  const { resourceId } = req.params;
  try {
    const [existing] = await db
      .select({ id: resourceBookmarksTable.id })
      .from(resourceBookmarksTable)
      .where(
        and(
          eq(resourceBookmarksTable.userId, req.user!.id),
          eq(resourceBookmarksTable.resourceId, resourceId),
        ),
      );
    res.json({ bookmarked: !!existing });
  } catch (err) {
    res.json({ bookmarked: false });
  }
});

export default router;
