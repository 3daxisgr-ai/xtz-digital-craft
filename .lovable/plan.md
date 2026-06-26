# TOREO Customer Portal & Order Management System

A full plan to add authenticated customer portal, admin order management, public tracking, and automated email notifications on top of the existing TOREO site — without changing any current branding or UI.

## 1. Order ID System

- Generate human-readable IDs `TR-YYYY-NNNN` (4-digit, zero-padded, sequence resets per year).
- Implemented as a Postgres sequence per year + DB function `public.next_order_id()` called by a `BEFORE INSERT` trigger on `orders.order_code`.
- ID flows everywhere: portal, admin, emails, tracking page, PDFs.

## 2. Database (Lovable Cloud / Postgres)

New tables (all with RLS + GRANTs):

- `profiles` — `{ user_id (FK auth.users), full_name, company, phone }` for portal users.
- `user_roles` — separate roles table + `app_role` enum (`admin`, `customer`) with `has_role(_user_id, _role)` security-definer function (per project rules).
- `orders` — central entity:
  - `id`, `order_code` (TR-YYYY-NNNN, unique), `user_id` (nullable — guest submissions can be claimed later by email match),
  - `customer_name`, `customer_email`, `customer_phone`, `company`,
  - `source` (`inquiry`, `3dp-quote`, `start`),
  - `service`, `material`, `quantity`, `dimensions`, `message`,
  - `quote_price numeric`, `currency` default 'EUR',
  - `status` enum: `quote_received | engineering_review | quote_sent | awaiting_approval | payment_received | production | quality_inspection | ready_for_shipping | shipped | delivered | cancelled`,
  - `courier`, `tracking_number`, `tracking_url`, `estimated_delivery date`,
  - `internal_notes text` (admin-only via RLS),
  - timestamps.
- `order_files` — `{ order_id, file_path, file_name, file_type, uploaded_by ('customer'|'admin'), visibility ('customer'|'admin'), size }`.
- `order_events` — append-only timeline `{ order_id, type, title, payload jsonb, actor, created_at }`. Used for both customer-visible timeline and admin audit.
- `order_messages` — `{ order_id, from_role, body, created_at }` for TOREO ↔ customer messages.

Triggers:
- `orders` BEFORE INSERT → assign `order_code` via `next_order_id()`.
- `orders` AFTER UPDATE on status/shipping fields → insert `order_events` row + enqueue email.
- `update_updated_at_column()` trigger on `orders`.

RLS:
- `orders` SELECT: `auth.uid() = user_id OR has_role(auth.uid(),'admin')`.
- `orders` UPDATE/INSERT: admin only (writes go through server functions).
- `order_files` visibility-aware (`visibility='customer'` for customer SELECT; admin sees all).
- `internal_notes` excluded from customer queries (server-side column projection).

Migrate existing `submissions` / `quotes` data into `orders` on first run (one-time SQL in migration).

## 3. Auth

- Email/password + Google OAuth (default per platform rules), via Lovable Cloud auth.
- Auth route `/auth` (sign in / sign up / reset password).
- New `_authenticated` layout (integration-managed) wraps portal routes.
- New `_authenticated/_admin` layout gates admin routes via `has_role(uid,'admin')`.
- On signup, trigger creates a `profiles` row and auto-claims any existing `orders` matching the email.

## 4. Customer Portal Routes (`/portal/*`)

- `/portal` — order list table (Order ID, date, status pill, price, CTA).
- `/portal/orders/$orderCode` — order detail:
  - Animated progress bar across the 10 statuses.
  - Order timeline (events with icons + timestamps).
  - Quote price + Approve Quote button (transitions status to `awaiting_approval`→ admin sees).
  - Files panel (download approved files, upload more).
  - Messages panel (read + reply).
  - Shipping card (courier, tracking number with link, ETA).
  - Invoice download.
- `/portal/profile` — edit profile.

Uses TanStack Query + server functions; UI built with existing shadcn primitives, dark industrial theme matching site.

## 5. Admin Dashboard (`/admin/*`)

(Replaces current `/admin` route.)

- `/admin` — orders table with search (Order ID, name, company, email), filter by status, sort by date.
- `/admin/orders/$orderCode` — full editor:
  - Status dropdown (changes auto-create timeline event + email).
  - Shipping fields (courier, tracking #, ETA).
  - Quote price + currency.
  - Internal notes (admin-only).
  - File uploads (mark as customer-visible or admin-only).
  - Customer info editor.
  - Full timeline + audit log.
  - "Mark Completed" action.
- All writes through `requireSupabaseAuth` server functions that re-check `has_role('admin')` server-side.

## 6. Public Order Tracking (`/track`)

- Form: Order ID + email.
- Server function validates pair, returns minimal public payload (status, progress, timeline events without internal notes, courier/tracking/ETA).
- No login required; no PII beyond what's tied to that order.
- Rate-limited via simple per-IP token bucket in the function.

## 7. Email Notifications

Use Lovable Emails infrastructure (`email_domain--setup_email_infra` + `scaffold_transactional_email`).

Templates under `src/lib/email-templates/`:
- `quote-received.tsx`
- `quote-ready.tsx`
- `quote-approved.tsx`
- `payment-received.tsx`
- `production-started.tsx`
- `quality-inspection.tsx`
- `order-shipped.tsx`
- `order-delivered.tsx`

Branded with TOREO colors, includes Order ID, portal deep-link button, and tracking link when shipped. Idempotency key = `${order_code}-${event_type}`.

A status-change trigger on `orders` inserts into `order_events`; a server function (or DB trigger calling `enqueue_email`) enqueues the right template. Existing inquiry/3dp-quote submission paths are rewired to create an `order` row and send `quote-received`.

## 8. File Management

- Existing `submission-files` private storage bucket reused (renamed concept to "order-files" if needed — new bucket `order-files`).
- Customer uploads go through server function that validates extension (`.step .stp .stl .dxf .pdf .jpg .jpeg .png`) and size (≤25 MB), writes to `order-files/{order_code}/{uuid}_{filename}`.
- Downloads return short-lived signed URLs through server function — never expose direct storage paths.
- Admin uploads mark `visibility` (`customer` or `admin`).

## 9. Existing Submission Flow Integration

- `InquiryForm`, `3d-printing-quote`, and `start` forms call `createOrderFromSubmission` server function which:
  1. Creates `orders` row (gets Order ID via trigger).
  2. Inserts initial `order_events` "Quote Submitted".
  3. Enqueues `quote-received` email with the Order ID.
  4. Sends existing Discord webhook (kept).
  5. If submitter is authenticated, links `user_id`; else stores email for later claim.
- Confirmation screens updated to show the assigned Order ID + link to `/track` and `/portal`.

## 10. Security

- RLS on all new tables; admin checks via `has_role` security-definer function.
- Internal notes never selected in customer-scope queries.
- File path validation regex (`^[a-zA-Z0-9_\-]+/[a-zA-Z0-9_.\-]+$`).
- Public tracking limited to status + shipping fields, no internal notes, no full file list (only customer-visible files).
- All admin mutations re-verify role server-side, not just route gate.
- Service-role key only used inside server functions, never in client.

## 11. UI / Design

- Reuse existing TOREO dark theme tokens (`src/styles.css`), typography (`Bodoni Moda`, `Inter`), button styles, card patterns from `Equipment.tsx`, `ServicePage.tsx`.
- Progress bar: horizontal stepper, completed steps glow in TOREO accent, active step pulses, future steps muted.
- Timeline: vertical with iconography reusing existing SVG style.
- Status pills with brand-consistent color mapping.
- Fully responsive; mobile-first; keeps existing nav + adds "Portal" link when authenticated, "Admin" link when admin.

## 12. Scalability

- Indexes: `orders(user_id)`, `orders(customer_email)`, `orders(status)`, `orders(order_code)`, `order_events(order_id, created_at)`.
- Pagination on admin orders list (cursor-based using `created_at, id`).
- Server functions stateless; emails via queue (already supported by Lovable Emails infra).
- Schema leaves room for future tables: `payments`, `invoices`, `erp_sync_log` without breaking changes.

## Technical Section

- Stack: TanStack Start v1, React 19, Tailwind v4, shadcn, Lovable Cloud (Supabase), Lovable Emails, Lovable AI Gateway not needed.
- New routes:
  - `src/routes/auth.tsx`
  - `src/routes/_authenticated/route.tsx` (integration-managed)
  - `src/routes/_authenticated/portal.tsx`
  - `src/routes/_authenticated/portal.orders.$orderCode.tsx`
  - `src/routes/_authenticated/portal.profile.tsx`
  - `src/routes/_authenticated/_admin/route.tsx`
  - `src/routes/_authenticated/_admin/admin.tsx`
  - `src/routes/_authenticated/_admin/admin.orders.$orderCode.tsx`
  - `src/routes/track.tsx`
- New server fns in `src/lib/api/orders.functions.ts`, `src/lib/api/admin-orders.functions.ts`, `src/lib/api/tracking.functions.ts`.
- New migrations for: enums, tables, sequence + function, triggers, RLS, GRANTs, role seeding RPC.
- Email setup via `email_domain--setup_email_infra` then `scaffold_transactional_email`, then 8 template files.

## Build Order (proposed execution)

1. Database migration: roles, orders, files, events, messages, RLS, GRANTs, trigger functions, Order ID sequence/function, data migration from `submissions`/`quotes`.
2. Auth pages + `_authenticated` layout + role gate.
3. Server functions (orders CRUD, admin updates, tracking lookup, file upload/signed URL).
4. Rewire existing submission forms to create `orders` rows.
5. Customer portal UI (list + detail + progress bar + timeline).
6. Admin dashboard UI (list + detail editor).
7. Public `/track` page.
8. Email infrastructure + 8 branded templates + status-change → email wiring.
9. Navigation updates (Portal/Admin links when signed in).
10. Verification: build, lint, manual smoke through Playwright on key flows.

## Open Questions Before I Start

1. **Admin bootstrap**: how should the first admin be created? Options: (a) seed your account's email via migration once you tell me which email, (b) a one-time setup page protected by `ADMIN_PASSWORD` secret. Which?
2. **Auth methods**: email/password only, or email + Google OAuth (default)?
3. **Existing `/admin` route**: it currently uses `ADMIN_PASSWORD`. OK to replace with the new role-based admin?
4. **Migrating historical `submissions`/`quotes`**: convert all existing rows into `orders` with status `quote_received`, or start fresh and leave the old tables read-only for archive?
