import { Router, type IRouter } from "express";
import { isContentManager } from "../lib/roles";
import { db } from "@workspace/db";
import {
  resourcesTable,
  unitsTransactionsTable,
  userUnitsTable,
  userActiveSessionsTable,
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
import { eq, and, like, or, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import multer from "multer";
import { objectStorageClient } from "../lib/objectStorage";
import { ensureUserUnits } from "./units";
import { logAudit } from "../lib/audit";
import { downloadRateLimit } from "../lib/rate-limit";
import {
  checkSuspiciousActivity,
  enforceDeviceLimit,
  contentSecurityHeaders,
} from "../lib/content-protection";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// ── Rate limiter: max 60 streams per user per resource per hour ──────────────
const streamAccessTracker = new Map<string, { count: number; resetAt: number }>();
function checkStreamRateLimit(userId: string, resourceId: string): boolean {
  const key = `${userId}:${resourceId}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const maxHits = 60;
  const entry = streamAccessTracker.get(key);
  if (!entry || now > entry.resetAt) {
    streamAccessTracker.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxHits) return false;
  entry.count++;
  return true;
}
// Clean up old entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of streamAccessTracker.entries()) {
    if (now > entry.resetAt) streamAccessTracker.delete(key);
  }
}, 30 * 60 * 1000);

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
        search ? or(
          like(resourcesTable.name, `%${search.replace(/%/g, "").replace(/_/g, "")}%`),
          like(resourcesTable.description ?? "", `%${search.replace(/%/g, "").replace(/_/g, "")}%`),
        ) : undefined,
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
    if (!req.isAuthenticated() || !isContentManager(req)) {
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

    await logAudit("upload_resource", req.user.id, resourceId, {
      name,
      type,
      folderId,
      fileSize: file.size,
    });

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
    if (!req.isAuthenticated() || !isContentManager(req)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const params = DeleteResourceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params" });
      return;
    }

    const [deleted] = await db
      .update(resourcesTable)
      .set({ isActive: false })
      .where(eq(resourcesTable.id, params.data.resourceId))
      .returning({ name: resourcesTable.name });

    await logAudit("delete_resource", req.user.id, params.data.resourceId, {
      name: deleted?.name,
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete resource");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/resources/:resourceId", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !isContentManager(req)) {
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

// ── Secure stream proxy (no raw GCS URL exposed to browser) ─────────────────
router.get("/resources/:resourceId/stream", enforceDeviceLimit, contentSecurityHeaders, async (req, res) => {
  try {
    const resourceId = req.params.resourceId;
    if (!resourceId) {
      res.status(400).send("Missing resource ID");
      return;
    }

    if (!checkStreamRateLimit(req.user.id, resourceId)) {
      res.status(429).send("Too many requests. Please try again later.");
      return;
    }

    const suspiciousCheck = checkSuspiciousActivity(req.user.id, resourceId);
    if (!suspiciousCheck.allowed) {
      res.status(403).send(suspiciousCheck.reason);
      return;
    }

    const [resource] = await db
      .select()
      .from(resourcesTable)
      .where(and(eq(resourcesTable.id, resourceId), eq(resourcesTable.isActive, true)));

    if (!resource) {
      res.status(404).send("Resource not found");
      return;
    }

    const { bucketName, objectName } = parseStoragePath(resource.storagePath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).send("File not found in storage");
      return;
    }

    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType as string) || resource.mimeType || "application/octet-stream";
    const fileSize = Number(metadata.size) || 0;

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(resource.name)}"`);
    res.setHeader("Accept-Ranges", "bytes");

    const rangeHeader = req.headers.range;
    if (rangeHeader && fileSize > 0) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).setHeader("Content-Range", `bytes */${fileSize}`).send("Range not satisfiable");
        return;
      }

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", String(end - start + 1));

      const readStream = file.createReadStream({ start, end });
      readStream.on("error", (err) => {
        req.log.error({ err }, "Stream range error");
        if (!res.headersSent) res.status(500).send("Stream error");
      });
      readStream.pipe(res);
    } else {
      if (fileSize) res.setHeader("Content-Length", String(fileSize));

      const readStream = file.createReadStream();
      readStream.on("error", (err) => {
        req.log.error({ err }, "Stream error");
        if (!res.headersSent) res.status(500).send("Stream error");
      });
      readStream.pipe(res);
    }

    db.update(resourcesTable)
      .set({ viewCount: resource.viewCount + 1 })
      .where(eq(resourcesTable.id, resource.id))
      .catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to stream resource");
    if (!res.headersSent) res.status(500).send("Internal server error");
  }
});

router.post("/resources/:resourceId/download", downloadRateLimit, async (req, res) => {
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

    await ensureUserUnits(req.user.id);
    const cost = resource.downloadCost;

    const [updated] = await db
      .update(userUnitsTable)
      .set({
        balance: sql`${userUnitsTable.balance} - ${cost}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userUnitsTable.userId, req.user.id),
          sql`${userUnitsTable.balance} >= ${cost}`,
        ),
      )
      .returning({ balance: userUnitsTable.balance });

    if (!updated) {
      const [current] = await db
        .select({ balance: userUnitsTable.balance })
        .from(userUnitsTable)
        .where(eq(userUnitsTable.userId, req.user.id));
      res.status(402).json({
        error: "Insufficient units",
        balance: current?.balance ?? 0,
        required: cost,
      });
      return;
    }

    const newBalance = updated.balance;

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

// ── Admin: list all resources (including inactive) ───────────────────────────
router.get("/admin/resources", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !isContentManager(req)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const rows = await db
      .select()
      .from(resourcesTable)
      .orderBy(desc(resourcesTable.createdAt))
      .limit(500);

    res.json({ resources: rows.map(parseResourceRow).map((r, i) => ({
      ...r,
      isActive: rows[i].isActive,
    })) });
  } catch (err) {
    req.log.error({ err }, "Failed to list admin resources");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/user/active-sessions", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const sessions = await db
      .select({
        id: userActiveSessionsTable.id,
        deviceFingerprint: userActiveSessionsTable.deviceFingerprint,
        ipAddress: userActiveSessionsTable.ipAddress,
        userAgent: userActiveSessionsTable.userAgent,
        lastActiveAt: userActiveSessionsTable.lastActiveAt,
        createdAt: userActiveSessionsTable.createdAt,
      })
      .from(userActiveSessionsTable)
      .where(
        and(
          eq(userActiveSessionsTable.userId, req.user.id),
          sql`${userActiveSessionsTable.lastActiveAt} >= ${cutoff}`,
        ),
      )
      .orderBy(desc(userActiveSessionsTable.lastActiveAt));

    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        device: parseUserAgent(s.userAgent || ""),
        ipAddress: s.ipAddress,
        lastActive: s.lastActiveAt,
        startedAt: s.createdAt,
      })),
      maxAllowed: 3,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get active sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

function parseUserAgent(ua: string): string {
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Mobile")) return "Mobile Browser";
  return "Browser";
}

export default router;
