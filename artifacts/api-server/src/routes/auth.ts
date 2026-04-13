import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { userUnitsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { uploadRateLimit } from "../lib/rate-limit";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

router.get("/auth/user", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json({ authenticated: false });
    return;
  }

  const [unitsRow] = await db
    .select({ balance: userUnitsTable.balance })
    .from(userUnitsTable)
    .where(eq(userUnitsTable.userId, req.user!.id));

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

  if (body.data.username) {
    const [taken] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, body.data.username));
    if (taken && taken.id !== req.user!.id) {
      res.status(409).json({ error: "Username is already taken" });
      return;
    }
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user!.id))
    .returning();

  await logAudit("profile_update", req.user!.id, req.user!.id, {
    fields: Object.keys(body.data),
  });

  res.json({ success: true, user: updated });
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

export default router;
