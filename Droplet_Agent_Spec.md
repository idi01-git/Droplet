# DROPLET --- Agent Build Specification

**Document type:** Product brief + PRD + design system + technical
architecture + implementation instructions\
**Version:** 1.0\
**Status:** Source of truth for the initial MVP\
**Product name:** Droplet

------------------------------------------------------------------------

## 0. Instructions to the implementation agent

Build **Droplet**, a browser-based temporary sharing tool that lets a
person transfer text, links, and files between devices without signing
into email or a messaging account. Treat this document as the primary
product and engineering specification.

### Agent rules

1.  Inspect the repository before changing anything. Preserve useful
    existing work and conventions.
2.  Implement a complete, working MVP, not merely a static mockup. Do
    not fake successful uploads, room creation, realtime updates,
    expiry, or downloads.
3.  Prefer the smallest reliable architecture that meets the
    requirements. Do not add microservices, Kubernetes, Redis, GraphQL,
    Redux, or a VPS without a demonstrated need.
4.  Keep secrets server-side. Never expose service credentials, private
    storage credentials, or privileged database keys in frontend code.
5.  Enforce access control, expiration, quotas, and upload validation on
    the server. Frontend checks are for usability, not security.
6.  If external credentials or environment variables are missing,
    implement the integration points, provide `.env.example`, and
    explain the exact setup steps. Do not claim production functionality
    until it has been tested.
7.  Do not silently substitute a different provider or architecture. If
    a provider limitation requires a change, document the trade-off.
8.  Include database migrations, tests for critical rules, setup
    instructions, deployment instructions, and a concise README.
9.  Keep all limits configurable in one central place. Do not scatter
    hard-coded limits across the codebase.
10. Prioritize security, accessibility, mobile responsiveness, and
    maintainability over decorative complexity.

------------------------------------------------------------------------

## 1. Product summary

Droplet is a lightweight, account-free, temporary, room-based sharing
web application. A user creates a room, receives a short code, opens
Droplet on another device, joins with that code, and shares text, links,
and files.

**Product promise:** Create a room. Drop anything. Pick it up anywhere.
Let it disappear.

### Core experience

-   Create a temporary room without registering or logging in.
-   Join the room from another browser/device using a four-digit code.
-   Send text, code snippets, URLs, and files.
-   See new items appear on connected devices.
-   Copy text, open links, download a single file, or download all
    uploaded files as a ZIP.
-   Automatically expire the room 24 hours after creation.
-   Let the owner delete the room earlier.
-   Enforce strict quotas to prevent abuse and unexpected hosting costs.

### Non-goals for the first release

-   Permanent cloud storage or user accounts.
-   Public file hosting or search.
-   Large-file transfer service.
-   Team administration or billing.
-   Native mobile applications.
-   Guaranteed peer-to-peer transfer.
-   End-to-end encryption unless separately designed and implemented.
-   Unlimited room lifetime or unlimited storage.

------------------------------------------------------------------------

## 2. Problem explanation

Moving a small piece of information between a personal device and a
shared computer is often much harder than it should be. A student may
need to move a URL, terminal command, code snippet, PDF, or image from a
laptop to a college laboratory PC. Existing workarounds include signing
into Gmail, opening a messaging app, using a USB drive, or relying on a
persistent cloud-storage service.

These workflows create avoidable friction: - Authentication and sign-out
overhead on shared computers. - Too many steps for a simple one-time
transfer. - Privacy risks from signing into personal accounts on public
machines. - Installation or local-network requirements for some transfer
tools. - Persistent files that the user must remember to delete. -
Services designed for long-term storage rather than quick, disposable
exchange.

**Problem statement:** Users need a fast, browser-only way to move text,
links, and files between devices without personal-account login,
software installation, or unnecessary persistent storage.

------------------------------------------------------------------------

## 3. Target users and use cases

### Primary users

-   Students moving notes, assignments, URLs, and code between personal
    laptops and lab computers.
-   Developers moving snippets, scripts, commands, and documentation
    between devices.
-   People using borrowed, public, or shared computers.

### Secondary users

-   Office workers sharing temporary documents.
-   People transferring files between phones, tablets, laptops, and
    desktops.
-   Small groups exchanging a temporary set of files.

### Key scenarios

1.  Copy a command on a personal laptop and paste it into a lab PC.
2.  Send a link to a second computer without logging into a messaging
    service.
3.  Upload a PDF and download it on another device.
4.  Download one file or all room files together as a ZIP.
5.  Delete the room immediately when finished.
6.  Let an unused room expire automatically.

------------------------------------------------------------------------

## 4. Product requirements

### 4.1 Room management

-   A user can create a room without an account.
-   The backend generates a unique four-digit code among active rooms.
-   The room has a fixed `expires_at` timestamp set at creation:
    `created_at + 24 hours`.
-   Users can join an active room by entering its code.
-   Each joined device receives a separate high-entropy session
    credential.
-   The creator receives an owner credential; other devices receive
    participant credentials.
-   The owner can delete the room early.
-   Expired or deleted rooms are inaccessible even if background cleanup
    has not yet physically deleted their files.
-   Rate-limit room creation and failed room-code attempts.
-   Do not rely on the four-digit code alone for continued access after
    joining.

### 4.2 Sharing text and links

-   Provide a text composer supporting plain text, notes, commands, and
    code snippets.
-   Support URL items with a one-click open action and copy action.
-   Provide one-click copy for text.
-   Render user content as text, never as trusted HTML.
-   Validate and normalize URLs; reject dangerous schemes such as
    `javascript:` and `data:` for clickable links.
-   Limit each text/link item to 100 KiB by default.
-   Apply per-session/per-room rate limits.
-   New items appear on connected devices in near real time.
-   Avoid repeated database polling when a realtime event channel is
    available.

### 4.3 File upload

-   Support common documents, images, archives, PDFs, and source files.
-   Use drag-and-drop and a file picker.
-   Display filename, file size, upload status/progress, and
    download/delete actions where authorized.
-   Initial limits: 20 files per room, 10 MiB per file, and 50 MiB total
    uploaded file bytes per room.
-   Initial maximum of 2 concurrent uploads per room.
-   Reject invalid or oversized uploads on the server.
-   Reserve room capacity atomically before accepting concurrent
    uploads.
-   Clean up reservations and partially uploaded objects after
    failures/timeouts.
-   Treat client MIME type and filename as untrusted. Use generated
    object keys; never use a user filename as a storage path.
-   Do not execute or render uploaded files as trusted application
    content.

### 4.4 Individual downloads

-   Every file has an individual Download action.
-   Authorize the request against room membership, session validity,
    room expiry, and file ownership/room association.
-   Use short-lived download authorization or signed URLs supported by
    the chosen storage provider.
-   Keep storage private; a guessed object key must not grant access.
-   Do not proxy large file bytes through the Worker unless required by
    provider limitations or security design.
-   Avoid logging signed URLs or session tokens.

### 4.5 Download All ZIP

-   Provide a **Download All (.zip)** action.
-   Include all uploaded files by default.
-   Optionally offer inclusion of text/link items in a `room-notes.txt`
    file.
-   Initial ZIP limit: 50 MiB total archive/source budget. Enforce an
    explicit, documented limit.
-   Use safe archive paths and sanitize filenames. Prevent path
    traversal and duplicate-name collisions.
-   Avoid loading unbounded file content or the entire archive into
    server memory.
-   For the MVP, a client-side ZIP library may be used only if its
    memory behavior is acceptable within the 50 MiB limit; handle
    failures and explain the limitation. Prefer a bounded/streaming
    approach if reliable in the selected stack.
-   Do not create an unbounded queue of archive jobs.
-   If the archive cannot be created, show an actionable error and keep
    individual downloads available.

### 4.6 Expiration and deletion

-   A room expires 24 hours after creation; item upload time does not
    extend room lifetime.
-   Every sensitive API endpoint must check expiry at request time.
-   On expiry, immediately deny new uploads and downloads and invalidate
    room sessions.
-   A scheduled cleanup task deletes expired R2 objects and associated
    database rows.
-   Cleanup must be idempotent and retry failed deletions.
-   Include a reconciliation process or administrative procedure for
    orphaned objects and stale upload reservations.
-   Never claim data has been physically erased until deletion has
    succeeded. Product copy can say "expired and inaccessible" while
    cleanup is pending.
-   Owner-triggered room deletion should revoke access immediately and
    queue/perform object deletion.
-   Handle a cleanup delay without exposing expired content.

------------------------------------------------------------------------

## 5. Initial limits and configuration

Centralize these values in a configuration module and allow safe
environment-based overrides.

  Setting                                                                Default
  ------------------------------------ -----------------------------------------
  Room lifetime                                                         24 hours
  Room code                                                     4 decimal digits
  Files per room                                                              20
  Max file size                                                           10 MiB
  Total uploaded file bytes per room                                      50 MiB
  Text/link item size                                                    100 KiB
  Active rooms per creator session                                             3
  Concurrent uploads per room                                                  2
  Download All limit                                                      50 MiB
  Room creation                                      Rate-limited per IP/session
  Failed join attempts                   Strict rate limit and temporary lockout
  Upload/download requests                     Rate-limited per session and room

These are **application limits**, not provider quotas. Do not confuse
them with Cloudflare plan limits.

Implement a global capacity circuit breaker. If the configured global
storage/operation budget is reached, reject new room creation or uploads
safely, but preserve authorized access to existing unexpired content
where feasible. Provider billing alerts are supplementary;
application-side limits must enforce the safety boundary.

Use MiB consistently in code and UI, or clearly document whether values
are decimal MB or binary MiB.

------------------------------------------------------------------------

## 6. Design system --- Droplet

### 6.1 Visual direction

Use a bold, playful **neo-brutalist** design. The UI should feel fun,
tactile, energetic, and slightly quirky without sacrificing usability.
Use vivid yellow, black, warm off-white, thick outlines, hard offset
shadows, rounded-but-not-pill-shaped components, chunky typography, and
small hand-drawn accents.

Avoid generic corporate gradients, excessive glassmorphism, excessive
animation, tiny low-contrast text, or overdecorated layouts.

### 6.2 Brand voice

-   Short, friendly, confident microcopy.
-   Prefer direct labels: "Create room", "Join room", "Drop files",
    "Copy text", "Download all", "Room expires in...".
-   Explain temporary behavior clearly.
-   Avoid promising perfect security or instant transfer in every
    network condition.

Suggested tagline: **"Create a room. Drop anything. Pick it up anywhere.
Let it disappear."**

### 6.3 Color tokens

Use CSS variables/design tokens; do not scatter raw hex values through
components.

-   `--color-primary`: `#FFDE00` (bright yellow; main
    actions/highlights)
-   `--color-ink`: `#000000` (text, outlines, shadows)
-   `--color-background`: `#FFFEF7` (warm off-white canvas)
-   `--color-surface`: `#F5F3EA` (cards and panels)
-   `--color-error`: `#FF6B6B`
-   `--color-success`: `#00D084`
-   `--color-info`: `#3B82F6`
-   `--color-accent`: `#A855F7`

Check text contrast for all status colors. Do not use color alone to
communicate errors/success; pair with text/icons. Use black text on
yellow. For colored badges, verify contrast before using black or white
text.

### 6.4 Typography

Use a chunky, playful display font for headings and a highly readable
sans-serif for body text. Suggested pairing: **Fredoka** for
display/headings and **Inter** for body/UI, loaded with robust system
fallbacks. Use locally bundled or optimized font loading where possible;
never let font download failure break the interface.

Suggested hierarchy: - Display/hero: 56--72 px desktop, 40--48 px
mobile, heavy/bold. - H1: 40--48 px desktop, 32--36 px mobile. - H2:
28--32 px. - H3: 20--24 px. - Body: 16 px. - Supporting text: 14 px. -
Tiny metadata: 12--13 px, only where necessary.

Use strong hierarchy, readable line length, and generous spacing.

### 6.5 Borders, shadows, and shape

-   Default border: 2 px solid black.
-   Strong panels/hero: 3 px solid black when needed.
-   Hard offset shadow: approximately `4px 4px 0 #000`.
-   Pressed state: reduce/remove offset shadow and translate the control
    down/right.
-   Corner radius: approximately 10--16 px for cards/inputs; 8--12 px
    for buttons.
-   Avoid soft, blurry shadows as the main visual style.
-   Use spacing tokens based on a 4 px grid.

### 6.6 Component behavior

**Primary button:** Yellow fill, black text, 2 px black outline, hard
black shadow. Hover slightly lifts or shifts; pressed state moves
down/right and reduces shadow. Visible keyboard focus.

**Secondary button:** Off-white fill, black border/shadow. Use for less
prominent actions.

**Danger button:** Red fill with black text/outline, explicit
confirmation for destructive room deletion.

**Inputs:** Off-white fill, 2 px black outline, visible focus ring,
clear placeholder, inline validation. Room code input should be large,
spaced, and easy to use.

**Cards/file rows:** Off-white surface, strong outline, compact
metadata, icon, filename, file size/type, and clear actions.

**Badges:** Small high-contrast labels such as FILE, LINK, TEXT, NEW,
EXPIRES SOON.

**Alerts/toasts:** Text and icon plus color; announce status accessibly.
Success/error should not be conveyed by color alone.

**Upload area:** Dashed or solid black border, generous drop target,
upload icon, clear instruction, keyboard-accessible file picker.

**Room code panel:** Prominent large digits, copy button, optional QR
code. Do not show the owner session token.

**Progress bar:** Black outline, yellow fill, readable percentage and
status.

**Icons:** Use one consistent icon library, preferably Lucide, with
simple black line icons. Avoid mixing emoji, outline, and filled icon
styles arbitrarily.

### 6.7 Mascot and logo

Use a simple friendly droplet mascot with a black outline, yellow fill,
expressive face, and small hand-drawn motion marks. The logo should
remain legible in one color and at small sizes. The mascot is a brand
accent, not a required element in every panel.

### 6.8 Layout and responsiveness

-   Desktop: centered content with a sensible max-width, clear room
    header, composer/upload area, and item list.
-   Mobile: single-column layout, large touch targets, no horizontal
    overflow, sticky primary action only if it does not obstruct
    content.
-   Maintain a minimum 44×44 px touch target where practical.
-   Ensure keyboard navigation, visible focus, accessible labels,
    reduced-motion support, and screen-reader announcements.
-   Keep the interface sparse. The primary tasks are create/join, share,
    and retrieve.

### 6.9 Required screens

1.  **Home:** Brand/tagline, Create Room, Join Room with code, brief
    privacy/expiry statement.
2.  **Room:** Code, copy/QR, remaining lifetime, text/link composer,
    file drop zone, shared-item feed, Download All, owner delete action.
3.  **Join/loading:** Clear progress and failure states.
4.  **Expired/deleted room:** Explain that the room is no longer
    available and offer Create Room.
5.  **Upload errors:** Show whether the issue is file size, room
    capacity, network failure, or rate limit.
6.  **Empty state:** Friendly illustration and clear prompt to drop a
    file or send text.
7.  **Settings/help (minimal):** Limits, privacy explanation, supported
    file size, and expiry behavior.

------------------------------------------------------------------------

## 7. Recommended technology stack

### Frontend

-   **React + Vite + TypeScript**: fast client-rendered application,
    mature ecosystem, no need for SSR in the MVP.
-   **Tailwind CSS**: efficient styling with consistent tokens; use CSS
    variables for the brand palette.
-   **TanStack Query**: API request state, caching, retries and
    invalidation.
-   **React state or a small store**: use local component state first;
    add Zustand only if shared state becomes complex.
-   **Lucide icons**: consistent icon style.
-   Optional accessible primitives from shadcn/ui, heavily customized to
    fit Droplet's neo-brutalist system.

### Hosting/backend

**Preferred default architecture:** Cloudflare Pages (or equivalent
static hosting) + Cloudflare Workers + D1 + R2. Confirm current product
availability, account eligibility, and free-plan terms during setup.

-   **Workers:** API, authorization, quota enforcement, upload/download
    authorization, expiry checks.
-   **D1:** SQLite-compatible SQL metadata store.
-   **R2:** private object storage for uploaded files.
-   **Scheduled Worker/cron trigger:** expire rooms and clean storage.
-   **Durable Objects:** optional for per-room coordination or WebSocket
    fan-out if D1/Realtime notifications alone are insufficient. Do not
    add them until a real-time requirement justifies them.
-   **GitHub:** source control and deployment integration.

### Why this stack

-   Separates file bytes from database metadata.
-   One platform can serve frontend, API, SQL metadata and object
    storage.
-   Serverless model avoids managing a VPS and operating system.
-   R2's pricing model has historically offered no internet egress fees,
    making repeated downloads attractive; verify current pricing/terms
    before deployment.
-   D1 is sufficient for small room metadata and short-lived items.
-   Workers can enforce policy at the API boundary.

### Alternatives and why not by default

**Supabase:** Excellent alternative for the fastest MVP. It combines
PostgreSQL, Storage, Realtime and row-level security. Choose it if
developer speed and familiar SQL matter more than keeping everything in
Cloudflare. Verify current free-plan database/storage/egress quotas and
pause behavior before choosing it.

**Firebase:** Convenient realtime SDK, but document reads, storage,
downloads and rules need careful quota/cost planning. Not the default
for a file-heavy transfer utility.

**Vercel + separate backend:** Great frontend deployment, but adds a
second backend/storage ecosystem if Cloudflare can serve the entire app.

**VPS:** Maximum control but requires patching, monitoring, persistent
storage management, backups and ongoing server operations. Not ideal for
a zero-budget first release.

**WebRTC peer-to-peer:** Could reduce cloud file storage, but
connectivity can fail behind campus networks, NATs, and firewalls;
signaling and a fallback are still needed. Consider only after the cloud
MVP is reliable.

**Next.js:** Not needed initially because the app is primarily an
interactive utility and does not require server-side rendering or
SEO-heavy content.

Avoid microservices, Kubernetes, Redis, GraphQL, and a separate Node
server until real usage justifies the added complexity.

------------------------------------------------------------------------

## 8. System architecture

### Request path

1.  Browser loads the static React application over HTTPS.
2.  Browser sends room/API requests to Cloudflare Workers.
3.  Worker validates the request, room state, session, expiry, and
    quotas.
4.  D1 stores and retrieves room/item metadata.
5.  R2 stores and serves file bytes privately.
6.  Realtime mechanism notifies connected participants of item changes.
7.  Scheduled cleanup removes expired objects and metadata.

### Upload path

1.  Client asks the Worker to initiate an upload.
2.  Worker validates room membership, session, room expiry, file count,
    per-file size, total capacity, concurrency and global capacity.
3.  Worker atomically reserves capacity or creates a reservation record.
4.  Client uploads to a restricted R2 destination using a secure
    mechanism supported by the chosen provider.
5.  Worker finalizes the upload only after verifying the object and
    expected size.
6.  D1 records metadata and commits actual usage.
7.  Realtime notification informs the room.
8.  If upload/finalization fails, release reservation and delete any
    orphaned object.

Do not assume a browser can upload directly to a private R2 bucket
without an appropriately designed authorization/CORS/upload mechanism.
Verify the current Cloudflare-supported implementation before writing
upload code.

### Download path

1.  Client requests a file download from the Worker.
2.  Worker checks active session, room membership, room expiry and file
    association.
3.  Worker returns a short-lived authorized download path or streams the
    file only if necessary.
4.  Browser downloads from private storage.
5.  Do not log credentials or signed URLs.

### Realtime path

Use a supported realtime option appropriate to the chosen Cloudflare
design. If using Durable Objects/WebSockets, use them only for room
events and coordination, not as the default file-byte transport.
Reconnect should re-fetch the current room state so missed events do not
cause permanent inconsistency. Do not poll aggressively.

### Expiry path

-   Store a fixed expiration timestamp.
-   Check expiry on every sensitive request.
-   Scheduled cleanup processes expired rooms in bounded batches.
-   Delete R2 objects and related D1 rows idempotently.
-   Retry failed deletions.
-   Reconcile stale reservations and orphaned objects.
-   Monitor cleanup failures.
-   A room is inaccessible at expiry even if physical deletion is
    delayed.

------------------------------------------------------------------------

## 9. Data model

Keep the schema small. Add indexes for room lookup, expiration cleanup,
and item listing.

### `rooms`

Suggested fields: - `id`: internal random identifier, primary key. -
`code_hash` or appropriately protected room-code representation. -
`created_at`. - `expires_at`. - `status`: active, expired, deleting,
deleted. - `owner_session_hash`. - `used_bytes`. - `reserved_bytes`. -
`file_count`. - Optional `last_activity_at` for operational diagnostics
only; activity must not extend the fixed lifetime unless product policy
changes.

### `sessions`

Suggested fields: - `id`. - `room_id`. - `token_hash`, never the raw
token. - `role`: owner or participant. - `created_at`. - `expires_at`. -
`revoked_at`.

Use high-entropy session tokens, store only a cryptographic hash where
practical, and deliver tokens through secure transport and appropriate
cookie/storage handling. Choose cookie flags and CSRF protections
appropriate to the implementation. Avoid persistent credentials on
shared lab computers where possible; make session expiry and room
deletion revoke access.

### `items`

Suggested fields: - `id`. - `room_id`. - `type`: text, link, file. -
`text_content` for bounded text/link content where appropriate. -
`object_key` for file objects. - `filename` as display metadata only. -
`size_bytes`. - `mime_type` as untrusted/verified metadata. -
`created_at`.

### Optional `upload_reservations`

Use if needed for safe concurrency: - `id`. - `room_id`. -
`session_id`. - `expected_bytes`. - `created_at`. - `expires_at`. -
`status`.

All room-owned records must have foreign keys or equivalent integrity
checks. Do not trust a client-provided `room_id` without verifying
session authorization.

------------------------------------------------------------------------

## 10. Security and abuse prevention

-   HTTPS only.
-   Private object storage; no public bucket for room files.
-   Never expose service-role or storage secrets in frontend bundles.
-   High-entropy per-device session credentials separate from the room
    code.
-   Hash session tokens at rest where practical.
-   Strict room-code attempt limits, rate limiting and temporary
    lockouts.
-   Rate-limit room creation, text posting, uploads, downloads and
    archive requests.
-   Authorize every operation on the server.
-   Check room expiry on every read/write/download.
-   Reserve quota atomically before upload.
-   Generate opaque object keys; do not use raw filenames as keys.
-   Sanitize filenames and ZIP entry paths.
-   Treat all user content as untrusted; escape text and validate URL
    schemes.
-   Add security headers and restrictive CORS.
-   Avoid storing sensitive payloads in logs or analytics.
-   Avoid exposing room contents in error messages.
-   Use request size limits and timeouts.
-   Make delete and cleanup operations idempotent.
-   Include abuse handling and a safe rejection path when capacity is
    reached.

Four-digit codes have only 10,000 possible combinations and are not
strong authentication. Rate limits and lockouts are mandatory; consider
six digits if abuse becomes material. For highly sensitive data, Droplet
should not claim to be a secure vault.

------------------------------------------------------------------------

## 11. Cost and free-tier strategy

Target a \$0 initial deployment where current free-plan terms allow it.
Do not guarantee zero cost without checking the actual account, region,
terms, quotas, and enabled features.

Cost-control requirements: - Store file bytes in R2, not D1. - Keep
metadata and text payloads bounded. - Enforce per-room and global
storage ceilings. - Limit active rooms and upload/download
concurrency. - Use short-lived authorized downloads. - Avoid repeated
full-table scans; add appropriate indexes and bounded cleanup batches. -
Avoid aggressive polling and unnecessary database writes. - Avoid
storing a database record for every download unless operationally
necessary. - Limit ZIP creation size and concurrency. - Monitor
requests, storage, operations, egress, CPU/time and cleanup errors. -
Set provider billing/usage alerts where available. - Implement
application-side stop conditions; alerts alone are not hard spending
limits. - Document what happens when capacity is exhausted.

Official pricing pages to verify before deployment: - Cloudflare
Workers: https://developers.cloudflare.com/workers/platform/pricing/ -
Cloudflare D1: https://developers.cloudflare.com/d1/platform/pricing/ -
Cloudflare R2: https://developers.cloudflare.com/r2/pricing/ - Supabase:
https://supabase.com/pricing/ - Vercel plans:
https://vercel.com/docs/plans

Free allowances and terms can change. Check them at implementation time
and record the chosen limits in the README.

------------------------------------------------------------------------

## 12. API outline

Use REST endpoints unless there is a clear reason to do otherwise. Exact
routes can follow repository conventions.

-   `POST /api/rooms` --- create room and owner session.
-   `POST /api/rooms/join` --- join room using code; issue participant
    session.
-   `GET /api/rooms/:roomId` --- get authorized room metadata and items.
-   `POST /api/rooms/:roomId/items/text` --- add text or link item.
-   `POST /api/rooms/:roomId/uploads/initiate` --- validate and reserve
    upload.
-   `POST /api/rooms/:roomId/uploads/:uploadId/complete` ---
    verify/finalize upload.
-   `POST /api/rooms/:roomId/items/:itemId/download` --- authorize a
    file download.
-   `DELETE /api/rooms/:roomId/items/:itemId` --- delete an item if
    permitted.
-   `DELETE /api/rooms/:roomId` --- owner-only immediate room deletion.
-   `GET /api/health` --- minimal health status without secrets.

Every endpoint must validate input, apply rate limits, verify
session/role, check room expiry, and return consistent error shapes. Do
not expose internal stack traces to clients.

Example error categories: - `ROOM_NOT_FOUND` - `ROOM_EXPIRED` -
`INVALID_CODE` - `RATE_LIMITED` - `FILE_TOO_LARGE` -
`ROOM_QUOTA_EXCEEDED` - `GLOBAL_CAPACITY_REACHED` - `UNAUTHORIZED` -
`UPLOAD_FAILED` - `ARCHIVE_LIMIT_EXCEEDED`

------------------------------------------------------------------------

## 13. Acceptance criteria

The MVP is not complete until all of the following are verified:

1.  A user can create a room without registration.
2.  A second browser/device can join with the code.
3.  Owner and participant sessions are distinct.
4.  Text and links can be shared, copied, and opened.
5.  New items appear on connected devices and reconnect recovers current
    state.
6.  Individual file upload and download work end to end.
7.  Download All creates a valid ZIP within the configured size limit.
8.  Uploads exceeding per-file, per-room, concurrency, or global limits
    are rejected server-side.
9.  Concurrent uploads cannot overrun room storage capacity.
10. Unauthenticated or unauthorized requests cannot read room contents
    or files.
11. Expired rooms become inaccessible immediately at the expiry
    timestamp.
12. Cleanup removes expired objects and metadata; failures are retried
    and observable.
13. Owner deletion revokes access and triggers cleanup.
14. Room-code brute force and excessive requests are rate-limited.
15. The app works on current desktop and mobile browsers.
16. The UI is keyboard-accessible, responsive, and follows the Droplet
    design system.
17. `.env.example`, migrations, setup, testing, and deployment
    documentation are present.
18. No critical secret is exposed in client code or logs.

------------------------------------------------------------------------

## 14. Test plan

### Unit tests

-   Expiry calculations.
-   File size and item count validation.
-   Quota calculations and reservation release.
-   URL scheme validation.
-   Filename and ZIP path sanitization.
-   Session expiry and revocation.
-   Rate-limit decisions.

### Integration tests

-   Create/join room.
-   Unauthorized room read.
-   Text/link creation and retrieval.
-   Upload initiation/finalization and failed-upload cleanup.
-   Individual download authorization.
-   Owner-only room deletion.
-   Expiry denial before physical cleanup.
-   Cleanup retries and idempotency.
-   Concurrent upload quota race.
-   ZIP size limit and archive integrity.

### UI tests

-   Create and join forms.
-   Upload progress/error states.
-   Copy text and room code.
-   Individual download and Download All.
-   Expired room view.
-   Keyboard navigation and mobile layout.

### Manual production smoke test

Use two separate browsers/devices. Create a room, share text/link/file,
download the file on the second device, verify quotas, delete the room,
and confirm access is denied. Verify the scheduled cleanup mechanism in
a controlled test environment.

------------------------------------------------------------------------

## 15. Implementation plan

### Phase 0 --- Repository and setup

-   Inspect existing repository.
-   Identify package manager, framework, conventions, and current tests.
-   Set up React/Vite/TypeScript only if the repository does not already
    provide a suitable frontend.
-   Add formatting/linting, environment configuration, and a clear
    README.

### Phase 1 --- Design system and home screen

-   Define design tokens and typography.
-   Implement responsive home screen.
-   Implement Create Room and Join Room UI states.
-   Add loading, validation, and error states.

### Phase 2 --- Room lifecycle and authorization

-   Create database migrations.
-   Implement room creation/join and session credentials.
-   Enforce code uniqueness, expiry and rate limits.
-   Add room UI and metadata reads.

### Phase 3 --- Text, links and realtime

-   Implement text/link creation and rendering.
-   Add copy/open actions.
-   Implement realtime notification and reconnect recovery.

### Phase 4 --- Files and quotas

-   Implement private object storage uploads/downloads.
-   Add atomic capacity reservation, file metadata, individual downloads
    and safe deletion.
-   Test concurrency and failure recovery.

### Phase 5 --- ZIP and cleanup

-   Implement bounded Download All.
-   Implement scheduled expiry cleanup, retries and reconciliation.
-   Confirm expired content cannot be accessed before physical deletion
    finishes.

### Phase 6 --- Hardening and deployment

-   Complete security tests, responsive/accessibility checks, usage
    monitoring and error handling.
-   Configure production environment variables and provider permissions.
-   Deploy and run the smoke test.
-   Document current free-tier limits and operational risks.

Do not build future enhancements before the end-to-end core flow works.

------------------------------------------------------------------------

## 16. Future enhancements (not MVP blockers)

-   QR-code joining.
-   Six-digit codes or optional room passwords.
-   Direct peer-to-peer WebRTC transfer with cloud fallback.
-   Download selected files as a ZIP.
-   More robust streaming ZIP generation for larger archives.
-   Optional configurable expiration.
-   Optional end-to-end encryption with a separate threat model.
-   Improved mobile-to-desktop clipboard workflows.
-   Minimal privacy-preserving aggregate usage metrics.

------------------------------------------------------------------------

## 17. Definition of done

The first release is done when a person can open Droplet on one device,
create a room, join it from another device without an account, share
text/links/files, individually download a file or download all files in
a bounded ZIP, and trust that access ends at 24 hours. All operations
must respect server-side authorization and quotas, cleanup must be
retryable, and the app must deploy with documented setup steps and no
exposed secrets.

**Final guiding principle:** Make the happy path feel effortless, but
make every expensive or sensitive operation bounded, authorized,
observable, and safe to retry.
