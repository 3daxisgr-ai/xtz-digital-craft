# Plan: Historical import of website requests and mailbox emails into Notion

## Current state (verified read-only)
- **Website requests:** 40 submissions stored, the first from 2026-06-10. There are 10 orders, 38 email-intake rows and 28 legacy quotes. New submissions reach Notion only through the website hook (off). The hook writes one Orders & Quotes page plus one Communication Log page. It prevents duplicates with a ledger key `website:<submissionId>`, so each submission can be imported only once.
- **Mailbox:** the hosted probe found INBOX with 109 messages and Sent with 61. The current sync works incrementally: on first run it looks back `lookback_days` (7) and takes at most `max_per_folder` (5) messages per run. It saves its position per folder and never moves past a failed message.
- **Duplicate prevention for email:** each email is recorded once by its Message-ID. Threads are matched by In-Reply-To/References, through earlier synced emails or the "mid:" markers in Notion's Email Thread field. As a fallback, an email joins an open record with the same sender and subject only when exactly one such record exists.
- **Status rules** (pure, tested in `plan.ts`):
  - A customer email moves a record to "Awaiting TOREO Reply" only from New, Needs Review, Replied, Awaiting Customer, Quote Sent or Awaiting TOREO Reply.
  - A TOREO reply to the record's customer sets "Replied" only from New, Needs Review or Awaiting TOREO Reply.
  - A forward to someone else (for example a supplier) is logged without changing the record.
  - A TOREO email that can't be matched safely goes to manual review.
  - Delivered and Lost / Cancelled are never re-opened by subject.
- **Notion:** both target databases pass the layout check. Records are created only in Orders & Quotes and Communication Log. No new databases will be created.
- **Not checked:** what is already in Notion today. Records typed in by hand could duplicate imported ones. Step 1 checks this.

## Problems a historical import must solve
1. **Wrong statuses on old threads.** Replaying old mail one email at a time would mark long-finished conversations "Awaiting TOREO Reply" first. Status must instead come from the **final** state of each thread.
2. **Duplicates with existing Notion records.** Records added by hand have no "mid:" markers.
3. **The same request arriving twice.** A website submission also sends a notification email, and the same customer may email about it later.
4. **Run size and time limits.** The hosted runtime needs small batches that can be resumed.

## Steps

### Step 1 — Read-only inventory (no writes)
- An admin-only "Historical import → Preview" action.
  - Reads all Notion pages in the two databases (read API only).
  - Reads all 40 submissions, plus the mailbox headers only, via BODY.PEEK of the header fields. INBOX and Sent are read back to a cutoff date you choose.
  - Builds the import plan **in memory** and saves only counts and a list of proposed actions. The list shows record code, sender domain, date and action; it never includes message bodies.
- **Proposed classes:**
  - **new record**
  - **attach to existing Notion record:** matched by thread marker, by the website order code in the subject or body, or by a single same-email open record
  - **duplicate:** already in Notion, skipped
  - **skip:** newsletters, notifications, TOREO's own automated mails, already classified by `mime.ts`
  - **manual review**
- You review the preview in the admin page before anything is written.

### Step 2 — Thread-level history rules (pure, unit-tested)
- **New** `planHistoricalThread(messages, existingPage)`:
  - Groups messages by thread.
  - Creates **one** Orders & Quotes record per new thread.
  - Writes every message as a Communication Log entry with its **original date**.
  - Sets the final status from the last relevant message:
    - The customer wrote last and TOREO hasn't answered → "Awaiting TOREO Reply".
    - TOREO replied to the customer last → "Replied".
    - Older than the "stale" threshold you choose (proposed 60 days) with no activity → "Needs Review", never auto-closed.
- **Existing Notion records:** never downgrade or change their status. Only add missing log entries and the "mid:" markers.
- **Website submissions:**
  - Link a website submission to its notification email and later customer emails using the order code or customer email plus a time window of ±1 day. Matches must be unique, otherwise they go to manual review.
  - A submission with a matching record already in `orders` takes its Notion status from the order status. The proposed mapping is in Technical details.
- Unit tests for each rule: old answered thread, unanswered thread, forward to supplier, website plus notification email, page already in Notion, duplicate run.

### Step 3 — Resumable import runner (admin-triggered only)
- **New mode `history`:**
  - Separate from the incremental sync and separate checkpoints, so the normal sync position stays untouched.
  - Runs in batches of about 20 messages or submissions, with a "Continue" button. It stays locked so only one run happens at a time.
- **Avoiding duplicates on re-runs:**
  - Every write first claims a row in the ledger: Message-ID, or `website:<id>` for submissions.
  - A re-run skips anything already synced, and a failed write keeps its slot so it is retried next time.
- **Safety gates:**
  - Requires live_writes=true **and** a separate `history_import` flag (default off).
  - Requires an approved preview from Step 1 that is no older than 24h. Items that changed since the preview go back to review.
- **Reading the mailbox:** read-only only — EXAMINE + BODY.PEEK. It never sends, never changes flags and never moves mail.

### Step 4 — Go-live order (each step needs your explicit approval)
1. Preview (Step 1) → you review the counts and the manual-review list.
2. Pilot: import the 5 oldest website submissions and 1 email thread, then check them in Notion.
3. Full import in batches.
4. Afterwards switch the history flag off. Turning on the normal sync, the website hook and the schedule are separate decisions.

## Decisions needed from you
- How far back to import mail. Default: from 2026-06-10, matching the first website submission.
- The stale threshold for "Needs Review" (proposed 60 days).
- Whether the order status → Notion status mapping below is right.
- Restricting the Notion connection to the two databases, which you need to do in Notion.

## Technical details
- **Files:**
  - New `src/lib/mail-sync/history.ts` (pure) and `history.test.ts`.
  - `sync.server.ts` gains `runHistoryImport`, which reuses `toMsg`, `classify`, `createPage` and `logCreateProps`.
  - Admin UI section in `admin_.mail-sync.tsx`.
  - New admin server functions in `mail-sync.functions.ts`.
- **Migration (additive):**
  - `mail_sync_settings.history_import boolean default false`.
  - `mail_sync_history_state` (folder, uidvalidity, last_uid, cutoff), service-role only with no anon/authenticated grants.
  - `mail_sync_runs.mode` gains 'history_preview' and 'history'.
- **Notion reads:** query both data sources with pagination and match on Customer Email, Record ID and Email Thread. The `orderUpdateProps` change is limited to appending markers.
- **Proposed order status → Notion mapping:**
  - quote_received / engineering_review → "New" or "Needs Review"
  - quote_sent / awaiting_approval → "Quote Sent"
  - production through shipped → "In Progress" (if that option exists, otherwise kept as is, with the gap reported)
  - delivered / completed → "Delivered"
  - cancelled / rejected → "Lost / Cancelled"
  
  The status options are validated against the Notion layout before use.
- **Checks:** mail-sync tests, scoped lint, the build, and a pilot verified in Notion via read-only queries.
- **No sending:** no emails are sent at any point, and secrets and production settings stay unchanged until you approve each gate.
