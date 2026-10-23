# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary users are students, developers, and tech-savvy individuals moving between personal laptops, university computer labs, borrowed workstations, or mobile devices who need to quickly transfer notes, terminal commands, code snippets, and files without signing into personal email, Google, or messaging accounts on untrusted or shared machines.

## Product Purpose
Droplet exists to eliminate the friction and security risks of logging into personal accounts on shared computers. Success means creating a room in one click, dropping content, picking it up on another machine via a memorable 4-digit code in under 10 seconds, and letting everything permanently self-destruct after 24 hours.

## Positioning
Unlike permanent cloud storage drives (Google Drive, Dropbox) or account-based messaging channels (Slack, Telegram), Droplet is an ephemeral, zero-friction burner drop: no email, no password, memorable 4-digit numeric access, instant WebSocket broadcast, and guaranteed non-negotiable 24-hour expiration.

## Operating Context
- Environments: University computer labs, shared office workstations, classrooms, hackathons, and mobile-to-desktop handoffs.
- Content types: Terminal commands, URLs, code snippets, setup credentials/tokens, PDFs, lab reports, image assets, and archives.
- Device constraints: Public keyboards, shared monitors, browsers with public history and persistent caches (making account logins risky).

## Capabilities and Constraints
- Ephemeral Room Lifecycle: Strictly 24 hours from creation; non-extendable.
- Access Mechanism: 4-digit decimal codes (0000–9999) with rate-limited brute-force lockout (5 failed attempts = 5-minute lockout).
- Storage Quotas: Up to 20 files per room, 50 MiB per file, 200 MiB total per room, 100 KiB text note limit.
- Concurrent Limits: Maximum 2 concurrent upload reservations per room to prevent socket/disk starvation.
- Real-Time Broadcast: Sub-second WebSocket propagation for added notes, links, and uploaded files.
- Bounded Archive: One-click "Download All" ZIP generation (up to 200 MiB) with collision-free filenames and a compiled `room-notes.txt`.
- Zero-Auth Ownership: Cryptographically hashed device token grants owner rights (immediate room deletion, revoking all active sessions).

## Brand Commitments
- Name: Droplet
- Voice: Playful, tactile, direct, no-nonsense, friendly ("Drop anything. Pick it up anywhere. Let it disappear.").
- Mascot: Stylized Droplet character with expressive blinking/happy states and tactile bounce animations.
- Visual Language: Neo-brutalist identity (vibrant `#FFE000` yellow, bold `#000000` 2px/3px borders, hard `4px 4px 0 #000` tactile drop shadows, Fredoka heading font, Inter body font).

## Evidence on Hand
- Full specification documented in `Droplet_Agent_Spec.md`.
- Working production-grade codebase with 38 passing tests across 8 test suites.
- Vector assets: `DropletLogo.tsx`, `DropletMascot.tsx`, `droplet-icon.svg`.

## Product Principles
1. Zero Friction First: No sign-ups, no passwords, no app installs. Immediate utility in one click.
2. Ephemeral by Design: Data is meant to disappear. Strict 24-hour expiration and instantaneous owner destruction are non-negotiable guarantees.
3. Tactile and Clear: High-contrast neo-brutalist affordances make interactions feel tangible, fast, and unmistakably responsive.
4. Fail-Safe Quotas: Transparent room limits and graceful bounded archives ensure the service remains resilient under concurrent load.

## Accessibility & Inclusion
- High visual contrast (WCAG AAA compliance with deep `#000000` text and borders over `#FFFDE7` canvas and `#FFE000` accents).
- Full keyboard navigability (custom 4-digit code auto-advancing inputs with Backspace and paste handling).
- Clear screen-reader state cues (aria roles, live sync status pill, explicit error alerts).
