import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db/schema";

type AuditAction =
  | "create_folder"
  | "delete_folder"
  | "upload_resource"
  | "delete_resource"
  | "update_resource"
  | "change_role"
  | "grant_units"
  | "profile_update"
  | "user_registered"
  | "units_welcome"
  | "approve_user"
  | "reject_user";

export async function logAudit(
  action: AuditAction,
  actorId: string,
  targetId?: string,
  details?: Record<string, unknown>,
) {
  try {
    await db.insert(auditLogsTable).values({
      action,
      actorId,
      targetId: targetId ?? null,
      details: details ? JSON.stringify(details) : null,
    });
  } catch {
    // Audit failure should never break the main request
  }
}
