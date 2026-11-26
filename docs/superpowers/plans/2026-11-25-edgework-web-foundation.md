# Edgework Web Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The first working slice of Edgework Web: project setup with tests on every commit, staff-approved logins, the exercise library, and how-to videos on exercise pages with private/request/review/report.

**Architecture:** One SvelteKit app (pages + server routes) in TypeScript. SQLite through Drizzle for users, sessions, videos, reports and the audit log. Videos are re-encoded with ffmpeg and kept on disk outside any public folder, served only through a route that checks permissions. All permission rules live in one tested module.

**Tech Stack:** Node 22, SvelteKit 2 + Svelte 5, TypeScript, Drizzle ORM + better-sqlite3, @node-rs/argon2, file-type, ffmpeg (system binary), Vitest, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-25-edgework-web-design.md`

This plan covers spec "Order of work" steps 1–4. Steps 5–7 (Today/generator/player, Settings, Study/Food/GPS/body map/game stats) get their own plans.

## Global Constraints

- Every commit is one change and passes `npm run check && npm test && npm run test:e2e`. No co-author or tool attribution lines in commits.
- Theme: bg `#080D18`, surface `#111827`, surface2 `#1A2335`, accent `#7CD4FF`, accent-deep `#2F8CFF`, text `#EDF2FA`, text2 `#8D99B2`, red `#FF4D5E`, green `#3DDC97`, amber `#FFB547`. Track variant: bg `#100A0C`, surface `#1C1316`, accent `#FF8A7A`, accent-deep `#E5484D`.
- Credit line (README and app About): "Edgework by Andrew (obaba-samich) & Myles".
- No raw SQL strings with user input; no `{@html}` with user-provided text; ffmpeg is spawned with an argument array, never a shell.
- Account statuses: `pending | active | declined | suspended`. Roles: `player | staff | admin`.
- Video statuses: `private | requested | added | declined | removed`. Kinds: `staff | player`.
- Upload limits: 200 MB, 180 seconds. Output: H.264/AAC MP4, metadata stripped, `+faststart`.
- Sessions: 30 days, httpOnly, Secure (except on localhost in dev), SameSite=Lax, token stored only as a SHA-256 hash.
- Data folder from env `DATA_DIR` (default `./data`): `data/edgework.db`, `data/videos/`.

## Review Focus

1. A pending, declined or suspended user calling a server route directly (not through a page) must get 401/403, never data. → Task 5 test `blocks API for pending users`.
2. A player guessing another player's private or declined video URL must get 404 (not 403, so it doesn't confirm the video exists). → Task 9 test `hides other players' private videos`.
3. A file renamed to `.mp4` that isn't a video, or one over the size/length limit, is rejected with a clear message and leaves no file on disk. → Task 8 tests.
4. Usernames that differ only in case or by look-alike Unicode ("Andrew" vs "andrew", full-width letters) can't create a second account. → Task 3 test `normalises usernames`.
5. Suspending someone who is logged in ends their sessions immediately. → Task 6 test `suspend logs the user out`.

---

### Task 1: Project setup, theme, credits and CI

**Files:**
- Move: `index.html` → `legacy/redline-player.html`
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `playwright.config.ts`, `.gitignore`, `.nvmrc` (22)
- Create: `src/app.html`, `src/app.css` (theme tokens as CSS variables, `[data-sport="track"]` overrides), `src/routes/+layout.svelte` (bottom tab bar on phones, sidebar ≥ 900px), `src/routes/+page.svelte` (placeholder "Edgework")
- Create: `README.md` (what it is, credit line, how to run, how to test), `LICENSE` (MIT, "Andrew (obaba-samich) & Myles")
- Create: `.github/workflows/ci.yml`
- Test: `src/lib/smoke.test.ts`, `e2e/home.test.ts`

- [ ] **Step 1:** `npx sv create` (minimal, TypeScript, Vitest, Playwright, adapter-node), then move Redline's `index.html` to `legacy/`.
- [ ] **Step 2: Tests:** `smoke.test.ts` asserts `1 + 1 === 2` (proves Vitest runs); `e2e/home.test.ts` loads `/` and expects heading text `Edgework`.
- [ ] **Step 3:** Add scripts: `check` (svelte-check), `test` (vitest run), `test:e2e` (playwright test). Run all three. Expected: pass.
- [ ] **Step 4:** `ci.yml`: on `push` (all branches) and `pull_request`; ubuntu-latest; `actions/setup-node` with `.nvmrc`, `npm ci`, `sudo apt-get install -y ffmpeg`, `npx playwright install --with-deps chromium`, then `npm run check`, `npm test`, `npm run test:e2e`. Upload the Playwright report on failure.
- [ ] **Step 5:** Commit `Set up SvelteKit app with tests and CI`, push the branch, and confirm the Actions run is green.

### Task 2: Database schema

**Files:**
- Create: `src/lib/server/db/schema.ts`, `src/lib/server/db/index.ts`, `drizzle.config.ts`, `drizzle/` (generated migrations)
- Test: `src/lib/server/db/db.test.ts`

**Interfaces:**
- Produces: `createDb(path: string): Db` (runs migrations; `':memory:'` for tests), `db` (app instance from `DATA_DIR`), and tables:
  - `users(id text pk, username text unique, usernameKey text unique, displayName text, passwordHash text, role text, status text, createdAt int, decidedBy text null, decidedAt int null)`
  - `sessions(idHash text pk, userId text fk, expiresAt int)`
  - `videos(id text pk, ownerId text fk, exerciseId text, kind text, status text, title text, declineReason text null, file text, durationS real, createdAt int, reviewedBy text null, reviewedAt int null)`
  - `reports(id text pk, videoId text fk, reporterId text fk, reason text, createdAt int, resolvedBy text null, resolvedAt int null)`
  - `auditLog(id text pk, actorId text, action text, targetType text, targetId text, detail text, createdAt int)`
  - `userData(userId text pk, json text, updatedAt int)`

- [ ] **Step 1: Test** `creates tables and enforces unique usernameKey`: insert two users with the same `usernameKey`, expect the second to throw.
- [ ] **Step 2:** Run, see it fail; write schema + `createDb` (WAL mode, foreign keys on); generate the migration with drizzle-kit; run, see it pass.
- [ ] **Step 3:** Commit `Add database schema`.

### Task 3: Passwords, sessions, rate limits

**Files:**
- Create: `src/lib/server/auth/password.ts`, `src/lib/server/auth/session.ts`, `src/lib/server/auth/username.ts`, `src/lib/server/rateLimit.ts`
- Test: `src/lib/server/auth/auth.test.ts`, `src/lib/server/rateLimit.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(pw: string): Promise<string>`, `verifyPassword(hash: string, pw: string): Promise<boolean>` (Argon2id)
  - `validatePassword(pw: string): string | null` (error text; min 10 chars, max 128)
  - `normaliseUsername(name: string): { display: string; key: string } | { error: string }` (NFKC, trim, lowercase key; 3–24 chars of `a-z 0-9 _ .`)
  - `createSession(db, userId): Promise<{ token: string; expiresAt: Date }>`, `validateSession(db, token): Promise<{ user: User; session: Session } | null>` (extends when < 15 days left), `invalidateSession(db, token)`, `invalidateUserSessions(db, userId)`
  - `createRateLimiter({ max: number; windowMs: number }): { hit(key: string): boolean }` (returns false when over the limit)

- [ ] **Step 1: Tests:** `hashes and verifies`; `rejects short passwords`; `normalises usernames` (`"Andrew"` and `"ａｎｄｒｅｗ"` give the same key; `"a"` and `"bad name!"` give errors); `session token is not stored in plain text` (the row's `idHash` ≠ token); `expired session is rejected`; `invalidateUserSessions ends every session`; `rate limiter blocks after max and resets after window` (fake timers).
- [ ] **Step 2:** Run, see them fail; implement; run, see them pass.
- [ ] **Step 3:** Commit `Add passwords, sessions and rate limiting`.

### Task 4: Permission rules

**Files:**
- Create: `src/lib/server/permissions.ts`
- Test: `src/lib/server/permissions.test.ts`

**Interfaces:**
- Produces: `type Actor = { id: string; role: Role; status: Status }`, and pure functions:
  - `isActive(a: Actor | null): boolean`
  - `isStaff(a): boolean` (staff or admin, and active)
  - `canManageRoles(a): boolean` (active admin)
  - `canSeeVideo(a, v: Video): boolean`: owner always (unless `removed`); staff always; others only when `kind === 'staff'` or `status === 'added'`
  - `canDeleteVideo(a, v)`: owner or staff
  - `canRequestVideo(a, v)`: owner and status `private` or `declined`
  - `canReview(a)`: same as `isStaff`
  - `canReport(a, v)`: active, not the owner, and `canSeeVideo`

- [ ] **Step 1: Tests:** a table-driven test covering each function for player/staff/admin × active/pending/suspended, and each video status × owner/non-owner. Must include: pending staff can't review; player can't see another player's `declined` video; owner still sees their own `declined` video; nobody but staff sees `removed`.
- [ ] **Step 2:** Run, fail, implement, pass.
- [ ] **Step 3:** Commit `Add permission rules`.

### Task 5: Sign up, log in, pending gate, security headers

**Files:**
- Create: `src/hooks.server.ts`, `src/routes/signup/+page.svelte`, `src/routes/signup/+page.server.ts`, `src/routes/login/+page.svelte`, `src/routes/login/+page.server.ts`, `src/routes/logout/+page.server.ts`, `src/routes/pending/+page.svelte`, `src/routes/(app)/+layout.server.ts`
- Modify: `src/routes/+layout.svelte` (tab bar only when active)
- Test: `e2e/auth.test.ts`, `src/lib/server/guard.test.ts`

**Interfaces:**
- Consumes: Task 3 auth functions, Task 4 `isActive`.
- Produces: `event.locals.user: User | null`; `requireActive(event): User` and `requireStaff(event): User` in `src/lib/server/guard.ts` (throw `error(401)` when logged out, `error(403)` otherwise); every page under `src/routes/(app)/` is gated by its layout, and every `+server.ts` route calls a guard first.

- [ ] **Step 1: Tests (e2e):** `sign up lands on pending page`; `pending user is sent to /pending from any app page`; `wrong password shows one generic message` ("Wrong username or password", the same for unknown users); `sixth failed login in a minute is rate limited`; `logout ends the session`. **Unit:** `blocks API for pending users`: `requireActive` throws 403 for pending/declined/suspended, 401 for null.
- [ ] **Step 2:** Run, fail. Implement:
  - The hook reads the `session` cookie and sets `locals.user`.
  - Responses get these headers:
    - CSP: `default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'`, set with SvelteKit's `kit.csp` in `mode: 'auto'`.
    - `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`.
  - Login and signup limits: 5 per minute per IP+username, 20 per hour per IP.
- [ ] **Step 3:** Run, pass. Commit `Add sign up, log in and the pending gate`.

### Task 6: Staff account review, roles, audit log, admin script

**Files:**
- Create: `src/lib/server/audit.ts`, `src/routes/(app)/staff/accounts/+page.svelte`, `+page.server.ts`, `src/routes/(app)/staff/audit/+page.svelte`, `+page.server.ts`, `scripts/create-admin.ts`
- Modify: `package.json` (script `create-admin`: `tsx scripts/create-admin.ts`)
- Test: `e2e/staff.test.ts`, `src/lib/server/audit.test.ts`

**Interfaces:**
- Consumes: `requireStaff`, `canManageRoles`, `invalidateUserSessions`.
- Produces: `audit(db, actor: User, action: string, targetType: 'user' | 'video' | 'report', targetId: string, detail?: string): void`. Actions: `approve_user`, `decline_user`, `suspend_user`, `restore_user`, `set_role`, `approve_video`, `decline_video`, `remove_video`, `post_staff_video`, `resolve_report`.

- [ ] **Step 1: Tests:**
  - `staff approves a pending user who can then use the app`
  - `staff declines and the user can't log in` (the message says the account wasn't approved)
  - `suspend logs the user out`: their open page goes to /login on the next request
  - `staff can't change roles`
  - `admin makes a player staff`
  - `admin can't remove their own admin role` (so there's always one admin)
  - `every action writes an audit row`
  - `create-admin makes an active admin`: run the script against a temp DB with `--username` and a password read from stdin
- [ ] **Step 2:** Run, fail, implement (the accounts page lists Pending first, then Active, Suspended, Declined; each row shows the username, display name, signup date and buttons for that status), run, pass.
- [ ] **Step 3:** Commit `Add staff account approval, roles and audit log`.

### Task 7: Exercise library

**Files:**
- Create: `tools/port_library.py` (reads the Edgework Swift `Data/*.swift` and `Models.swift` enums, writes JSON), `src/lib/data/exercises.json`, `src/lib/data/library.ts`
- Create: `src/routes/(app)/library/+page.svelte`, `+page.server.ts`, `src/routes/(app)/exercise/[id]/+page.svelte`, `+page.server.ts`
- Test: `tools/test_port_library.py`, `src/lib/data/library.test.ts`, `e2e/library.test.ts`

**Interfaces:**
- Produces: `type Exercise = { id; name; category: Category; measure: 'reps' | 'seconds' | 'meters' | 'lines'; sets; base; perSide; level: 1 | 2 | 3; primary: Muscle[]; secondary: Muscle[]; equipment: string[]; tags: string[]; summary; steps: string[]; cues: string[]; why }`, `exercises: Exercise[]`, `byId(id): Exercise | undefined`, `searchExercises(q: string, opts?: { category?: Category; sport?: 'hockey' | 'track' }): Exercise[]`, `categoryTitle(c)`, `formatTarget(ex): string` (the same text as Swift `defaultTarget()`, e.g. `"1 × 30s"`).

- [ ] **Step 1: Tests:**
  - Python: the converter's count equals the number of `ex("` calls in the Swift sources; IDs are unique; every field is present.
  - TS: `byId('jumping-jacks').name === 'Jumping Jacks'`; `formatTarget` matches three known Swift outputs; `search hides hockey-only categories for track`.
  - e2e: `library search finds Skater Bound`; `exercise page shows steps and cues`; `unknown exercise id gives 404`.
- [ ] **Step 2:** Run, fail, implement (the converter parses `ex(...)` arguments with a small tokenizer for Swift string, array and enum literals, not `eval`), run, pass.
- [ ] **Step 3:** Commit `Port the exercise library`.

### Task 8: Video intake (checks and re-encode)

**Files:**
- Create: `src/lib/server/video/storage.ts`, `src/lib/server/video/intake.ts`
- Test: `src/lib/server/video/intake.test.ts` (fixtures made with ffmpeg in `beforeAll`: a 2 s clip with a GPS `location` tag, a 200 s clip, a text file renamed `.mp4`)

**Interfaces:**
- Produces:
  - `interface VideoStorage { save(tmpPath: string): Promise<string /* file id */>; path(fileId: string): string; remove(fileId: string): Promise<void> }` and `diskStorage(dir: string): VideoStorage`
  - `intakeVideo(input: { tmpPath: string; size: number }, storage: VideoStorage): Promise<{ fileId: string; durationS: number } | { error: 'too_big' | 'not_video' | 'too_long' | 'failed' }>`
  - Limits come from the Global Constraints. Steps: check the size → `fileTypeFromFile` must be `video/*` → ffprobe the duration → ffmpeg `-map_metadata -1 -map_chapters -1 -c:v libx264 -preset veryfast -crf 26 -vf scale='min(1080,iw)':-2 -c:a aac -movflags +faststart` → save. The temp input is deleted in every case.

- [ ] **Step 1: Tests:** `accepts a short clip and strips GPS` (ffprobe the output has no `location` tag); `rejects a renamed text file as not_video`; `rejects a 200 s clip as too_long`; `rejects size over 200 MB as too_big` (pass a fake size); `leaves no temp file behind` in all four.
- [ ] **Step 2:** Run, fail, implement with `child_process.execFile` (argument arrays only), run, pass.
- [ ] **Step 3:** Commit `Add safe video intake`.

### Task 9: How-to videos on exercise pages

**Files:**
- Create: `src/lib/server/video/videos.ts` (queries), `src/routes/(app)/exercise/[id]/videos/+server.ts` (POST upload), `src/routes/(app)/video/[id]/file/+server.ts` (GET stream with Range), `src/lib/components/HowTo.svelte`, `src/lib/components/VideoRecorder.svelte`
- Modify: `src/routes/(app)/exercise/[id]/+page.server.ts` (load videos; actions `request`, `makePrivate`, `delete`, `report`)
- Test: `src/lib/server/video/videos.test.ts`, `e2e/videos.test.ts`

**Interfaces:**
- Consumes: `intakeVideo`, `canSeeVideo`, `canDeleteVideo`, `canRequestVideo`, `canReport`, `audit`.
- Produces: `listVideosFor(db, actor, exerciseId): { staff: VideoView[]; mine: VideoView[]; community: VideoView[] }` with `VideoView = { id; title; status; kind; declineReason: string | null; ownerName: string; mine: boolean }`.

- [ ] **Step 1: Tests:**
  - `player upload is private by default`
  - `request moves private → requested`
  - `owner still sees a declined video`
  - `hides other players' private videos` (GET on the file route returns 404)
  - `owner can delete an added video and it disappears for everyone`
  - `staff upload is visible to all at once` (kind `staff`, status `added`)
  - `file route supports Range requests` (206 with the right `Content-Range`)
  - e2e `record or choose a file, see it under Your videos as Private`
- [ ] **Step 2:** Run, fail. Implement:
  - The upload route streams the multipart file to a temp file, rejecting it once it's over 200 MB, then calls `intakeVideo`.
  - `VideoRecorder` uses `getUserMedia` + `MediaRecorder` and stops at 180 s, with a file-input fallback (`accept="video/*" capture="environment"`).
  - The How-to section on the exercise page shows Staff videos, then Your videos (status chip + Request/Make private/Delete), then Added by players.
- [ ] **Step 3:** Run, pass. Commit `Add how-to videos on exercise pages`.

### Task 10: Video review and reports

**Files:**
- Create: `src/routes/(app)/staff/review/+page.svelte`, `+page.server.ts`
- Modify: `src/routes/+layout.svelte` (Staff tab with a count of pending accounts + requests + open reports, staff only)
- Test: `e2e/review.test.ts`

**Interfaces:**
- Consumes: `requireStaff`, `audit`, `listVideosFor` row shape.

- [ ] **Step 1: Tests:**
  - `staff approves a request and it shows for everyone`
  - `staff declines with a reason and the owner sees the reason`
  - `report appears in review; remove hides the video from everyone but staff`
  - `player can't open /staff/review` (403)
  - `the same player can't report a video twice`
- [ ] **Step 2:** Run, fail, implement, pass.
- [ ] **Step 3:** Commit `Add video review and reports`. Push the branch and confirm CI is green.
