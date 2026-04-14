# Overview

AcadVault is a secure, pnpm workspace monorepo project built with TypeScript, offering an academic resource platform where students can access and download educational materials. The platform aims to provide free viewing of resources and paid downloads using an in-app unit system. It includes features like hierarchical folder organization, social interaction via a newsfeed and real-time chat, and robust content protection mechanisms. The project's vision is to create a comprehensive and secure ecosystem for academic resource sharing with a focus on user experience and content integrity.

# User Preferences

I prefer concise and accurate responses. When making changes, prioritize robust, scalable solutions. I appreciate clear explanations of architectural decisions. Do not make changes to files within `artifacts/acadvault-mobile` unless specifically requested.

# System Architecture

The project is structured as a pnpm monorepo with separate packages for the API server, web frontend, and mobile application.

**Core Technologies:**
- **Backend:** Node.js 24, Express 5, PostgreSQL, Drizzle ORM, Zod for validation.
- **Frontend:** React, Vite, Tailwind CSS, shadcn/ui.
- **Mobile:** Expo React Native.
- **Authentication:** Replit Auth (OIDC/PKCE).
- **File Storage:** Google Cloud Storage (Replit App Storage).
- **API Generation:** Orval from OpenAPI spec.
- **Build System:** esbuild.

**Monorepo Structure:**
- `artifacts/`: Contains main applications (`api-server`, `acadvault` web, `acadvault-mobile`).
- `lib/`: Houses shared libraries (`api-spec`, `api-client-react`, `api-zod`, `db`, `replit-auth-web`).

**Database Schema Highlights:**
- **Users:** `users` (id, role, profile, onboarding status), `user_units`, `units_transactions`, `user_active_sessions`.
- **Resources:** `folders`, `resources` (storagePath, downloadCost), `resource_ratings`, `resource_bookmarks`, `material_requests`.
- **Social:** `posts`, `post_comments`, `post_reactions`, `conversations`, `conversation_participants`, `messages`.
- **System:** `sessions`, `audit_logs`, `notifications`.

**Key Features and Design Decisions:**
- **Hierarchical Content Organization:** Resources are managed within a `Program -> Year -> Semester -> Subject` folder structure.
- **Unit-based Economy:** Users can view resources for free and pay units for downloads. Admins manage unit granting.
- **Three-Tier Role System:** Student, Moderator, and Admin roles with distinct permissions and dedicated portals.
- **Content Protection System:**
    - Secure streaming via authenticated backend proxy with range-based requests.
    - Client-side protections: Keyboard shortcut blocking, right-click prevention, copy/paste blocking, text selection disabling, print blocking, visibility API blur.
    - DRM-like features: Encrypted Media Extensions (EME) for screen capture protection, screen recording interception, PrintScreen key blocking.
    - User-specific watermarking (email/ID + forensic grid).
    - Iframe sandboxing for viewer, no-cache headers, and strict Content-Security-Policy.
- **Real-time Interactions:** Social feed and chat use WebSockets for live updates.
- **User Onboarding & Personalization:** First-time users complete an onboarding flow to personalize content discovery based on academic profile.
- **Device & Session Management:** Tracks active user sessions with limits and automatic cleanup.
- **Security Enhancements:** Rate limiting on all write endpoints, restricted CORS, comprehensive security headers, atomic balance operations, input validation, WebSocket protection, and suspicious activity detection (cross-resource streaming monitoring, per-resource rate limits).
- **Mobile Experience:** The `acadvault-mobile` app is an Expo React Native application designed for native performance, matching web app design tokens, and trial-aware features.

# External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** Replit Auth (OIDC/PKCE)
- **Cloud Storage:** Google Cloud Storage (via `@google-cloud/storage`)
- **Frontend UI Library:** shadcn/ui
- **Mobile Development Framework:** Expo