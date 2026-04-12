import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import {
  conversationsTable,
  conversationParticipantsTable,
  messagesTable,
} from "@workspace/db/schema";
import { eq, and, desc, lt, ne, sql, inArray } from "drizzle-orm";
import { sendToUser } from "../lib/websocket";

const router: IRouter = Router();

router.get("/chat/users", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
    })
    .from(usersTable)
    .where(ne(usersTable.id, req.user!.id))
    .limit(100);

  res.json({ users });
});

router.get("/chat/conversations", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const myParticipations = await db
    .select({ conversationId: conversationParticipantsTable.conversationId, lastReadAt: conversationParticipantsTable.lastReadAt })
    .from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.userId, req.user!.id));

  if (myParticipations.length === 0) {
    res.json({ conversations: [] });
    return;
  }

  const convIds = myParticipations.map((p) => p.conversationId);
  const lastReadMap = new Map(myParticipations.map((p) => [p.conversationId, p.lastReadAt]));

  const otherParticipants = await db
    .select({
      conversationId: conversationParticipantsTable.conversationId,
      userId: conversationParticipantsTable.userId,
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
    })
    .from(conversationParticipantsTable)
    .leftJoin(usersTable, eq(conversationParticipantsTable.userId, usersTable.id))
    .where(
      and(
        inArray(conversationParticipantsTable.conversationId, convIds),
        ne(conversationParticipantsTable.userId, req.user!.id),
      ),
    );

  const participantMap = new Map(
    otherParticipants.map((p) => [p.conversationId, p]),
  );

  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(inArray(conversationsTable.id, convIds))
    .orderBy(desc(conversationsTable.updatedAt));

  const result = await Promise.all(
    conversations.map(async (conv) => {
      const participant = participantMap.get(conv.id);
      const [lastMsg] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.id))
        .limit(1);

      const lastRead = lastReadMap.get(conv.id);
      const unreadConditions = [eq(messagesTable.conversationId, conv.id), ne(messagesTable.senderId, req.user!.id)];
      if (lastRead) {
        unreadConditions.push(sql`${messagesTable.createdAt} > ${lastRead}` as any);
      }
      const [unreadResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messagesTable)
        .where(and(...unreadConditions));

      return {
        id: conv.id,
        participant: participant
          ? {
              id: participant.userId,
              username: participant.username,
              firstName: participant.firstName,
              lastName: participant.lastName,
              profileImageUrl: participant.profileImageUrl,
            }
          : { id: "unknown" },
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              conversationId: lastMsg.conversationId,
              senderId: lastMsg.senderId,
              content: lastMsg.content,
              createdAt: lastMsg.createdAt?.toISOString(),
            }
          : undefined,
        unreadCount: unreadResult?.count ?? 0,
        updatedAt: conv.updatedAt?.toISOString(),
      };
    }),
  );

  res.json({ conversations: result });
});

router.post("/chat/conversations", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  if (userId === req.user!.id) {
    res.status(400).json({ error: "Cannot start conversation with yourself" });
    return;
  }

  const myConvs = await db
    .select({ conversationId: conversationParticipantsTable.conversationId })
    .from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.userId, req.user!.id));

  if (myConvs.length > 0) {
    const convIds = myConvs.map((c) => c.conversationId);
    const [existing] = await db
      .select({ conversationId: conversationParticipantsTable.conversationId })
      .from(conversationParticipantsTable)
      .where(
        and(
          inArray(conversationParticipantsTable.conversationId, convIds),
          eq(conversationParticipantsTable.userId, userId),
        ),
      );

    if (existing) {
      const [conv] = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, existing.conversationId));

      const [otherUser] = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          profileImageUrl: usersTable.profileImageUrl,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      res.status(201).json({
        id: conv.id,
        participant: otherUser || { id: userId },
        unreadCount: 0,
        updatedAt: conv.updatedAt?.toISOString(),
      });
      return;
    }
  }

  const [conv] = await db
    .insert(conversationsTable)
    .values({})
    .returning();

  await db.insert(conversationParticipantsTable).values([
    { conversationId: conv.id, userId: req.user!.id },
    { conversationId: conv.id, userId },
  ]);

  const [otherUser] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  res.status(201).json({
    id: conv.id,
    participant: otherUser || { id: userId },
    unreadCount: 0,
    updatedAt: conv.updatedAt?.toISOString(),
  });
});

router.get("/chat/conversations/:conversationId/messages", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const conversationId = Number(req.params.conversationId);
  const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const [participant] = await db
    .select({ id: conversationParticipantsTable.id })
    .from(conversationParticipantsTable)
    .where(
      and(
        eq(conversationParticipantsTable.conversationId, conversationId),
        eq(conversationParticipantsTable.userId, req.user!.id),
      ),
    );

  if (!participant) {
    res.status(403).json({ error: "Not a participant" });
    return;
  }

  const conditions = [eq(messagesTable.conversationId, conversationId)];
  if (cursor) {
    conditions.push(lt(messagesTable.id, cursor));
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(and(...conditions))
    .orderBy(desc(messagesTable.id))
    .limit(limit + 1);

  const hasMore = messages.length > limit;
  const results = hasMore ? messages.slice(0, limit) : messages;

  await db
    .update(conversationParticipantsTable)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipantsTable.conversationId, conversationId),
        eq(conversationParticipantsTable.userId, req.user!.id),
      ),
    );

  res.json({
    messages: results.reverse().map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt?.toISOString(),
    })),
    nextCursor: hasMore ? results[results.length - 1].id : undefined,
  });
});

router.post("/chat/conversations/:conversationId/messages", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const conversationId = Number(req.params.conversationId);
  const { content } = req.body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const [participant] = await db
    .select({ id: conversationParticipantsTable.id })
    .from(conversationParticipantsTable)
    .where(
      and(
        eq(conversationParticipantsTable.conversationId, conversationId),
        eq(conversationParticipantsTable.userId, req.user!.id),
      ),
    );

  if (!participant) {
    res.status(403).json({ error: "Not a participant" });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({
      conversationId,
      senderId: req.user!.id,
      content: content.trim(),
    })
    .returning();

  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  await db
    .update(conversationParticipantsTable)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationParticipantsTable.conversationId, conversationId),
        eq(conversationParticipantsTable.userId, req.user!.id),
      ),
    );

  const msgData = {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt?.toISOString(),
  };

  const participants = await db
    .select({ userId: conversationParticipantsTable.userId })
    .from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.conversationId, conversationId));

  for (const p of participants) {
    sendToUser(p.userId, { type: "new_message", data: msgData });
  }

  res.status(201).json(msgData);
});

export default router;
