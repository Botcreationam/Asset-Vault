import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  pgEnum,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resourceTypeEnum = pgEnum("resource_type", [
  "pdf",
  "slides",
  "notes",
  "book",
  "video",
  "other",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "credit",
  "debit",
]);

export const foldersTable = pgTable("folders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: text("parent_id"),
  level: integer("level").notNull().default(0),
  icon: text("icon"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"),
});

export const resourcesTable = pgTable("resources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: resourceTypeEnum("type").notNull(),
  folderId: text("folder_id").notNull(),
  storagePath: text("storage_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  downloadCost: integer("download_cost").notNull().default(5),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  uploadedBy: text("uploaded_by"),
  tags: text("tags"),
  downloadCount: integer("download_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const unitsTransactionsTable = pgTable("units_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  resourceId: text("resource_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userUnitsTable = pgTable("user_units", {
  userId: text("user_id").primaryKey(),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFolderSchema = createInsertSchema(foldersTable).omit({
  createdAt: true,
});
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof foldersTable.$inferSelect;

export const insertResourceSchema = createInsertSchema(resourcesTable).omit({
  createdAt: true,
  downloadCount: true,
  viewCount: true,
});
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resourcesTable.$inferSelect;

export const insertTransactionSchema = createInsertSchema(
  unitsTransactionsTable,
).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof unitsTransactionsTable.$inferSelect;

export const insertUserUnitsSchema = createInsertSchema(userUnitsTable).omit({
  updatedAt: true,
});
export type InsertUserUnits = z.infer<typeof insertUserUnitsSchema>;
export type UserUnits = typeof userUnitsTable.$inferSelect;

// ── Audit log ────────────────────────────────────────────────────────────────
export const auditActionEnum = pgEnum("audit_action", [
  "create_folder",
  "delete_folder",
  "upload_resource",
  "delete_resource",
  "update_resource",
  "change_role",
  "grant_units",
  "profile_update",
  "user_registered",
  "units_welcome",
]);

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: auditActionEnum("action").notNull(),
  actorId: text("actor_id").notNull(),
  targetId: text("target_id"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: text("author_id").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const postCommentsTable = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  authorId: text("author_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postReactionsTable = pgTable(
  "post_reactions",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("post_reactions_post_user_idx").on(table.postId, table.userId)],
);

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const conversationParticipantsTable = pgTable(
  "conversation_participants",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id").notNull(),
    userId: text("user_id").notNull(),
    lastReadAt: timestamp("last_read_at"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("conv_participant_idx").on(table.conversationId, table.userId)],
);

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: text("sender_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
