import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, desc, and, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/notifications", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, req.user!.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    const unreadCount = await db
      .select({ count: count(notificationsTable.id) })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, req.user!.id),
          eq(notificationsTable.isRead, false),
        ),
      );

    res.json({
      notifications,
      unreadCount: unreadCount[0]?.count ?? 0,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.patch("/notifications/read-all", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, req.user!.id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const notifId = parseInt(req.params.id);
  try {
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, notifId),
          eq(notificationsTable.userId, req.user!.id),
        ),
      );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

export async function createNotification({
  userId,
  type,
  title,
  body,
  relatedId,
}: {
  userId: string;
  type: "resource_approved" | "units_received" | "request_fulfilled" | "system" | "new_resource";
  title: string;
  body: string;
  relatedId?: string;
}) {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, body, relatedId });
  } catch {
  }
}

export default router;
