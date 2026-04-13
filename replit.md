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
- **Auth**: Clerk (JWT sessions) — `@clerk/express` on backend, `@clerk/react` on frontend
- **File Storage**: Google Cloud Storage (Replit App Storage) via `@google-cloud/storage`
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   ├── acadvault/          # React + Vite frontend
│   └── acadvault-mobile/   # Expo React Native mobile app
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection (replit-auth-web removed)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- **users** — Clerk-synced users (id = Clerk userId, username, email, firstName, lastName, profileImageUrl, role: student|moderator|admin)
- **folders** — Hierarchical folder structure (id, name, description, parentId, level, icon)
- **resources** — Academic files (id, name, type, folderId, storagePath, fileSize, mimeType, downloadCost, tags, viewCount, downloadCount)
- **user_units** — Unit balances per user
- **units_transactions** — Transaction history (credit/debit)
- **audit_logs** — Immutable audit trail (action, actorId, targetId, details, createdAt)
- **posts** — Social feed posts (id, authorId, content, imageUrl, likesCount, commentsCount, createdAt)
- **post_comments** — Comments on posts (id, postId, authorId, content, createdAt)
- **post_reactions** — Like reactions on posts (id, postId, userId, createdAt; unique per user+post)
- **user_active_sessions** — Device/session tracking (id, userId, sessionId, deviceFingerprint, ipAddress, userAgent, lastActiveAt)
- **conversations** — Chat conversations (id, name, isGroup, createdAt)
- **conversation_participants** — Users in a conversation (id, conversationId, userId, joinedAt)
- **messages** — Chat messages (id, conversationId, senderId, content, createdAt)
- **resource_ratings** — Star ratings + reviews (id, resourceId, userId, rating 1-5, review, createdAt; unique per user+resource)
- **notifications** — In-app notifications (id, userId, type, title, body, isRead, relatedId, createdAt)
- **material_requests** — Student material requests (id, userId, title, description, subject, courseCode, status: pending|in_progress|fulfilled|rejected, adminNote, createdAt)

## Key Features

1. **Hierarchical Folders**: Program → Year → Semester → Subject
2. **Free Viewing**: PDFs/slides viewable in-browser via signed URL (free for authenticated users)
3. **Paid Downloads**: 5 units per download (configurable per resource)
4. **Units System**: Admin can grant units; transaction history tracked
5. **Admin Panel**: Upload resources, manage folders, manage users, grant units, view analytics
6. **Admin Analytics Dashboard**: Real-time stats — total users, downloads, views, top resources, units circulating, avg ratings, pending requests
7. **Protected Storage**: Files stored in GCS via App Storage; signed URLs expire (60min view, 15min download)
8. **Social Feed**: Facebook-style newsfeed with posts, comments, and likes (real-time via WebSocket)
9. **Real-Time Chat**: Direct messaging between users with WebSocket-powered live updates
10. **Profile Photos**: Upload profile photos (max 2MB; JPEG/PNG/GIF/WebP only) from the account page
11. **Ratings & Reviews**: 5-star ratings with written reviews on each resource detail page; bar chart distribution shown
12. **In-App Notifications**: Bell icon in header with unread badge; auto-polls every 30s; mark-all-read; triggered on unit grants and material request fulfillment
13. **Material Requests**: Students request missing resources; admins manage status (pending → in_progress → fulfilled/rejected) with admin notes; fulfilled requests send notifications
14. **PWA Support**: `manifest.json` with theme colors + apple-touch-icon meta tags for installable web app
15. **Moderator Role**: Three-tier role system (student → moderator → admin). Moderators can manage folders, upload/delete resources, moderate posts/comments (including a comment delete endpoint), and respond to material requests. They are blocked from: granting units, changing user roles, viewing analytics, and system settings. Moderators get a dedicated `/moderator` portal with Requests, Posts, and Folders tabs. Admins assign the moderator role via the Admin Portal user management.

## Security

- **Rate Limiting**: All write endpoints rate-limited (posts: 10/min, comments: 30/min, reactions: 60/min, messages: 60/min, uploads: 5/5min, downloads: 10/min, global: 200/min per user)
- **CORS**: Restricted to known Replit origins only (not `origin: true`)
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy on all responses
- **Atomic Balance Operations**: Download deductions use SQL `WHERE balance >= cost` to prevent race conditions
- **Input Validation**: Post max 2000 chars, comment max 1000 chars, message max 5000 chars, MIME validation on uploads
- **WebSocket Protection**: Max 5 connections per user, Clerk session token required on upgrade
- **Self-Service Topup Disabled**: Only admins can topup units; prevents free-unit abuse
- **Search Sanitization**: LIKE wildcards (`%`, `_`) stripped from search input

### Content Protection System
- **Secure Streaming**: All content served through authenticated backend proxy (`/resources/:id/stream`), never via raw storage URLs
- **Range-based Streaming**: HTTP Range request support for chunked content delivery (partial content / 206 responses)
- **Keyboard Shortcut Blocking**: Ctrl+S, Ctrl+P, Ctrl+C, Ctrl+A, Ctrl+U, F12, PrintScreen, DevTools shortcuts all intercepted
- **Right-click Prevention**: Context menu disabled on the viewer
- **Copy/Cut/Paste Blocking**: Clipboard events intercepted at document level while viewing
- **Drag Prevention**: DragStart and Drop events blocked globally
- **Text Selection Disabled**: CSS `user-select: none` with vendor prefixes
- **Print Blocking**: CSS `@media print` hides all content and shows a "printing disabled" message
- **Visibility API Blur**: Content hidden with black screen when user switches tabs or window loses focus (screenshot prevention)
- **DRM Screen Capture Protection**: Uses Encrypted Media Extensions (EME) with ClearKey — the DRM video overlay causes screen capture tools to record a black screen instead of content (same technique as Netflix/WhatsApp)
- **Screen Recording Interception**: `getDisplayMedia` API is intercepted — content auto-hides when screen sharing/recording begins
- **PrintScreen Key Blocking**: PrintScreen key captured and content immediately hidden for 3 seconds with warning message
- **User-specific Watermarking**: Two overlay layers — diagonal email/ID watermark + secondary user ID grid for forensic identification
- **Iframe Sandbox**: Viewer iframe sandboxed (no `allow-downloads`) to prevent save-file dialogs
- **No-Cache Headers**: `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache`, `Expires: 0` on all streamed content
- **Content-Security-Policy**: `script-src 'none'; object-src 'none'; frame-ancestors 'self'` on streamed responses

### Device & Session Management
- **Device Limit**: Max 3 active sessions/devices per user; oldest session auto-evicted when limit exceeded
- **Session Tracking**: `user_active_sessions` table stores device fingerprints, IP addresses, user agents, last-active timestamps
- **Automatic Cleanup**: Sessions older than 30 minutes auto-purged
- **Active Sessions API**: `GET /api/user/active-sessions` lets users see their active devices

### Suspicious Activity Detection
- **Cross-resource Monitoring**: In-memory tracker detects when a user streams >20 distinct resources within a 5-minute window
- **Automatic Blocking**: Suspicious users are temporarily blocked from streaming for 15 minutes
- **Per-resource Rate Limit**: Max 60 stream requests per user per resource per hour

## API Routes

All routes at `/api`:

- `GET /healthz` — health check
- `GET /auth/user` — current user + units balance (Clerk session required)
- `PATCH /auth/profile` — update username/firstName/lastName
- `POST /auth/profile-photo` — upload profile photo (multipart)
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
- `GET /admin/analytics` — platform analytics: users, downloads, top resources, ratings, requests (admin)
- `GET /resources/:id/ratings` — get ratings + average for a resource
- `POST /resources/:id/ratings` — submit or update a rating (auth required)
- `DELETE /resources/:id/ratings` — remove own rating (auth required)
- `GET /notifications` — user's notifications + unread count (auth required)
- `PATCH /notifications/read-all` — mark all notifications read (auth required)
- `PATCH /notifications/:id/read` — mark single notification read (auth required)
- `GET /material-requests` — list requests (own for students; all for admin)
- `POST /material-requests` — submit a material request (auth required)
- `PATCH /material-requests/:id` — update request status (admin)

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

### `artifacts/acadvault-mobile` (`@workspace/acadvault-mobile`)

Expo React Native mobile app. Connects to the same API server as the web frontend.

- **Font**: Plus Jakarta Sans (matching web app)
- **Design tokens**: Synced from web CSS (navy blue/gold academic theme)
- **Auth**: Uses `expo-web-browser` for Replit Auth login flow; checks `/api/auth/user` for session
- **Navigation**: 4 tabs — Library (folder browser), Search, Feed (social posts), Account (profile + balance)
- **Resource detail**: Stack screen at `/resource/[id]` with view-free + paid-download actions
- **API connection**: `setBaseUrl` from `@workspace/api-client-react` with `EXPO_PUBLIC_DOMAIN` env var
- **CORS**: API server allows `REPLIT_EXPO_DEV_DOMAIN` origin for cross-domain mobile web preview

### `lib/db` (`@workspace/db`)

Push schema: `pnpm --filter @workspace/db run push`

### `lib/api-spec` (`@workspace/api-spec`)

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

## Development

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)
- `pnpm --filter @workspace/acadvault run dev` — web frontend (port 22689)
- `pnpm --filter @workspace/acadvault-mobile run dev` — mobile app (port 20808)

## Admin Setup

Admin users are determined by the `ADMIN_EMAILS` environment variable (comma-separated list of email addresses). If not set, no users are auto-promoted to admin on login.

**Permanent (Super) Admins**: Emails listed in `ADMIN_EMAILS` are permanently protected — they cannot be demoted to student by any other admin. They appear with a "Super Admin" badge in the admin panel, and the role selector is hidden for them. The server enforces this with a 403 response if anyone tries to change their role via API.

To manually make the first admin user:
```sql
UPDATE users SET role = 'admin' WHERE id = '<your-replit-user-id>';
```
