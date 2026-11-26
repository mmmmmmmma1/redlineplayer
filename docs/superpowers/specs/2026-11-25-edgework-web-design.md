# Edgework Web: design

By Andrew (obaba-samich) and Myles. Written 2026-11-25.

## Why

Edgework is Andrew's iOS training app for hockey players (and track athletes). Myles built
Redline Player, a one-file web app with a vertical video feed of exercise clips. We're moving to
one web app so anyone can use it from a browser without the App Store, and so coaches and players
can share how-to videos for exercises. Edgework leads: its features, its look. Redline's video
idea comes along, reshaped around exercises instead of a feed.

## Goals

- A web app (phone first, works on desktop) with Edgework's training features.
- Logins. A new account can't see or do anything until a staff member approves it.
- How-to videos on exercise pages: staff post them for everyone; players record or upload their
  own and either keep them private or request that staff add them for everyone.
- Safe by default: no injection holes, safe uploads, nothing that lets strangers reach players.
- Every commit runs the tests on GitHub. One change per commit.
- Credit both authors in the app and the README.

## Non-goals (for now)

- iOS-only features: Siri, widgets, Live Activities / Dynamic Island, the 3D figures.
- Hosting. The server is ready to deploy, but picking and paying for a host comes later.
- Native apps. The web app can be added to the Home Screen.

## Anti-goals (would make it a failure even if it works)

- Any way for a member to message, comment on, or find another member's profile.
- A player's private video being visible to anyone but them (and staff only when they request).
- Videos that leak where they were filmed (GPS metadata) or a server that runs uploaded files.
- Redline's red theme replacing Edgework's ice-blue one.

## Accounts and roles

- Sign up with a username (not email-required), display name and password. The account starts
  **pending**: after logging in you only see "Waiting for a staff member to approve you".
- Roles: **player** (default), **staff** (approve or decline accounts, review video requests,
  remove videos, suspend accounts), **admin** (everything staff can do, plus make or remove staff).
- The first admin is created from the command line on the server (`npm run create-admin`), so
  there's never a "first person to sign up becomes admin" hole.
- Declined and suspended accounts can't log in. Staff see a list of pending accounts with the
  date they signed up and can approve or decline each.

## Videos

- Each exercise page has a **How-to** area.
  - **Staff videos:** posted by staff or admins, visible to every approved member.
  - **Your videos:** a player records (camera) or uploads a clip for that exercise. It's always
    visible to them on that exercise. Each one is **Private** or **Requested**.
  - A request shows **Waiting**, then **Added** (now visible to everyone, still listed as theirs)
    or **Declined** (with an optional reason). A declined or private video still shows for its
    owner. The owner can delete their own video any time, even after it's added.
- Staff **Review** page: requested videos with Approve / Decline (+ reason), and reported videos.
- Any member can **Report** a visible video. Staff can remove any video.
- No Shorts tab. Videos live only on exercise pages.

## Safety

- Passwords hashed with Argon2id. Sessions in an httpOnly, Secure, SameSite=Lax cookie, stored
  server side so they can be revoked (suspending someone logs them out everywhere).
- Login and sign-up are rate limited per IP and per username.
- All database access goes through parameterised queries (Drizzle ORM). No string-built SQL.
- Everything shown is escaped by Svelte; no `{@html}` with user text. A strict Content Security
  Policy (no inline scripts from users, no third-party scripts) as a second wall.
- Form actions check the origin (SvelteKit's CSRF check stays on).
- Every server route checks the session, the account status and the role. Permission rules live
  in one module with unit tests for each rule.
- Uploads: size limit (default 200 MB, 3 minutes), the file's real type is checked from its bytes,
  then it's re-encoded with ffmpeg to H.264 MP4 with metadata stripped (no GPS, no device info).
  Originals are deleted after encoding. Files get random names and are served only through an
  authenticated route, never from a public folder.
- Audit log of staff and admin actions (who, what, when).
- No public profiles, messages, comments or member search.

## Data

- SQLite (one file) via Drizzle. Tables: users, sessions, videos, reports, audit_log, plus each
  user's training data (settings, history, logs) as JSON per user to start, so the Edgework
  models port over without redesigning them all as tables.
- Exercise library, programs and foods are static data in the code (ported from the Swift files).
- Videos on the server's disk under a data folder, behind a small storage interface so S3-type
  storage can replace it later.

## Approaches considered

1. **SvelteKit + SQLite + disk storage (picked).** One TypeScript codebase for pages and server,
   small and fast, runs on any small server. Svelte escapes output by default.
2. **Supabase or Firebase.** Logins and storage for free, but security lives in database rules
   that are easy to get wrong, it ties the app to one company, and re-encoding videos still needs
   a server.
3. **Grow Myles's single HTML file.** No build step, but Edgework has dozens of screens; one
   file of string-built HTML would be hard to keep safe and impossible to test well.

## Look

Edgework's dark ice-blue theme (bg #080D18, surface #111827, accent #7CD4FF / #2F8CFF, text
#EDF2FA), and the warm-red track variant when the sport is track. Tab bar at the bottom on phones,
sidebar on desktop (Redline's layout idea, Edgework's colours).

## Order of work

1. Branch setup: SvelteKit project, test tools, GitHub Actions running lint, type check, unit
   tests and browser tests on every push and pull request. Redline's `index.html` kept in
   `legacy/` for reference.
2. Accounts: sign up, log in, pending screen, staff approval, roles, admin script.
3. Exercise library and exercise pages (ported data, search, filters).
4. Videos: record/upload, private/request, review, report, re-encode.
5. Today, workout generator, player (timer), mandatory exercises, programs, history.
6. Settings with search.
7. Then: Study and the knowledge quiz, Food, GPS runs, Myles's soreness body map and game stats.

## Calls Claude made (check these)

- The app is called **Edgework**, credited to Andrew and Myles.
- Username sign-up, no email (so no email server needed; staff approval replaces email checks).
- First admin made from the command line.
- Training data stored as JSON per user at first.
- Default upload limits: 200 MB, 3 minutes.
- Myles's other features (soreness body map, game stats) come in step 7.
