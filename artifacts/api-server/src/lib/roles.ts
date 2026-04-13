import type { Request } from "express";

/** Full administrator — has all privileges. */
export function isAdmin(req: Request): boolean {
  return req.isAuthenticated() && req.user!.role === "admin";
}

/** Content manager — admin OR moderator. Can manage folders, resources, material requests, and moderate social content. Cannot access payments, role assignment, or analytics. */
export function isContentManager(req: Request): boolean {
  return req.isAuthenticated() && (req.user!.role === "admin" || req.user!.role === "moderator");
}
