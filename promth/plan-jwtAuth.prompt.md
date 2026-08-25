## Plan: JWT Login With Refresh Tokens

Build the first auth slice as a separate NestJS backend alongside the existing Next.js frontend. Use Prisma with Supabase PostgreSQL for users and hashed refresh-token records, return a short-lived access token from login, and keep the refresh token in an HttpOnly cookie. The scope is deliberately limited to login, refresh, logout, and the login page; registration and realtime work are excluded.

**Implementation status**

Current status: initial implementation is in progress. The first backend and frontend auth files now exist, but database generation/migration and runtime verification are still pending.

- Done: requirements and boundaries have been clarified. This prevents the first implementation from expanding into registration, realtime features, or Redis integration.
- Done: the target stack and token contract have been selected: React/Next.js with TypeScript and Tailwind for the frontend, NestJS with TypeScript for the backend, Prisma with Supabase PostgreSQL for persistence, a short-lived JWT access token, and an HttpOnly refresh-token cookie.
- Done: the existing repository was inspected. The auth files are Nest scaffolds, while the frontend is still the default Next.js page. This establishes the correct starting point for implementation.
- Done: NestJS bootstrap, root module, CORS, cookie parsing, global DTO validation, and a backend start script. These provide the API process needed by the existing Nest auth module.
- Done: Prisma service/module, `User` and `RefreshToken` schema, environment-based seed script, and Prisma scripts. These provide persisted users and server-side refresh-token revocation.
- Done: auth service, controller routes, JWT strategy, guard, and login DTO. These implement credential validation, access-token issuance, refresh rotation, logout, and `/auth/me` verification.
- Done: React TypeScript login page. It calls the API with credentials enabled, keeps the access token in memory, and shows authenticated/error states.
- Pending: Prisma client generation, database migration, seed execution, backend runtime verification, and focused automated tests. These require the database configuration and successful dependency postinstall scripts.
- Pending: Postman verification. Follow `edu/MANUAL-TESTING.md` after the API and database are running.

Validation update: Prisma client generation, backend compilation, frontend production build, and lint now pass. Runtime database migration, seed, and Postman checks remain blocked until `DATABASE_URL` and seed credentials are added to the environment. See `edu/MANUAL-TESTING.md` for the Postman test procedure.

**Steps**

**Phase 1: Backend foundation**
1. Add the NestJS runtime and scripts without disturbing the existing Next app. Create the Nest bootstrap and root module, then wire the existing `src/auth` module through constructor injection. Configure environment loading, CORS for the Next development origin, JSON validation, and a consistent API port.
2. Add Prisma infrastructure as a global module/service, configure Supabase PostgreSQL through `DATABASE_URL`, and create the Prisma schema for `User` and `RefreshToken`. The user fields are `name`, `email`, `phoneNum`, `department`, `role`, and a password hash; email is the login identifier and unique. Refresh records store only a hash plus user, expiry, revocation/replacement metadata, and timestamps.
3. Add a Prisma migration and an environment-driven seed command. The seed reads `SEED_USER_EMAIL` and `SEED_USER_PASSWORD` and creates or updates one development user; no password is committed to the repository.

**Phase 2: Auth behavior**
4. Add DTO validation for email/password login and refresh requests where needed. Extend `AuthService` to find the user, compare the password with a password-hashing library, issue a short-lived access JWT, generate a refresh token, hash it before persistence, and set it as an HttpOnly cookie.
5. Add `POST /auth/login`, `POST /auth/refresh`, and `POST /auth/logout`. Refresh must validate the cookie, reject expired/revoked/reused tokens, rotate the token by revoking the old record and persisting its replacement, and issue a new access token. Logout revokes the current refresh record and clears the cookie. Use secure cookie behavior in production and a development-compatible setting locally.
6. Add JWT verification configuration and a minimal protected auth check, such as `GET /auth/me`, so the access-token contract is testable. Keep Redis out of this first slice; PostgreSQL is the revocation source of truth.

**Phase 3: Frontend login**
7. Replace the starter content in `c:\projects\edu\edu\app\page.tsx` with a focused email/password login page using the existing Next/Tailwind stack. Submit with `credentials: 'include'`, display server validation/auth errors, store the returned access token only in in-memory React state, and provide a clear logged-in state. Do not add a registration flow or realtime UI.
8. Document the API URL, required environment variables, migration/seed commands, cookie behavior, and the local startup commands in the README. Keep frontend API access configurable through a public environment variable.

**Relevant files**
- `c:\projects\edu\edu\src\auth\auth.controller.ts` — add login, refresh, logout, and minimal authenticated-user routes.
- `c:\projects\edu\edu\src\auth\auth.service.ts` — own credential validation, JWT issuance, refresh rotation, revocation, and logout.
- `c:\projects\edu\edu\src\auth\auth.module.ts` — import JWT/config/database infrastructure and register auth providers.
- `c:\projects\edu\edu\src\auth\dto\` — add validated login DTOs.
- `c:\projects\edu\edu\src\auth\guards\` and `c:\projects\edu\edu\src\auth\strategies\` — add the access-token guard/strategy using the repository’s Nest conventions.
- `c:\projects\edu\edu\src\lib\database\` — add the global Prisma module/service required by `AGENTS.md`.
- `c:\projects\edu\edu\prisma\schema.prisma` and `c:\projects\edu\edu\prisma\seed.ts` — define and seed the user and refresh-token persistence model.
- `c:\projects\edu\edu\main.ts` and the Nest root module — add backend bootstrap and global configuration.
- `c:\projects\edu\edu\app\page.tsx` — implement the login experience and access-token state.
- `c:\projects\edu\edu\package.json` — add backend dependencies and separate frontend/backend scripts.
- `c:\projects\edu\edu\README.md` — document setup and auth flow.

**Verification**
1. Install dependencies, generate Prisma client, run the migration against Supabase Postgres, and run the environment-driven seed command.
2. Run focused backend tests for valid login, invalid credentials, access-token verification, refresh rotation, expired/revoked/reused refresh-token rejection, logout, and cookie clearing.
3. Run the Next lint and production build plus a backend typecheck/build.
4. Manually exercise login from the Next page: confirm the response contains an access token, the refresh cookie is HttpOnly, refresh rotates the cookie, invalid credentials show an error, and logout invalidates refresh.

**Decisions**
- Separate Nest backend is required because the existing auth code is Nest-shaped but no Nest bootstrap currently exists.
- Login uses email and password. `phoneNum`, `department`, `role`, and `name` are stored user profile fields for later features.
- User creation is limited to a Prisma seed account; registration is excluded.
- Refresh tokens are hashed in PostgreSQL and rotated/revoked; Redis is excluded for now.
- Refresh token transport is an HttpOnly cookie. Access tokens are short-lived and held in frontend memory rather than localStorage.
- Default TTLs and cookie names can be chosen during implementation, documented in the README, and made configurable through environment variables.

**Scope boundary**
- Included: JWT access tokens, refresh-token cookie, rotation/revocation, logout, Prisma user model, seed account, login page, and focused tests.
- Excluded: registration, password reset, email verification, roles/permissions enforcement, Redis, realtime features, and production deployment configuration beyond secure cookie defaults.
