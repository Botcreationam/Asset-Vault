import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { materialRequestsTable } from "@workspace/db/schema";
import { usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { createNotification } from "./notifications";

const router: IRouter = Router();

router.get("/material-requests", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    if (req.user!.role === "admin") {
      const requests = await db
        .select({
          id: materialRequestsTable.id,
          title: materialRequestsTable.title,
          description: materialRequestsTable.description,
          subject: materialRequestsTable.subject,
          courseCode: materialRequestsTable.courseCode,
          status: materialRequestsTable.status,
          adminNote: materialRequestsTable.adminNote,
          createdAt: materialRequestsTable.createdAt,
          updatedAt: materialRequestsTable.updatedAt,
          userId: materialRequestsTable.userId,
          username: usersTable.username,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
        })
        .from(materialRequestsTable)
        .leftJoin(usersTable, eq(materialRequestsTable.userId, usersTable.id))
        .orderBy(desc(materialRequestsTable.createdAt));
      res.json({ requests });
    } else {
      const requests = await db
        .select()
        .from(materialRequestsTable)
        .where(eq(materialRequestsTable.userId, req.user!.id))
        .orderBy(desc(materialRequestsTable.createdAt));
      res.json({ requests });
    }
  } catch {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

router.post("/material-requests", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { title, description, subject, courseCode } = req.body;
  if (!title?.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  try {
    const [request] = await db
      .insert(materialRequestsTable)
      .values({
        userId: req.user!.id,
        title: title.trim(),
        description: description?.trim() || null,
        subject: subject?.trim() || null,
        courseCode: courseCode?.trim() || null,
      })
      .returning();
    res.json({ request });
  } catch {
    res.status(500).json({ error: "Failed to create request" });
  }
});

router.patch("/material-requests/:id", async (req, res) => {
  if (!req.isAuthenticated() || req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { id } = req.params;
  const { status, adminNote } = req.body;
  if (!status) {
    res.status(400).json({ error: "Status required" });
    return;
  }
  try {
    const [updated] = await db
      .update(materialRequestsTable)
      .set({ status, adminNote: adminNote || null, updatedAt: new Date() })
      .where(eq(materialRequestsTable.id, parseInt(id)))
      .returning();

    if (status === "fulfilled" && updated) {
      await createNotification({
        userId: updated.userId,
        type: "request_fulfilled",
        title: "Your material request has been fulfilled!",
        body: `Your request for "${updated.title}" is now available in the library.`,
        relatedId: String(updated.id),
      });
    }

    res.json({ request: updated });
  } catch {
    res.status(500).json({ error: "Failed to update request" });
  }
});

export default router;
