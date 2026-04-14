import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { schoolsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

router.get("/schools", async (_req: Request, res: Response) => {
  const schools = await db
    .select()
    .from(schoolsTable)
    .where(eq(schoolsTable.isActive, true))
    .orderBy(schoolsTable.name);
  res.json(schools);
});

const CreateSchoolBody = z.object({
  name: z.string().min(3).max(200),
  shortName: z.string().min(2).max(20).optional(),
  country: z.string().min(2).max(100).optional(),
  emailDomain: z.string().optional(),
});

router.post("/admin/schools", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const body = CreateSchoolBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid data", details: body.error.flatten() });
    return;
  }
  const id = crypto.randomUUID();
  const [school] = await db
    .insert(schoolsTable)
    .values({
      id,
      name: body.data.name.trim(),
      shortName: body.data.shortName?.trim(),
      country: body.data.country?.trim() || "Zambia",
      emailDomain: body.data.emailDomain?.trim().toLowerCase() || null,
    })
    .returning();
  res.json(school);
});

router.patch("/admin/schools/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const id = req.params.id as string;
  const body = CreateSchoolBody.partial().merge(z.object({ isActive: z.boolean().optional() })).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid data", details: body.error.flatten() });
    return;
  }
  const [school] = await db
    .update(schoolsTable)
    .set({ ...body.data })
    .where(eq(schoolsTable.id, id))
    .returning();
  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }
  res.json(school);
});

export default router;
