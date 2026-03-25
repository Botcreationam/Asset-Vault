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
import { eq, isNull, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logAudit } from "../lib/audit";
import { z } from "zod";

const router: IRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getFolderWithCounts(folderId: string) {
  const [folder] = await db
    .select()
    .from(foldersTable)
    .where(eq(foldersTable.id, folderId));

  if (!folder) return null;

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
}

/** Recursively collect all descendant folder IDs (depth-first). */
async function collectDescendantIds(folderId: string): Promise<string[]> {
  const children = await db
    .select({ id: foldersTable.id })
    .from(foldersTable)
    .where(eq(foldersTable.parentId, folderId));

  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    const nested = await collectDescendantIds(child.id);
    ids.push(...nested);
  }
  return ids;
}

/** Delete a folder and ALL its descendants + their resources. */
async function cascadeDeleteFolder(folderId: string, actorId: string) {
  const descendantIds = await collectDescendantIds(folderId);
  const allIds = [folderId, ...descendantIds];

  // Delete all resources in every affected folder
  for (const id of allIds) {
    await db
      .delete(resourcesTable)
      .where(eq(resourcesTable.folderId, id));
  }

  // Delete folders from deepest first (leaf → root)
  for (const id of [...descendantIds].reverse()) {
    await db.delete(foldersTable).where(eq(foldersTable.id, id));
  }
  await db.delete(foldersTable).where(eq(foldersTable.id, folderId));

  await logAudit("delete_folder", actorId, folderId, {
    cascadeIds: descendantIds,
  });
}

// ── GET /folders ─────────────────────────────────────────────────────────────

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

// ── GET /folders/all ─────────────────────────────────────────────────────────
// Returns every folder (for admin dropdowns). No parentId filter.
router.get("/folders/all", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const folders = await db
      .select()
      .from(foldersTable)
      .orderBy(foldersTable.level, foldersTable.name);
    res.json({ folders });
  } catch (err) {
    req.log.error({ err }, "Failed to list all folders");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /folders ─────────────────────────────────────────────────────────────

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

    await logAudit("create_folder", req.user.id, folder.id, {
      name: folder.name,
      parentId: folder.parentId,
    });

    res.status(201).json({ ...folder, subfolderCount: 0, resourceCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create folder");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /folders/:folderId ────────────────────────────────────────────────────

router.get("/folders/:folderId", async (req, res) => {
  try {
    const params = GetFolderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    const result = await getFolderWithCounts(params.data.folderId);
    if (!result) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get folder");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /folders/:folderId ──────────────────────────────────────────────────

const UpdateFolderBody = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(500).optional(),
});

router.patch("/folders/:folderId", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const params = GetFolderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    const body = UpdateFolderBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const updates: Partial<{ name: string; description: string }> = {};
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.description !== undefined) updates.description = body.data.description;

    const [updated] = await db
      .update(foldersTable)
      .set(updates)
      .where(eq(foldersTable.id, params.data.folderId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    await logAudit("create_folder", req.user.id, updated.id, {
      action: "rename",
      newName: updated.name,
    });

    res.json(await getFolderWithCounts(updated.id));
  } catch (err) {
    req.log.error({ err }, "Failed to update folder");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /folders/:folderId ─────────────────────────────────────────────────

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

    const [existing] = await db
      .select({ id: foldersTable.id, name: foldersTable.name })
      .from(foldersTable)
      .where(eq(foldersTable.id, params.data.folderId));

    if (!existing) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    await cascadeDeleteFolder(params.data.folderId, req.user.id);

    res.json({ success: true, deleted: params.data.folderId });
  } catch (err) {
    req.log.error({ err }, "Failed to delete folder");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /folder-path/:folderId ────────────────────────────────────────────────

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
