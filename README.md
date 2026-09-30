# StudentNest

Student housing and roommate-finding platform for Nigerian universities. Students search accommodation, read reviews from people who actually stayed there, find compatible roommates, and contact owners without handing over a phone number. Owners list properties, respond to reviews, and submit identity documents for verification. Admins moderate reports, verify listings, and manage reference data.

Built with Next.js (App Router) + TypeScript + Tailwind, PostgreSQL via Prisma, and NextAuth.

---

## The trust rules this codebase is built around

These are product constraints, not aspirations. They are enforced in code and covered by tests.

1. **Nothing is fabricated.** Reviews, verification statuses, and identities all come from real rows written by real actions. Seeded data is flagged `isDemoData` and labelled as demo in the UI.
2. **A verification badge is never shown unless verification actually happened.** `VERIFICATION_EXPLAINER` is rendered next to every badge to say what it does and does not mean.
3. **Roles are decided on the server.** The session is re-read from the database on every request (`getSessionUser`), so a stale or hand-edited JWT cannot grant a role.
4. **Owners can respond to reviews but never delete them.** Hiding or rejecting a review requires a written reason that is stored, logged, and shown to the reviewer.
5. **Search is never paywalled.** Payments only buy optional landlord extras. "Featured" is labelled as a paid placement everywhere it appears — never as a quality signal.
6. **Roommate compatibility is transparent and never uses protected traits.** The score is budget + location + move-in date + lifestyle, with the weights shown on the page. Gender is a user-applied filter only and is never scored.
7. **Messaging never exposes phone numbers.** Conversations stay on-platform; the first message is written by the sender, not auto-filled with contact details.
8. **Verification documents stay private.** They are written outside `public/` and served only through `/api/documents/[...path]`, which is admin-only, path-traversal-checked, and audited.
9. **Sorting is disclosed.** The search page states that there is no hidden "best" ranking; `propertySearchSchema` rejects `sort=best` and `sort=recommended`.

---

## Quick start

Requires Node 20.19+ (developed on Node 24) and a PostgreSQL 14+ instance.

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL and AUTH_SECRET
npm run db:migrate            # create the schema
npm run db:seed               # load labelled demo data + demo accounts
npm run dev                   # http://localhost:3000
```

`npm install` runs `prisma generate` automatically via `postinstall`.

Generate an auth secret with:

```bash
openssl rand -base64 32
```

Without `AUTH_SECRET` the app still boots, but sessions will not persist across restarts. `/admin/settings` reports this as `missing`.

### Demo accounts

Created by `npm run db:seed`. All addresses use the reserved `.test` TLD, so no real mailbox can receive mail. **These accounts must not exist in a production database.**

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@studentnest.test` | `Admin!2345` |
| Student | `chi.student@studentnest.test` | `Student!2345` |
| Student | `tolu.student@studentnest.test` | `Student!2345` |
| Landlord | `emeka.owner@studentnest.test` | `Owner!2345` |
| Landlord | `segun.landlord@studentnest.test` | `Owner!2345` |
| Agent | `funke.agent@studentnest.test` | `Owner!2345` |

The seeder prints the full list when it runs. Override the admin account with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | `prisma generate` then a production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (flat config, `eslint-config-next`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit suite (88 tests) |
| `npm run test:e2e` | Playwright smoke suite (chromium + mobile viewport) |
| `npm run db:migrate` | Apply and create migrations in development |
| `npm run db:deploy` | Apply migrations only — use this in production |
| `npm run db:seed` | Load demo data |
| `npm run db:reset` | Drop, re-migrate, re-seed |
| `npm run db:studio` | Prisma Studio |
| `npm run format` | Prettier (incl. Tailwind class sorting) |

Playwright starts `npm run dev` itself and reuses an already-running server. Install browsers once with `npx playwright install chromium`. The e2e suite reads the demo credentials from the table above and accepts `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_OWNER_EMAIL`, `E2E_OWNER_PASSWORD` overrides.

---

## Environment variables

Everything is optional except `DATABASE_URL` and `AUTH_SECRET`. Each integration falls back to a mock or local provider so the app runs with no third-party accounts at all. `/admin/settings` shows which mode each one is actually in.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Sessions do not persist without it |
| `AUTH_URL`, `NEXT_PUBLIC_APP_URL` | In production | Canonical origin, used for links in emails and metadata |
| `STORAGE_PROVIDER` | No | `local` (default) · `supabase` · `cloudinary` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | With Supabase | Service-role key is server-only — never `NEXT_PUBLIC_` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | With Cloudinary | |
| `MAP_PROVIDER` | No | `mock` (default) · `mapbox` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | With Mapbox | Public by design; never put a secret map key here |
| `EMAIL_PROVIDER` | No | `mock` (default, logs to console) · `resend` |
| `RESEND_API_KEY`, `EMAIL_FROM` | With Resend | |
| `PAYMENT_PROVIDER` | No | `mock` (default) · `paystack` |
| `PAYSTACK_SECRET_KEY` | With Paystack | Checkout uses Paystack's hosted authorization URL, so no public key is exposed to the browser |
| `RATE_LIMIT_WINDOW_SECONDS`, `RATE_LIMIT_MAX_REQUESTS` | No | Defaults 60 / 100 |
| `MAX_UPLOAD_SIZE_MB` | No | Default 8 |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | No | Development seeding only |

`.env.example` documents all of these without real values. `.env*` is git-ignored except `.env.example`.

---

## Project structure

```
prisma/
  schema.prisma          36 models — users, properties, reviews, reports,
                         verifications, messaging, payments, audit log
  migrations/            committed SQL migrations
  seed.ts + seed/        demo data, clearly flagged
src/
  app/
    (public)/            home, /properties, /properties/[slug], /roommates,
                         /roommates/[id], /locations/[slug], /safety
    (auth)/              login, register, forgot-password, reset-password,
                         verify-email
    (account)/           student + landlord dashboards, messages, notifications,
                         account settings, landlord billing
    (admin)/             admin overview, listings, reviews, reports,
                         verifications, users, universities, analytics,
                         audit-logs, settings
    api/                 45 route handlers (REST, all server-authorised)
    forbidden/           where role checks redirect
  components/            62 components: ui primitives, property, search,
                         reviews, roommate, messaging, payments, admin, report
  lib/
    services/            20 service modules — the only place that touches Prisma
    validation/          Zod schemas, shared by API routes and client forms
    env.ts               typed env access + isProviderLive / isProviderConfigured
    auth-helpers.ts      requireUser, requireRole, requireRolePage, getSessionUser
    constants.ts         labels, prices, and the trust copy quoted across the UI
    search-url.ts        URL <-> filter-state mapping used by search + saved searches
  test/setup.ts          env for Vitest (read once at import time)
e2e/smoke.spec.ts        Playwright smoke coverage
```

Route groups in parentheses (`(public)`, `(auth)`, `(account)`, `(admin)`) only select a layout — they do not appear in URLs.

### How a request is authorised

Every mutating route handler follows the same shape:

```ts
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();                       // or requireRole("ADMIN")
    assertRateLimit(`${clientKey(request, user.id)}:thing`, { max: 10, windowSeconds: 600 });
    const input = schema.parse(await request.json());       // same schema the form uses
    const result = await someService(user, input);
    return ok(result);
  } catch (error) {
    return handleRouteError(error, "POST /api/thing");
  }
}
```

Role and status come from the database, not the token. Large client forms validate with `schema.safeParse` using the identical schema the API enforces, so the browser message and the server decision cannot drift.

---

## Database setup

```bash
# create an empty database, then:
npm run db:migrate     # development: applies + lets you create new migrations
npm run db:deploy      # production / CI: applies committed migrations only
npm run db:seed        # optional demo data
```

Migrations are committed under `prisma/migrations/`. Schema changes should be made with `npx prisma migrate dev --name <change>` so the SQL is reviewable.

Local development on Windows used a throwaway cluster on port 5433:

```
DATABASE_URL="postgresql://studentnest:studentnest@127.0.0.1:5433/studentnest?schema=public"
```

---

## Deployment

### Vercel

1. Import the repository. Framework preset: Next.js. Build command `npm run build` (it runs `prisma generate` first).
2. Set every variable from the table above. `AUTH_SECRET`, `DATABASE_URL`, and `AUTH_URL` are the minimum.
3. Point `DATABASE_URL` at a managed PostgreSQL (Neon, Supabase, RDS). Enable connection pooling if the provider offers it.
4. After the first deploy, run migrations against the production database:
   ```bash
   npx prisma migrate deploy
   ```
   Either from a one-off job, a release step in CI, or locally with `DATABASE_URL` set to the production string. Never run `migrate dev` or `db:seed` against production.
5. Set `STORAGE_PROVIDER` to `supabase` or `cloudinary`. The default `local` provider writes to the server filesystem, which a serverless platform discards on every deploy — uploads would appear to work and then vanish.
6. If you enable Paystack, register the webhook URL `https://<your-domain>/api/payments/webhook` in the Paystack dashboard. The handler verifies `x-paystack-signature` (HMAC-SHA512 of the raw body) and rejects anything that does not match.
7. **Do not run the seeder in production.** If you need a first admin, create it through a one-off script against the production database rather than seeding demo users.

### Self-hosted (Node + PostgreSQL)

```bash
npm ci
npm run build
DATABASE_URL=... AUTH_SECRET=... npm start
```

Put it behind a TLS-terminating proxy and set `AUTH_URL` / `NEXT_PUBLIC_APP_URL` to the public origin. A long-lived single process is the one deployment shape where the built-in in-memory rate limiter behaves as configured.

### Before going live

- [ ] `STORAGE_PROVIDER` is Supabase or Cloudinary, not `local`
- [ ] `EMAIL_PROVIDER` is `resend`, or you accept that password resets reach nobody
- [ ] `PAYMENT_PROVIDER` matches your intent; mock payments are refused outright when `NODE_ENV=production`
- [ ] `AUTH_SECRET` is set and `AUTH_URL` is the real origin
- [ ] Migrations applied with `prisma migrate deploy`
- [ ] No seeded demo accounts in the database
- [ ] Rate limiting moved to a shared store if running more than one instance (see below)
- [ ] `/admin/settings` reviewed — it reports the live mode of every integration

---

## Features that need credentials

| Feature | Without credentials |
| --- | --- |
| Image upload | Writes to `public/uploads` (git-ignored) and `/.data/uploads` for private documents. Works locally, not durable on serverless. |
| Email (verify, reset password, notifications) | Logged to the server console. Nothing is sent. Sign-in still works. |
| Maps | Static placeholder with an approximate-location notice. Distances to campus are still shown from stored coordinates. |
| Payments | Mock charges recorded with `provider = MOCK` and labelled as simulated in the billing history. `/api/payments/mock/complete` returns 403 in production. |

Core student functionality — search, filters, property details, reviews, roommates, messaging, reports — works with **zero** third-party credentials.

---

## Security notes

**Authorisation.** Every route handler calls `requireUser()` or `requireRole(...)` before touching data. `requireRolePage` guards server-rendered pages and redirects to `/forbidden`. Roles are re-read from the database per request, so suspending an account takes effect immediately rather than at token expiry. Client-supplied role claims are never read: `registerSchema` strips/rejects `role: "ADMIN"`, and `propertyUpdateSchema` rejects `status: "ACTIVE"` so an owner cannot publish their own listing.

**Validation.** All input crosses a Zod schema on the server. `propertySearchSchema` normalises amenity lists, rejects negative rents, and refuses out-of-range pagination rather than silently clamping it. Amounts are never accepted from a client — the server prices a payment purpose from `FEATURE_PRICES`.

**Uploads.** `validateImageUpload` rejects empty files, oversized files, non-images, and SVG (which can carry script). Private documents are stored outside `public/` and read back through `readPrivateDocument`, which refuses `..`, absolute paths, and percent-encoded traversal.

**Webhooks.** `/api/payments/webhook` reads the raw body (capped at 64 KB), recomputes the HMAC-SHA512, and only acts on `charge.success`. The browser return route redirects to the billing page but never marks anything paid — only the webhook does.

**Secrets.** No secret is ever rendered into HTML. `/admin/settings` lists variable *names* only. `/admin/audit-logs` redacts any metadata key matching `document|token|password|secret|credential|key|url`.

**Abuse.** Sliding-window rate limits guard registration, password reset, messaging, reports, uploads, and payments. **Caveat:** the limiter is in-process memory. On a single long-lived server that is effective; across serverless functions or multiple instances each process keeps its own counter, so the real ceiling is the limit multiplied by the instance count. Move `assertRateLimit` in `src/lib/services/rate-limit.service.ts` onto a shared store (Upstash Redis or similar) before treating it as a security control.

**Privacy.** Approximate locations are stored for listings; exact addresses are not shown publicly. Phone numbers are never surfaced through messaging. Users can block a conversation, and blocked parties cannot reopen it.

**Audit.** Moderation actions, verification decisions, and account changes append to `AuditLog` with the actor and the reason. The log is append-only — there is no admin action that edits or deletes an entry.

---

## Known limitations

- The rate limiter is in-memory (see above).
- Saved searches are the only stored demand signal, so `/admin/analytics` understates total search volume. The page says so rather than implying completeness.
- Map view depends on `MAP_PROVIDER`; the mock renders a placeholder.
- Review eligibility is based on recorded engagement (inquiries, conversations, stays), not on proof of tenancy. The verification label shown on each review reflects which check passed.
