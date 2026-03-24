import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  resourcesTable,
  unitsTransactionsTable,
  userUnitsTable,
} from "@workspace/db/schema";
import {
  ListResourcesQueryParams,
  GetResourceParams,
  DeleteResourceParams,
  UpdateResourceParams,
  UpdateResourceBody,
  ViewResourceParams,
  DownloadResourceParams,
} from "@workspace/api-zod";
import { eq, and, like, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import multer from "multer";
import { objectStorageClient } from "../lib/objectStorage";
import { ensureUserUnits } from "./units";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

function parseStoragePath(fullPath: string): { bucketName: string; objectName: string } {
  const path = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
  const parts = path.split("/");
  if (parts.length < 3) throw new Error("Invalid storage path");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

function getPrivateDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR is not set");
  return dir.replace(/\/$/, "");
}

async function getSignedUrl(bucketName: string, objectName: string, method: "GET" | "PUT", ttlSec: number): Promise<string> {
  const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sidecar signing failed (${response.status}): ${text}`);
  }
  const { signed_url } = await response.json();
  return signed_url;
}

function parseResourceRow(row: typeof resourcesTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    folderId: row.folderId,
    fileSize: row.fileSize,
    mimeType: row.mimeType,
    downloadCost: row.downloadCost,
    createdAt: row.createdAt,
    uploadedBy: row.uploadedBy,
    tags: row.tags ? row.tags.split(",").filter(Boolean) : [],
    downloadCount: row.downloadCount,
    viewCount: row.viewCount,
  };
}

router.get("/resources", async (req, res) => {
  try {
    const query = ListResourcesQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query" });
      return;
    }

    const { folderId, search, type } = query.data;

    const rows = await db.select().from(resourcesTable).where(
      and(
        eq(resourcesTable.isActive, true),
        folderId ? eq(resourcesTable.folderId, folderId) : undefined,
        search ? or(like(resourcesTable.name, `%${search}%`), like(resourcesTable.description ?? "", `%${search}%`)) : undefined,
        type ? eq(resourcesTable.type, type as any) : undefined,
      )
    );

    res.json({ resources: rows.map(parseResourceRow) });
  } catch (err) {
    req.log.error({ err }, "Failed to list resources");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/resources", upload.single("file"), async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "File is required" });
      return;
    }

    const { name, description, type, folderId, downloadCost, tags } = req.body;
    if (!name || !type || !folderId) {
      res.status(400).json({ error: "name, type, folderId are required" });
      return;
    }

    const file = req.file;
    const objectId = randomUUID();
    const ext = file.originalname.split(".").pop() || "bin";
    const privateDir = getPrivateDir();
    const fullPath = `${privateDir}/resources/${objectId}.${ext}`;
    const { bucketName, objectName } = parseStoragePath(fullPath);

    const bucket = objectStorageClient.bucket(bucketName);
    const gcsFile = bucket.file(objectName);
    await gcsFile.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });

    const resourceId = randomUUID();
    const [resource] = await db
      .insert(resourcesTable)
      .values({
        id: resourceId,
        name,
        description: description ?? null,
        type: type as any,
        folderId,
        storagePath: fullPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        downloadCost: downloadCost ? parseInt(downloadCost, 10) : 5,
        uploadedBy: req.user.id,
        tags: tags ?? null,
        isActive: true,
      })
      .returning();

    res.status(201).json(parseResourceRow(resource));
  } catch (err) {
    req.log.error({ err }, "Failed to upload resource");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/resources/:resourceId", async (req, res) => {
  try {
    const params = GetResourceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    const [resource] = await db
      .select()
      .from(resourcesTable)
      .where(and(eq(resourcesTable.id, params.data.resourceId), eq(resourcesTable.isActive, true)));

    if (!resource) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

    res.json(parseResourceRow(resource));
  } catch (err) {
    req.log.error({ err }, "Failed to get resource");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/resources/:resourceId", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const params = DeleteResourceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    await db
      .update(resourcesTable)
      .set({ isActive: false })
      .where(eq(resourcesTable.id, params.data.resourceId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete resource");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/resources/:resourceId", async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const params = UpdateResourceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    const body = UpdateResourceBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.description !== undefined) updates.description = body.data.description;
    if (body.data.type !== undefined) updates.type = body.data.type;
    if (body.data.downloadCost !== undefined) updates.downloadCost = body.data.downloadCost;
    if (body.data.tags !== undefined) updates.tags = body.data.tags.join(",");

    const [updated] = await db
      .update(resourcesTable)
      .set(updates)
      .where(eq(resourcesTable.id, params.data.resourceId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

    res.json(parseResourceRow(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update resource");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/resources/:resourceId/view", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const params = ViewResourceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    const [resource] = await db
      .select()
      .from(resourcesTable)
      .where(and(eq(resourcesTable.id, params.data.resourceId), eq(resourcesTable.isActive, true)));

    if (!resource) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

    const { bucketName, objectName } = parseStoragePath(resource.storagePath);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const url = await getSignedUrl(bucketName, objectName, "GET", 3600);

    await db
      .update(resourcesTable)
      .set({ viewCount: resource.viewCount + 1 })
      .where(eq(resourcesTable.id, resource.id));

    res.json({ url, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get view URL");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/resources/:resourceId/download", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const params = DownloadResourceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    const [resource] = await db
      .select()
      .from(resourcesTable)
      .where(and(eq(resourcesTable.id, params.data.resourceId), eq(resourcesTable.isActive, true)));

    if (!resource) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

    const currentBalance = await ensureUserUnits(req.user.id);
    const cost = resource.downloadCost;

    if (currentBalance < cost) {
      res.status(402).json({
        error: "Insufficient units",
        balance: currentBalance,
        required: cost,
      });
      return;
    }

    const newBalance = currentBalance - cost;

    await db
      .update(userUnitsTable)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(userUnitsTable.userId, req.user.id));

    await db.insert(unitsTransactionsTable).values({
      userId: req.user.id,
      type: "debit",
      amount: cost,
      description: `Downloaded: ${resource.name}`,
      resourceId: resource.id,
    });

    await db
      .update(resourcesTable)
      .set({ downloadCount: resource.downloadCount + 1 })
      .where(eq(resourcesTable.id, resource.id));

    const { bucketName, objectName } = parseStoragePath(resource.storagePath);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const url = await getSignedUrl(bucketName, objectName, "GET", 900);

    res.json({
      url,
      expiresAt: expiresAt.toISOString(),
      unitsSpent: cost,
      newBalance,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to process download");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
