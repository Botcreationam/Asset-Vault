# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

**AcadVault** — A secure academic resource platform where students can read books, lecture slides, and notes for free, and pay units to download them.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Replit Auth (OIDC/PKCE) via `@workspace/replit-auth-web`
- **File Storage**: Google Cloud Storage (Replit App Storage) via `@google-cloud/storage`
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── acadvault/          # React + Vite frontend
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── replit-auth-web/    # Replit Auth browser package
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- **users** — Replit Auth users (id, username, email, firstName, lastName, profileImageUrl, role: student|admin)
- **sessions** — Auth sessions (Replit Auth managed)
- **folders** — Hierarchical folder structure (id, name, description, parentId, level, icon)
- **resources** — Academic files (id, name, type, folderId, storagePath, fileSize, mimeType, downloadCost, tags, viewCount, downloadCount)
- **user_units** — Unit balances per user
- **units_transactions** — Transaction history (credit/debit)
- **audit_logs** — Immutable audit trail (action, actorId, targetId, details, createdAt)
- **posts** — Social feed posts (id, authorId, content, imageUrl, likesCount, commentsCount, createdAt)
- **post_comments** — Comments on posts (id, postId, authorId, content, createdAt)
- **post_reactions** — Like reactions on posts (id, postId, userId, createdAt; unique per user+post)
- **conversations** — Chat conversations (id, name, isGroup, createdAt)
- **conversation_participants** — Users in a conversation (id, conversationId, userId, joinedAt)
- **messages** — Chat messages (id, conversationId, senderId, content, createdAt)

## Key Features

1. **Hierarchical Folders**: Program → Year → Semester → Subject
2. **Free Viewing**: PDFs/slides viewable in-browser via signed URL (free for authenticated users)
3. **Paid Downloads**: 5 units per download (configurable per resource)
4. **Units System**: Admin can grant units; transaction history tracked
5. **Admin Panel**: Upload resources, manage folders, manage users, grant units
6. **Protected Storage**: Files stored in GCS via App Storage; signed URLs expire (60min view, 15min download)
7. **Social Feed**: Facebook-style newsfeed with posts, comments, and likes (real-time via WebSocket)
8. **Real-Time Chat**: Direct messaging between users with WebSocket-powered live updates
9. **Profile Photos**: Upload profile photos (max 2MB; JPEG/PNG/GIF/WebP only) from the account page

## API Routes

All routes at `/api`:

- `GET /healthz` — health check
- `GET /auth/user` — current user + units balance
- `GET /login`, `GET /callback`, `GET /logout` — Replit Auth OIDC flow
- `GET/POST /folders` — list root folders / create folder (admin)
- `GET/DELETE /folders/:id` — get/delete folder
- `GET /folder-path/:id` — breadcrumb path
- `GET/POST /resources` — list resources / upload resource (admin, multipart)
- `GET/DELETE/PATCH /resources/:id` — get/delete/update resource
- `GET /resources/:id/view` — signed view URL (auth required)
- `POST /resources/:id/download` — spend units + get download URL (auth required)
- `GET /units/balance` — user's current balance
- `GET /units/transactions` — transaction history
- `POST /units/topup` — add units (self-service)
- `GET /admin/users` — list all users (admin)
- `PATCH /admin/users/:id/role` — change user role (admin)
- `POST /admin/users/:id/units` — grant units to user (admin)

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/`.

- `folders.ts` — folder CRUD
- `resources.ts` — resource upload/view/download with GCS signed URLs + units deduction
- `units.ts` — units balance, transactions, admin management
- `auth.ts` — Replit OIDC auth flow + profile photo upload
- `social.ts` — social feed: posts CRUD, comments, reactions (likes)
- `chat.ts` — chat: conversations, messages, user list
- `lib/websocket.ts` — WebSocket server for real-time chat and feed updates

### `artifacts/acadvault` (`@workspace/acadvault`)

React + Vite frontend. Pages in `src/pages/`:

- `home.tsx` — landing page with search, hero, featured folders
- `browse.tsx` — hierarchical folder browser with breadcrumbs
- `resource-detail.tsx` — resource viewer (PDF iframe) + download with units
- `search.tsx` — search results
- `feed.tsx` — social newsfeed with posts, comments, likes (real-time)
- `chat.tsx` — real-time chat with conversations and messages
- `account.tsx` — user profile + unit balance + transaction history + profile photo upload
- `admin.tsx` — admin dashboard: folders, upload resources, manage users
- `hooks/use-websocket.ts` — shared singleton WebSocket client with auto-reconnect

### `lib/db` (`@workspace/db`)

Push schema: `pnpm --filter @workspace/db run push`

### `lib/api-spec` (`@workspace/api-spec`)

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

## Development

- `pnpm --filter @workspace/api-server run dev` — API server
- `pnpm --filter @workspace/acadvault run dev` — frontend

## Admin Setup

To make the first admin user:
```sql
UPDATE users SET role = 'admin' WHERE id = '<your-replit-user-id>';
```
