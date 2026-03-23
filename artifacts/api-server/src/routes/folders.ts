import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  foldersTable,
  resourcesTable,
} from "@workspace/db/schema";
import {
  CreateFolderBody,
  ListFoldersQueryParams,
  GetFolderParams,
  DeleteFolderParams,
  GetFolderPathParams,
} from "@workspace/api-zod";
import { eq, isNull, count, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/folders", async (req, res) => {
  try {
    const query = ListFoldersQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query" });
      return;
    }

    const { parentId } = query.data;

    const folders = await db
      .select({
        id: foldersTable.id,
        name: foldersTable.name,
        description: foldersTable.description,
        parentId: foldersTable.parentId,
        level: foldersTable.level,
        icon: foldersTable.icon,
        createdAt: foldersTable.createdAt,
      })
      .from(foldersTable)
      .where(parentId ? eq(foldersTable.parentId, parentId) : isNull(foldersTable.parentId));

    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const [subfoldersCount] = await db
          .select({ count: count() })
          .from(foldersTable)
          .where(eq(foldersTable.parentId, folder.id));

        const [resourcesCount] = await db
          .select({ count: count() })
          .from(resourcesTable)
          .where(eq(resourcesTable.folderId, folder.id));

        return {
          ...folder,
          subfolderCount: subfoldersCount?.count ?? 0,
          resourceCount: resourcesCount?.count ?? 0,
        };
      })
    );

    res.json({ folders: foldersWithCounts });
  } catch (err) {
    req.log.error({ err }, "Failed to list folders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/folders", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const body = CreateFolderBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid body", details: body.error });
      return;
    }

    let level = 0;
    if (body.data.parentId) {
      const [parent] = await db
        .select({ level: foldersTable.level })
        .from(foldersTable)
        .where(eq(foldersTable.id, body.data.parentId));
      if (!parent) {
        res.status(404).json({ error: "Parent folder not found" });
        return;
      }
      level = parent.level + 1;
    }

    const [folder] = await db
      .insert(foldersTable)
      .values({
        id: randomUUID(),
        name: body.data.name,
        description: body.data.description ?? null,
        parentId: body.data.parentId ?? null,
        icon: body.data.icon ?? null,
        level,
        createdBy: req.user.id,
      })
      .returning();

    res.status(201).json({ ...folder, subfolderCount: 0, resourceCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create folder");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/folders/:folderId", async (req, res) => {
  try {
    const params = GetFolderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    const [folder] = await db
      .select()
      .from(foldersTable)
      .where(eq(foldersTable.id, params.data.folderId));

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    const [subfoldersCount] = await db
      .select({ count: count() })
      .from(foldersTable)
      .where(eq(foldersTable.parentId, folder.id));

    const [resourcesCount] = await db
      .select({ count: count() })
      .from(resourcesTable)
      .where(eq(resourcesTable.folderId, folder.id));

    res.json({
      ...folder,
      subfolderCount: subfoldersCount?.count ?? 0,
      resourceCount: resourcesCount?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get folder");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/folders/:folderId", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const params = DeleteFolderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    await db.delete(foldersTable).where(eq(foldersTable.id, params.data.folderId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete folder");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/folder-path/:folderId", async (req, res) => {
  try {
    const params = GetFolderPathParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    const path: typeof foldersTable.$inferSelect[] = [];
    let currentId: string | null = params.data.folderId;

    while (currentId) {
      const [folder] = await db
        .select()
        .from(foldersTable)
        .where(eq(foldersTable.id, currentId));

      if (!folder) break;
      path.unshift(folder);
      currentId = folder.parentId;
    }

    res.json({ path });
  } catch (err) {
    req.log.error({ err }, "Failed to get folder path");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
