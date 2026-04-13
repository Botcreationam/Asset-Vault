import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { resourceRatingsTable } from "@workspace/db/schema";
import { eq, desc, avg, count, and } from "drizzle-orm";
import { usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/resources/:id/ratings", async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await db
      .select({
        id: resourceRatingsTable.id,
        rating: resourceRatingsTable.rating,
        review: resourceRatingsTable.review,
        createdAt: resourceRatingsTable.createdAt,
        userId: resourceRatingsTable.userId,
        username: usersTable.username,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
      })
      .from(resourceRatingsTable)
      .leftJoin(usersTable, eq(resourceRatingsTable.userId, usersTable.id))
      .where(eq(resourceRatingsTable.resourceId, id))
      .orderBy(desc(resourceRatingsTable.createdAt));

    const stats = await db
      .select({
        avg: avg(resourceRatingsTable.rating),
        count: count(resourceRatingsTable.id),
      })
      .from(resourceRatingsTable)
      .where(eq(resourceRatingsTable.resourceId, id));

    const userRating = req.isAuthenticated()
      ? await db
          .select()
          .from(resourceRatingsTable)
          .where(
            and(
              eq(resourceRatingsTable.resourceId, id),
              eq(resourceRatingsTable.userId, req.user!.id),
            ),
          )
          .limit(1)
      : [];

    res.json({
      ratings: rows,
      average: stats[0]?.avg ? parseFloat(stats[0].avg as string) : 0,
      count: stats[0]?.count ?? 0,
      userRating: userRating[0] ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
});

router.post("/resources/:id/ratings", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { id } = req.params;
  const { rating, review } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be 1-5" });
    return;
  }
  try {
    const existing = await db
      .select()
      .from(resourceRatingsTable)
      .where(
        and(
          eq(resourceRatingsTable.resourceId, id),
          eq(resourceRatingsTable.userId, req.user!.id),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(resourceRatingsTable)
        .set({ rating, review: review || null, updatedAt: new Date() })
        .where(
          and(
            eq(resourceRatingsTable.resourceId, id),
            eq(resourceRatingsTable.userId, req.user!.id),
          ),
        )
        .returning();
      res.json({ rating: updated });
    } else {
      const [created] = await db
        .insert(resourceRatingsTable)
        .values({
          resourceId: id,
          userId: req.user!.id,
          rating,
          review: review || null,
        })
        .returning();
      res.json({ rating: created });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to save rating" });
  }
});

router.delete("/resources/:id/ratings", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { id } = req.params;
  try {
    await db
      .delete(resourceRatingsTable)
      .where(
        and(
          eq(resourceRatingsTable.resourceId, id),
          eq(resourceRatingsTable.userId, req.user!.id),
        ),
      );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete rating" });
  }
});

export default router;
