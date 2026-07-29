# TOREO Admin: Compact Nav + Quote Decision + Proforma

Scope is admin-only. Public site, portal, tracking, auth, factory/scheduler, order codes and existing customer data untouched. Only the quote-decision and proforma email flows are added — existing status emails continue to work.

Given the size, I'll ship this in 3 batches, each independently verifiable, and give the final consolidated report after batch 3.

---

## Batch 1 — Database + backend

### Migrations
- `quote_decisions` — id, order_id, previous_status, new_status (accepted|declined), admin_user, accepted_price, currency, delivery_time, payment_terms, decline_reason (enum + free text), customer_message, recipient_email, email_status (pending|sent|failed), email_message_id, email_error, created_at.
- `proformas` — id, order_id, number (`INV-YYYY-####`), revision (int, 0 = base, 1+ = R1…), parent_proforma_id, status (draft|generated|sent|paid|cancelled), customer_snapshot (jsonb), financial_snapshot (jsonb: lines, subtotal, discount, net, vat_pct, vat_amount, total, deposit, paid, balance), pdf_path (storage), pdf_generated_at, order_signature (hash of synced fields at PDF gen time), sent_at, recipient, cc, subject, body, email_status, email_message_id, email_error, admin_user, created_at, updated_at.
- `proforma_lines` — id, proforma_id, position, description, qty, unit, unit_price, discount_pct, vat_pct.
- Storage bucket `proformas` (private) for PDFs.
- Extend `orders.status` enum with `declined` if missing (currently has `rejected` — reuse `rejected` to avoid enum churn; internal decline_reason lives on `quote_decisions`).
- All tables: GRANT to authenticated + service_role, RLS admin-only via `has_role(auth.uid(),'admin')`.

### Server functions (`src/lib/api/quote-decision.functions.ts`, `proforma.functions.ts`)
All `requireSupabaseAuth` + admin role check inside handler.
- `acceptQuote({ order_id, price, delivery_time, payment_terms, recipient, subject, message, admin_note })` — updates order, writes decision row, sends acceptance email, records email status; idempotent via `pending` guard.
- `declineQuote({ order_id, reason_code, customer_message, recipient, subject })` — sets status to `rejected`, writes decision, sends email.
- `retryDecisionEmail({ decision_id })`.
- `proformaCreate({ order_id })` — only if latest decision is accepted; creates draft from order snapshot + one line from quote price.
- `proformaUpdate({ id, patch, lines })` — draft/generated only; recomputes totals.
- `proformaSyncFromOrder(order_id)` — called from `panelUpdateOrder` after save; updates every draft/generated proforma's snapshot and lines[0] where the admin hasn't manually edited them; invalidates PDF (status→draft, pdf_path cleared) if fields differ from `order_signature`.
- `proformaGeneratePdf({ id })` — renders HTML via headless-safe template, uses `@react-pdf/renderer` (Worker-compatible) → uploads to storage, stores `order_signature`, sets status=generated.
- `proformaSend({ id, recipient, cc, subject, body })` — requires status=generated AND signature matches current order; attaches stored PDF via Resend; on success status=sent, sent_at=now.
- `proformaMarkPaid({ id, amount })`, `proformaCancel({ id })`.
- `proformaCreateRevision({ id })` — clones as R{n+1}, parent link, draft status.

### Email templates
Add EN+GR templates in `src/lib/email/quote-decision.server.ts` (acceptance/decline) and `proforma.server.ts` (send-with-attachment). Reuse `sendBrandedEmail` (adds `attachments` param passthrough to Resend).

---

## Batch 2 — Compact admin navigation

### New shell
- `src/components/admin/AdminShell.tsx` — sticky top bar: logo, global search, date, groups Overview/Sales/Production/Fulfilment/System as click-open dropdowns (radix DropdownMenu, keyboard nav, click-outside close, active highlight). Right side: admin user menu.
- `src/components/admin/AdminMobileNav.tsx` — hamburger + slide-out Sheet listing all routes grouped.
- `src/routes/admin.tsx` and `admin_.*.tsx` — replace existing sidebar with `<AdminShell>`. No route renames; only presentation changes.
- Route grouping (display-only):
  - Overview: `/admin` (Dashboard)
  - Sales: Orders, Quotes, Customers, Reviews
  - Production: `/admin/factory`, `/admin/scheduler`, Uploads, `/admin/live`
  - Fulfilment: Tracking, `/admin/shipping`, Notifications
  - System: `/admin/config`, Admin Users, Logs
- Order/quote detail: `CompactHeader` component — back link, ref, status, priority, customer name+email, primary CTAs.

### Quick Actions restructure (`src/routes/admin.tsx` QuickActions)
- Primary row: Accept/Decline (when pending), Save Changes, Change Status, Send Update.
- Dropdowns (radix): PRODUCTION (Run AI, Assign Printer, Priority, Move in Queue, Complete, MFG Report), DOCUMENTS (Upload Photos, Quote PDF, Proforma), DELIVERY (Add Tracking, Tracking Actions), MORE (Delete/Cancel/Archive — with confirm).
- Context gating: hide/disable per rules with tooltip explaining why.
- Sticky tabs bar + persistent "Unsaved changes" indicator + sticky Save Changes button; warn on tab switch with dirty state.

---

## Batch 3 — Accept/Decline UI + Proforma editor

### Accept/Decline modals
`src/components/admin/AcceptQuoteModal.tsx`, `DeclineQuoteModal.tsx` — prefilled from order, two-step confirm, EN/GR body previews, `ACCEPT & SEND EMAIL` / `DECLINE & SEND EMAIL`. On email fail: keep decision saved, show Retry button, prevent double-submit.

### Proforma editor
`src/routes/admin_.proforma.$orderCode.tsx` — split editor (left) + live A4 preview (right).
- Header: number, revision, status pill, order link.
- Customer/Billing card (editable, prefilled).
- Line items table (add/edit/dup/delete).
- Totals card (subtotal/discount/net/VAT/total/deposit/paid/balance, 2 dp).
- Actions: Preview, Save Draft, Generate PDF, Download PDF, Send Proforma, Mark as Paid, Cancel Proforma.
- Outdated banner when `order_signature` ≠ current order hash → disables Send until regenerated.

### PDF generation
`@react-pdf/renderer` (Worker-safe, no native deps). A4 template matching uploaded quotation: black header w/ TOREO white logo, white/light-grey cards, blue accents, dark type, black footer, selectable text, Greek glyphs via bundled DejaVuSans.

### Send flow
`SendProformaModal` — recipient/cc/subject/body prefilled, attachment shown, `SEND NOW` second confirm, disabled while in-flight, guards against duplicate send by proforma status.

---

## Technical notes

- All decision/proforma work runs server-side under `requireSupabaseAuth` + admin role check; no privileged keys in client.
- `panelUpdateOrder` hook: after save, call `proformaSyncFromOrder(order_id)`. Skips sent/cancelled proformas. If any field changed vs `order_signature` on a generated proforma, PDF invalidated.
- Get Quote flow (`src/routes/3d-printing-quote.tsx`, `request.tsx`) untouched — verified no proforma creation added.
- Existing status emails (`sendStatusEmail`) unchanged; new acceptance/decline emails are additional and only sent from explicit admin actions.
- Revisions: `proformaCreateRevision` produces `INV-YYYY-####-R1`, never mutates sent PDFs.

Ready to implement in the three batches above.