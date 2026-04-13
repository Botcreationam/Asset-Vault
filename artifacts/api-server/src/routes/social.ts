import { Router, type IRouter } from "express";
import { isContentManager } from "../lib/roles";
import { db, usersTable } from "@workspace/db";
import {
  postsTable,
  postCommentsTable,
  postReactionsTable,
} from "@workspace/db/schema";
import { eq, desc, lt, and, sql } from "drizzle-orm";
import { broadcast } from "../lib/websocket";
import { postRateLimit, commentRateLimit, reactionRateLimit } from "../lib/rate-limit";

const router: IRouter = Router();

const MAX_POST_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 1000;

router.get("/social/posts", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const conditions = cursor ? [lt(postsTable.id, cursor)] : [];

  const posts = await db
    .select({
      id: postsTable.id,
      content: postsTable.content,
      imageUrl: postsTable.imageUrl,
      likesCount: postsTable.likesCount,
      commentsCount: postsTable.commentsCount,
      createdAt: postsTable.createdAt,
      authorId: postsTable.authorId,
      authorUsername: usersTable.username,
      authorFirstName: usersTable.firstName,
      authorLastName: usersTable.lastName,
      authorProfileImage: usersTable.profileImageUrl,
    })
    .from(postsTable)
    .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(postsTable.id))
    .limit(limit + 1);

  const hasMore = posts.length > limit;
  const results = hasMore ? posts.slice(0, limit) : posts;

  const userReactions = results.length > 0
    ? await db
        .select({ postId: postReactionsTable.postId })
        .from(postReactionsTable)
        .where(
          and(
            eq(postReactionsTable.userId, req.user!.id),
            sql`${postReactionsTable.postId} IN (${sql.join(
              results.map((p) => sql`${p.id}`),
              sql`, `,
            )})`,
          ),
        )
    : [];

  const likedPostIds = new Set(userReactions.map((r) => r.postId));

  res.json({
    posts: results.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      liked: likedPostIds.has(p.id),
      createdAt: p.createdAt?.toISOString(),
      author: {
        id: p.authorId,
        username: p.authorUsername,
        firstName: p.authorFirstName,
        lastName: p.authorLastName,
        profileImageUrl: p.authorProfileImage,
      },
    })),
    nextCursor: hasMore ? results[results.length - 1].id : undefined,
  });
});

router.post("/social/posts", postRateLimit, async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { content } = req.body;
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  if (content.length > MAX_POST_LENGTH) {
    res.status(400).json({ error: `Content too long (max ${MAX_POST_LENGTH} chars)` });
    return;
  }

  const [post] = await db
    .insert(postsTable)
    .values({ authorId: req.user!.id, content: content.trim() })
    .returning();

  const [author] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.id));

  const fullPost = {
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    likesCount: 0,
    commentsCount: 0,
    liked: false,
    createdAt: post.createdAt?.toISOString(),
    author,
  };

  broadcast({ type: "new_post", data: fullPost });

  res.status(201).json(fullPost);
});

router.delete("/social/posts/:postId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const postId = Number(req.params.postId);
  const [post] = await db
    .select({ authorId: postsTable.authorId })
    .from(postsTable)
    .where(eq(postsTable.id, postId));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (post.authorId !== req.user!.id && !isContentManager(req)) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  await db.delete(postReactionsTable).where(eq(postReactionsTable.postId, postId));
  await db.delete(postCommentsTable).where(eq(postCommentsTable.postId, postId));
  await db.delete(postsTable).where(eq(postsTable.id, postId));

  broadcast({ type: "delete_post", data: { postId } });

  res.json({ success: true });
});

router.get("/social/posts/:postId/comments", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const postId = Number(req.params.postId);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const comments = await db
    .select({
      id: postCommentsTable.id,
      postId: postCommentsTable.postId,
      content: postCommentsTable.content,
      createdAt: postCommentsTable.createdAt,
      authorId: postCommentsTable.authorId,
      authorUsername: usersTable.username,
      authorFirstName: usersTable.firstName,
      authorLastName: usersTable.lastName,
      authorProfileImage: usersTable.profileImageUrl,
    })
    .from(postCommentsTable)
    .leftJoin(usersTable, eq(postCommentsTable.authorId, usersTable.id))
    .where(eq(postCommentsTable.postId, postId))
    .orderBy(postCommentsTable.createdAt)
    .limit(limit);

  res.json({
    comments: comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      content: c.content,
      createdAt: c.createdAt?.toISOString(),
      author: {
        id: c.authorId,
        username: c.authorUsername,
        firstName: c.authorFirstName,
        lastName: c.authorLastName,
        profileImageUrl: c.authorProfileImage,
      },
    })),
  });
});

router.post("/social/posts/:postId/comments", commentRateLimit, async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const postId = Number(req.params.postId);
  const { content } = req.body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  if (content.length > MAX_COMMENT_LENGTH) {
    res.status(400).json({ error: `Comment too long (max ${MAX_COMMENT_LENGTH} chars)` });
    return;
  }

  const [post] = await db
    .select({ id: postsTable.id })
    .from(postsTable)
    .where(eq(postsTable.id, postId));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [comment] = await db
    .insert(postCommentsTable)
    .values({ postId, authorId: req.user!.id, content: content.trim() })
    .returning();

  await db
    .update(postsTable)
    .set({ commentsCount: sql`${postsTable.commentsCount} + 1` })
    .where(eq(postsTable.id, postId));

  const [author] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageUrl: usersTable.profileImageUrl,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.id));

  const fullComment = {
    id: comment.id,
    postId: comment.postId,
    content: comment.content,
    createdAt: comment.createdAt?.toISOString(),
    author,
  };

  broadcast({ type: "new_comment", data: fullComment });

  res.status(201).json(fullComment);
});

router.delete("/social/posts/:postId/comments/:commentId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const postId = Number(req.params.postId);
  const commentId = Number(req.params.commentId);

  const [comment] = await db
    .select({ id: postCommentsTable.id, authorId: postCommentsTable.authorId, postId: postCommentsTable.postId })
    .from(postCommentsTable)
    .where(and(eq(postCommentsTable.id, commentId), eq(postCommentsTable.postId, postId)));

  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  if (comment.authorId !== req.user!.id && !isContentManager(req)) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  await db.delete(postCommentsTable).where(eq(postCommentsTable.id, commentId));
  await db
    .update(postsTable)
    .set({ commentsCount: sql`GREATEST(${postsTable.commentsCount} - 1, 0)` })
    .where(eq(postsTable.id, postId));

  broadcast({ type: "delete_comment", data: { postId, commentId } });
  res.json({ success: true });
});

router.post("/social/posts/:postId/react", reactionRateLimit, async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const postId = Number(req.params.postId);

  const [existing] = await db
    .select({ id: postReactionsTable.id })
    .from(postReactionsTable)
    .where(
      and(
        eq(postReactionsTable.postId, postId),
        eq(postReactionsTable.userId, req.user!.id),
      ),
    );

  let liked: boolean;
  if (existing) {
    await db
      .delete(postReactionsTable)
      .where(eq(postReactionsTable.id, existing.id));
    await db
      .update(postsTable)
      .set({ likesCount: sql`GREATEST(${postsTable.likesCount} - 1, 0)` })
      .where(eq(postsTable.id, postId));
    liked = false;
  } else {
    const [inserted] = await db
      .insert(postReactionsTable)
      .values({ postId, userId: req.user!.id })
      .onConflictDoNothing()
      .returning();
    if (inserted) {
      await db
        .update(postsTable)
        .set({ likesCount: sql`${postsTable.likesCount} + 1` })
        .where(eq(postsTable.id, postId));
    }
    liked = true;
  }

  const [updated] = await db
    .select({ likesCount: postsTable.likesCount })
    .from(postsTable)
    .where(eq(postsTable.id, postId));

  const result = {
    liked,
    likesCount: updated?.likesCount ?? 0,
  };

  broadcast({ type: "reaction_update", data: { postId, ...result } });

  res.json(result);
});

export default router;
