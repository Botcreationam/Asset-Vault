import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { createClerkClient } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const userConnections = new Map<string, Set<WebSocket>>();
const MAX_CONNECTIONS_PER_USER = 5;

async function getUserIdFromRequest(req: any): Promise<string | null> {
  try {
    const requestState = await clerkClient.authenticateRequest(req, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    if (!requestState.isSignedIn) return null;
    const auth = requestState.toAuth();
    const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
    return userId || null;
  } catch {
    return null;
  }
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", async (ws, req) => {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      ws.close(4001, "Not authenticated");
      return;
    }

    // Verify user exists in our DB
    const [dbUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!dbUser) {
      ws.close(4001, "Not authenticated");
      return;
    }

    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }

    const existing = userConnections.get(userId)!;
    if (existing.size >= MAX_CONNECTIONS_PER_USER) {
      const oldest = existing.values().next().value;
      if (oldest) {
        oldest.close(4002, "Too many connections");
        existing.delete(oldest);
      }
    }

    existing.add(ws);

    ws.on("close", () => {
      const connections = userConnections.get(userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          userConnections.delete(userId);
        }
      }
    });

    ws.on("error", () => {
      const connections = userConnections.get(userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          userConnections.delete(userId);
        }
      }
    });

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on("close", () => clearInterval(pingInterval));
  });

  return wss;
}

export function broadcast(message: unknown) {
  const data = JSON.stringify(message);
  for (const connections of userConnections.values()) {
    for (const ws of connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }
}

export function sendToUser(userId: string, message: unknown) {
  const connections = userConnections.get(userId);
  if (!connections) return;

  const data = JSON.stringify(message);
  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}
