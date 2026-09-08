# Faster quotations from incoming emails

Your app already has a full quotation document system (TR numbers, editable lines, deterministic totals, PDF, email sending, statuses, revisions). This plan does **not** rebuild it. It closes the gaps in your brief by extending what exists, and redraws the PDF to match the ΠΡΟΣΦΟΡΕΣ template you uploaded.

## 1. Draft quotation created automatically from an email

Today a quotation can only be started after a request is accepted internally, and only by hand.

- When the email endpoint creates an order from a customer email, it also creates a **Draft** quotation for it, pre-filled with customer, service, quantity, material, colour, dimensions, deadline and notes taken from the email.
- Prices are left at 0 — nothing invents a price, exactly as you asked. You type the unit price.
- Nothing is ever sent automatically.
- The existing email ingestion, duplicate protection and order creation stay untouched apart from this one extra step.

## 2. Quotations dashboard

A new admin page listing every quotation across all customers:

- Counters: total, draft, sent, accepted, rejected/declined, expired, converted.
- Table: number, customer, total, status, date — with filters by status, customer, date range and number, plus search.
- Click through to the existing quotation editor.

## 3. Review, edit, preview, send

The existing editor already does this. Additions:

- A clear summary header (customer / service / quantity / material / dimensions / price / VAT / total) with **Edit · Preview PDF · Download · Send**.
- Editable payment terms per quotation, defaulting to "Τραπεζική μεταφορά. 70% προκαταβολή και 30% πριν την παράδοση." (currently 50/50).
- Editable email subject and body in Greek or English before sending; on send the PDF is attached, stored privately, status becomes Sent with timestamp and message ID (already implemented — kept).

## 4. Statuses and reply handling

- Add the missing statuses: **viewed, accepted, rejected, expired, converted, cancelled** (draft / generated / sent / replaced already exist). Expiry is derived from the validity date.
- When a customer email arrives that is a reply in the thread of an order that has a sent quotation, it is attached to that quotation instead of starting anything new. If the reply clearly accepts ("ok, proceed", "προχωράμε", "συμφωνούμε", "αποδεκτή"), the quotation is marked **Accepted** for your confirmation. No order is created from a reply.
- **Convert to Order** button on an accepted quotation: moves the existing linked order into production and marks the quotation Converted. It never creates a second order or a second customer.

## 5. PDF redrawn to your template

Rebuild the page layout of the generated PDF to follow ΠΡΟΣΦΟΡΕΣ.docx:

- Header: logo, DESIGN · PROTOTYPE · MANUFACTURE · DELIVER, and the ΠΡΟΣΦΟΡΑ block with Αριθμός / Ημερομηνία / Ισχύς.
- Two facing blocks **ΑΠΟ** (Ιωάννης Σαρίδης, address, Δ.Ο.Υ., Α.Φ.Μ., phone, email) and **ΠΡΟΣ** (customer: Επωνυμία, Υπόψη, Διεύθυνση, Περιοχή, Δ.Ο.Υ., Α.Φ.Μ., Τηλέφωνο, Email).
- Items table with columns Α/Α · ΠΕΡΙΓΡΑΦΗ · ΠΟΣ. · Μ.Μ. · ΤΙΜΗ ΜΟΝ. · ΣΥΝΟΛΟ.
- Totals block: Καθαρή αξία / Φ.Π.Α. 24% / ΣΥΝΟΛΟ.
- **ΕΜΠΟΡΙΚΟΙ & ΤΕΧΝΙΚΟΙ ΟΡΟΙ** grid: χρόνος παράδοσης, τρόπος πληρωμής, μεταφορικά, εγγύηση, τεχνικές λεπτομέρειες, παρατηρήσεις.
- **ΣΤΟΙΧΕΙΑ ΠΛΗΡΩΜΗΣ / ΤΡΑΠΕΖΑΣ**: BIC, τράπεζα, IBAN, κάτοχος — stored in company settings, editable, not hard-coded.

Text stays real selectable text with full Greek support; A4; existing font and generator are reused.

## 6. Endpoint for Make

`POST /api/public/create-quotation`, protected by the same shared-secret header style as the existing email endpoint. Accepts the structured fields from Gemini and creates a **Draft** quotation (never sends). Your current Make scenario and its endpoint/secret are not changed.

## Technical notes

- Reuses `quote_documents`, `orders`, `quote-calc.ts`, `quote-doc.server.ts`, `quote-pdf.server.ts`, existing storage bucket and email sender. No new customer or order tables.
- One migration: widen the quotation status check, add `accepted_at` / `converted_order_id` / `viewed_at` columns, and add bank/company fields to factory settings.
- All money maths stays in `quote-calc.ts` (deterministic, server and UI agree). AI never computes totals or VAT.
- All quotation reads/writes remain admin-authenticated; PDFs stay in the private bucket behind signed URLs.
