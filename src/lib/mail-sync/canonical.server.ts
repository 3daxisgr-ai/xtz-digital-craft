/* eslint-disable @typescript-eslint/no-explicit-any -- service-role client rows and Notion JSON follow the existing untyped pattern */
// Canonical reconcile: one Notion record (and one permanent TOREO Order ID) per real request across
// website submissions, the site's notification email, customer email and TOREO replies (INBOX + Sent).
// Preview is read-only. Apply needs live_writes, is idempotent (re-runs change nothing), never sends
// email, never deletes or merges records, and never moves Delivered / Lost / production statuses.
import { mid, cleanSnippet, classifyIncoming } from "./mime";
import {
  CUSTOMERS_CANON_PROPS,
  CUSTOMERS_SCHEMA,
  LOG_SCHEMA,
  ORDERS_CANON_PROPS,
  ORDERS_CANON_SCHEMA,
  ORDERS_SCHEMA,
  TASKS_SCHEMA,
  canonPatchProps,
  logCreateProps,
  orderCreateProps,
  readCanonPage,
  readCustomerPage,
  readLogPage,
  readTaskPage,
  taskCreateProps,
  validateSchema,
  type CanonPage,
} from "./notion-map";
import {
  DATA_SOURCES,
  createPage,
  ensureOrderFields,
  findOrderByOrderId,
  getDataSourceProperties,
  listAllPages,
  updatePage,
} from "./notion.server";
import {
  AUTO_NEXT_ACTIONS,
  orderCodesIn,
  planCanonical,
  planReplyTasks,
  type CMsg,
  type CRequest,
  type RequestPlan,
} from "./canonical";
import { ORDER_STATUS_TO_NOTION, domainOf } from "./history";
import { checkOrder, classifyContact, mayWriteLabel, type OrderCheck } from "./classify";
import { loadMailbox, loadSubmissions } from "./history.server";
import { admin, claimLock, ensureCustomer, releaseLock, siteSender, type Msg } from "./sync.server";
import { PAPAKI } from "./imap.server";

const DEFAULT_BUDGET_MS = 20_000;
const RESERVE_MS = 4_000;
const NOTION_CLAIM_MS = 120_000;
const AUTO_LOG = ["Needs Reply", "Replied", "Follow-up Needed"];
const trackUrl = (code: string | null) =>
  code ? `https://www.toreo.gr/track?code=${encodeURIComponent(code)}` : null;

export interface ReconcileRow {
  key: string;
  kind: "request" | "review" | "skip";
  action: string;
  reason: string;
  order: string | null;
  domain: string;
  date: string;
}

export interface ReconcileResult {
  ok: boolean;
  busy?: boolean;
  runId: string | null;
  mode: "reconcile_preview" | "reconcile";
  counts: Record<string, number>;
  rows: ReconcileRow[];
  duplicates: { order: string; candidates: string[] }[];
  schemaProblems: string[];
  remaining: number;
  error: string | null;
}

/** Find-or-create the canonical request for these identity keys (atomic, serialized in the DB). */
export async function claimCanonical(
  db: any,
  p: {
    keys: string[];
    source: "Website" | "Email";
    email: string | null;
    subject: string;
    orderCode?: string | null;
    orderId?: string | null;
  },
): Promise<{
  request_id: string | null;
  order_code: string | null;
  notion_page_id: string | null;
  created: boolean;
  conflict: boolean;
}> {
  const { data, error } = await db.rpc("mail_sync_claim_request", {
    _keys: Array.from(new Set(p.keys)),
    _source: p.source,
    _email: p.email,
    _subject: p.subject.slice(0, 500),
    _order_code: p.orderCode ?? null,
    _order_id: p.orderId ?? null,
  });
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data[0] : data) as any;
}

/** Only one writer may create the Notion page for a canonical request. */
export async function claimNotionCreation(db: any, requestId: string): Promise<boolean> {
  const now = new Date();
  const { data, error } = await db
    .from("mail_sync_requests")
    .update({ notion_claim_until: new Date(now.getTime() + NOTION_CLAIM_MS).toISOString() })
    .eq("id", requestId)
    .is("notion_page_id", null)
    .or(`notion_claim_until.is.null,notion_claim_until.lt.${now.toISOString()}`)
    .select("id");
  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length === 1;
}

export async function saveNotionPage(db: any, requestId: string, pageId: string) {
  await db
    .from("mail_sync_requests")
    .update({
      notion_page_id: pageId,
      notion_claim_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .is("notion_page_id", null);
}

async function selectAll(db: any, table: string, columns: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const websiteCodeOf = (p: CanonPage) =>
  orderCodesIn(p.websiteUrl ? decodeURIComponent(p.websiteUrl) : null, p.title)[0] ?? null;

export async function reconcile(opts: {
  apply: boolean;
  trigger: "admin" | "cron";
  budgetMs?: number;
}): Promise<ReconcileResult> {
  const db = await admin();
  const mode = opts.apply ? "reconcile" : "reconcile_preview";
  const result: ReconcileResult = {
    ok: false,
    runId: null,
    mode,
    counts: {},
    rows: [],
    duplicates: [],
    schemaProblems: [],
    remaining: 0,
    error: null,
  };
  const { data: settings, error: sErr } = await db
    .from("mail_sync_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (sErr) return { ...result, error: sErr.message };
  if (opts.apply && !settings.live_writes)
    return { ...result, error: "Οι ζωντανές εγγραφές είναι απενεργοποιημένες." };
  const password = process.env.PAPAKI_EMAIL_PASSWORD;
  if (!password) return { ...result, error: "Ο κωδικός του email δεν είναι ρυθμισμένος." };
  if (!(await claimLock(db, opts.trigger, settings)))
    return {
      ...result,
      busy: true,
      error: "Τρέχει ήδη άλλη εκτέλεση ή η προηγούμενη έγινε πολύ πρόσφατα.",
    };
  const { data: run } = await db
    .from("mail_sync_runs")
    .insert({ mode, trigger: opts.trigger })
    .select("id")
    .single();
  result.runId = run?.id ?? null;
  const started = Date.now();
  const budget = Math.min(Math.max(opts.budgetMs ?? DEFAULT_BUDGET_MS, 10_000), 600_000);
  const outOfTime = () => Date.now() - started > budget - RESERVE_MS;
  const count = (k: string, n = 1) => (result.counts[k] = (result.counts[k] ?? 0) + n);

  try {
    // 1. Notion schema (read-only check; the canonical fields are added only when applying).
    const [op, lp, cp, tp] = await Promise.all([
      getDataSourceProperties(DATA_SOURCES.orders),
      getDataSourceProperties(DATA_SOURCES.log),
      getDataSourceProperties(DATA_SOURCES.customers),
      getDataSourceProperties(DATA_SOURCES.tasks),
    ]);
    result.schemaProblems = [
      ...validateSchema(op, ORDERS_SCHEMA).map((p) => `Orders & Quotes: ${p}`),
      ...validateSchema(lp, LOG_SCHEMA).map((p) => `Communication Log: ${p}`),
      ...validateSchema(cp, CUSTOMERS_SCHEMA).map((p) => `Customers: ${p}`),
      ...validateSchema(tp, TASKS_SCHEMA).map((p) => `Tasks: ${p}`),
    ];
    if (result.schemaProblems.length)
      throw new Error("Η δομή του Notion άλλαξε — δεν έγινε καμία αλλαγή.");
    if (opts.apply) {
      const added = await ensureOrderFields(ORDERS_CANON_PROPS, op);
      if (added.length) count("fields_added", added.length);
      const fresh = added.length ? await getDataSourceProperties(DATA_SOURCES.orders) : op;
      const p2 = validateSchema(fresh, ORDERS_CANON_SCHEMA);
      if (p2.length) throw new Error(`Orders & Quotes: ${p2.join("; ")}`);
      const addedC = await ensureOrderFields(CUSTOMERS_CANON_PROPS, cp, DATA_SOURCES.customers);
      if (addedC.length) count("fields_added", addedC.length);
    }

    // 2. Everything we know (read-only).
    const own = PAPAKI.user;
    const internal: string[] = settings.internal_senders ?? [];
    const ignore: string[] = settings.ignore_senders ?? [];
    const sender = siteSender();
    const cutoffMs = Date.parse(settings.history_cutoff);
    const [
      mail,
      subsAll,
      orderPages,
      logPages,
      taskPages,
      canonRows,
      canonKeys,
      ledger,
      customerPages,
      autoLabels,
    ] = await Promise.all([
      loadMailbox(settings.history_cutoff, password),
      loadSubmissions(db),
      listAllPages(DATA_SOURCES.orders),
      listAllPages(DATA_SOURCES.log),
      listAllPages(DATA_SOURCES.tasks),
      selectAll(db, "mail_sync_requests", "id, order_code, notion_page_id, removed_at, source"),
      selectAll(db, "mail_sync_request_keys", "key, request_id"),
      selectAll(
        db,
        "mail_sync_messages",
        "id, message_id, status, action, notion_order_page_id, notion_log_page_id",
      ),
      listAllPages(DATA_SOURCES.customers),
      selectAll(db, "mail_sync_auto_labels", "target, value"),
    ]);
    const pages = new Map<string, CanonPage>(orderPages.map((p: any) => [p.id, readCanonPage(p)]));
    const logs = logPages.map(readLogPage);
    const logById = new Map(logs.map((l) => [l.id, l]));
    const logByLink = new Map(logs.filter((l) => l.link).map((l) => [l.link!, l]));
    const tasks = taskPages.map(readTaskPage);
    const canonById = new Map<string, any>(canonRows.map((r: any) => [r.id, r]));
    const canonByPage = new Map<string, any>(
      canonRows.filter((r: any) => r.notion_page_id).map((r: any) => [r.notion_page_id, r]),
    );

    // 3. Identity keys -> existing pages; keys of records the owner removed in Notion.
    const keys = new Map<string, string>();
    const removedKeys = new Set<string>();
    const removedCanon: string[] = [];
    for (const r of canonRows)
      if (r.notion_page_id && !pages.has(r.notion_page_id)) removedCanon.push(r.id);
    for (const k of canonKeys) {
      const r = canonById.get(k.request_id);
      if (!r?.notion_page_id) continue;
      if (pages.has(r.notion_page_id)) keys.set(k.key, r.notion_page_id);
      else removedKeys.add(k.key);
    }
    const ledgerKey = (id: string) =>
      id.startsWith("website:")
        ? `submission:${id.slice(8)}`
        : id.startsWith("thread:")
          ? null
          : `msg:${id}`;
    const priorReview = new Set<string>();
    for (const row of ledger) {
      const k = ledgerKey(row.message_id);
      if (!k) continue;
      if (row.notion_order_page_id) {
        if (pages.has(row.notion_order_page_id)) {
          if (!keys.has(k)) keys.set(k, row.notion_order_page_id);
        } else if (!keys.has(k)) removedKeys.add(k);
      } else if (row.status === "manual_review") priorReview.add(row.message_id);
    }
    for (const p of pages.values()) {
      for (const c of [p.orderId, websiteCodeOf(p)].filter((x): x is string => !!x))
        if (!keys.has(`order:${c}`)) keys.set(`order:${c}`, p.pageId);
      keys.set(`page:${p.pageId}`, p.pageId);
    }
    const requests: CRequest[] = [...pages.values()].map((p) => ({
      id: p.pageId,
      orderCode: p.orderId ?? canonByPage.get(p.pageId)?.order_code ?? websiteCodeOf(p),
      customerEmail: p.customerEmail,
      subject: p.title,
      status: p.status,
      receivedAt: p.receivedAt ?? new Date().toISOString(),
      lastActivity: p.lastContact ?? p.receivedAt ?? new Date().toISOString(),
      duplicateCheck: p.duplicateCheck,
    }));

    const byId = new Map<string, Msg>();
    const messages: CMsg[] = mail.messages.map(({ kind, msg }) => {
      byId.set(msg.messageId, msg);
      return {
        messageId: msg.messageId,
        folder: kind,
        inReplyTo: msg.inReplyTo,
        refs: msg.refs,
        fromEmail: msg.from?.email ?? null,
        fromName: msg.from?.name ?? null,
        toEmails: msg.to.map((a) => a.email),
        replyTo: msg.replyTo,
        subject: msg.subject,
        date: msg.date,
        hdrOrderId: msg.hdrOrderId,
        hdrSubmissionId: msg.hdrSubmissionId,
        cls:
          kind === "sent"
            ? "outgoing"
            : classifyIncoming({
                headers: msg.headers,
                from: msg.from,
                ownAddress: own,
                siteSender: sender,
                internal,
                ignore,
              }),
      };
    });
    const submissions = subsAll.filter((s) => Date.parse(s.createdAt) >= cutoffMs);
    const subById = new Map(submissions.map((s) => [s.id, s]));
    const plan = planCanonical({
      submissions,
      messages,
      requests,
      keys,
      removedKeys,
      priorReview,
      own,
      internal,
      now: Date.now(),
      staleDays: settings.history_stale_days,
      statusMap: ORDER_STATUS_TO_NOTION,
    });

    // Report (metadata only: no subjects, bodies or full addresses).
    const label = (r: RequestPlan) =>
      r.orderCode ?? (r.isNew ? "νέο" : (pages.get(r.id)?.orderId ?? null));
    for (const rv of plan.review) {
      result.rows.push({
        key: rv.key,
        kind: "review",
        action: "review",
        reason: rv.reason,
        order: rv.candidates.join(", ") || null,
        domain: domainOf(rv.email),
        date: rv.date,
      });
      count("review");
    }
    count("skipped", plan.skipped.length);
    for (const r of plan.requests)
      if (r.duplicates.length)
        result.duplicates.push({
          order: label(r) ?? pages.get(r.id)?.record ?? "νέο αίτημα",
          candidates: r.duplicates.map(
            (id) => pages.get(id)?.orderId ?? pages.get(id)?.record ?? "νέο αίτημα",
          ),
        });

    const attachByReq = new Map<string, typeof plan.attachments>();
    for (const a of plan.attachments)
      attachByReq.set(a.requestId, [...(attachByReq.get(a.requestId) ?? []), a]);

    if (!opts.apply) {
      for (const r of plan.requests) {
        const p = pages.get(r.id);
        const changes: string[] = [];
        if (r.isNew) changes.push("νέα εγγραφή");
        if (!r.isNew && !p?.orderId) changes.push("Order ID");
        if (r.replyState && p?.replyState !== r.replyState) changes.push(`→ ${r.replyState}`);
        if (r.status && !r.isNew) changes.push(`Status → ${r.status}`);
        const newLogs = (attachByReq.get(r.id) ?? []).filter(
          (a) => a.role !== "notification" && !hasLog(a.key),
        ).length;
        if (newLogs) changes.push(`${newLogs} νέα στο ιστορικό`);
        const action = r.isNew ? "new_record" : changes.length ? "update" : "unchanged";
        count(action);
        result.rows.push({
          key: r.id,
          kind: "request",
          action,
          reason: changes.join(" · ") || "Καμία αλλαγή",
          order: label(r),
          domain: domainOf(r.customerEmail),
          date: r.lastActivity,
        });
      }
      count("duplicates", result.duplicates.length);
      await classifyPhase(false);
      result.ok = true;
      return result;
    }

    function hasLog(key: string) {
      return !!(ledgerLog(key) || logByLink.get(mid(key)));
    }
    function ledgerLog(key: string) {
      const row = ledger.find((l) => l.message_id === key);
      return row?.notion_log_page_id && logById.has(row.notion_log_page_id)
        ? logById.get(row.notion_log_page_id)!
        : null;
    }

    // 4. Apply. Owner-removed records are marked, never recreated.
    for (const id of removedCanon)
      await db
        .from("mail_sync_requests")
        .update({ removed_at: new Date().toISOString() })
        .eq("id", id)
        .is("removed_at", null);

    const ordered = [...plan.requests].sort(
      (a, b) => Number(a.isNew) - Number(b.isNew) || a.receivedAt.localeCompare(b.receivedAt),
    );
    const pageOf = new Map<string, { pageId: string; code: string }>();
    let pending = 0;
    for (const r of ordered) {
      if (outOfTime()) {
        pending++;
        continue;
      }
      const row: ReconcileRow = {
        key: r.id,
        kind: "request",
        action: "unchanged",
        reason: "",
        order: null,
        domain: domainOf(r.customerEmail),
        date: r.lastActivity,
      };
      const notes: string[] = [];
      try {
        const page = r.isNew ? null : pages.get(r.id)!;
        const keysFor = [...r.keys, ...(page ? [`page:${page.pageId}`] : [])];
        const canon = await claimCanonical(db, {
          keys: keysFor,
          source: r.source,
          email: r.customerEmail,
          subject: r.subject,
          orderCode: page?.orderId ?? r.orderCode,
          orderId: r.orderId,
        });
        if (canon.conflict || !canon.request_id || !canon.order_code) {
          row.action = "review";
          row.reason = "Τα στοιχεία ανήκουν σε περισσότερες εγγραφές — χειροκίνητος έλεγχος";
          count("review");
          result.rows.push(row);
          continue;
        }
        const code = canon.order_code;
        row.order = code;
        let pageId = page?.pageId ?? canon.notion_page_id ?? null;
        let current: CanonPage | null = page ?? (pageId ? (pages.get(pageId) ?? null) : null);
        if (page && !canon.notion_page_id) await saveNotionPage(db, canon.request_id, page.pageId);
        if (page && canon.notion_page_id && canon.notion_page_id !== page.pageId) {
          row.action = "review";
          row.reason = `Το ${code} είναι ήδη συνδεδεμένο με άλλη εγγραφή`;
          count("review");
          result.rows.push(row);
          continue;
        }

        let customerId: string | null = current?.customerIds[0] ?? null;
        if (!pageId) {
          // New canonical record: exactly one writer creates the Notion page.
          if (!(await claimNotionCreation(db, canon.request_id))) {
            pending++;
            row.action = "pending";
            row.reason = "Δημιουργείται από άλλη εκτέλεση";
            result.rows.push(row);
            continue;
          }
          const found = await findOrderByOrderId(code);
          if (found) {
            pageId = found.id;
            current = readCanonPage(found);
            notes.push("βρέθηκε υπάρχουσα σελίδα με το ίδιο Order ID");
          } else {
            customerId = r.customerEmail
              ? await ensureCustomer(r.customerEmail, r.customerName, r.source, r.customerPhone)
              : null;
            const firstMsg = (attachByReq.get(r.id) ?? []).find(
              (a) => a.role === "customer" || a.role === "notification",
            );
            const created = await createPage(
              DATA_SOURCES.orders,
              orderCreateProps({
                subject:
                  r.source === "Website" || r.subject.includes(code)
                    ? r.subject
                    : `${code} — ${r.subject}`,
                source: r.source,
                customerName: r.customerName,
                customerEmail: r.customerEmail ?? "",
                customerPhone: r.customerPhone,
                receivedAt: r.receivedAt,
                lastContact: r.lastActivity,
                threadUrl:
                  firstMsg && !firstMsg.key.startsWith("website:")
                    ? mid(byId.get(firstMsg.key)?.root ?? firstMsg.key)
                    : null,
                websiteUrl: r.source === "Website" ? trackUrl(code) : null,
                nextAction:
                  r.replyState === "Replied" ? "Αναμονή απάντησης πελάτη" : "Απάντηση στον πελάτη",
                status: r.status ?? undefined,
                customerPageId: customerId,
                orderId: code,
                replyState: r.replyState,
              }),
            );
            pageId = created.id;
            current = null;
            count("created");
            row.action = "new_record";
          }
          await saveNotionPage(db, canon.request_id, pageId!);
        }
        pageOf.set(r.id, { pageId: pageId!, code });

        // Existing record: Order ID once, reply state, status (reply statuses only), contact date.
        if (current) {
          const patch: Parameters<typeof canonPatchProps>[0] = {};
          if (!current.orderId) {
            patch.orderId = code;
            notes.push(`Order ID ${code}`);
            count("ids_assigned");
          } else if (current.orderId !== code)
            notes.push(`Order ID στο Notion: ${current.orderId}`);
          if (r.replyState && current.replyState !== r.replyState) {
            patch.replyState = r.replyState;
            notes.push(`→ ${r.replyState}`);
          }
          if (r.status && r.status !== current.status && !r.isNew) {
            patch.status = r.status;
            notes.push(`Status ${current.status ?? "—"} → ${r.status}`);
            count("status_changed");
          }
          if (
            r.lastActivity &&
            (!current.lastContact || r.lastActivity.slice(0, 16) > current.lastContact.slice(0, 16))
          )
            patch.lastContact = r.lastActivity;
          if (
            r.replyState &&
            (!current.nextAction || AUTO_NEXT_ACTIONS.includes(current.nextAction))
          ) {
            const want =
              r.replyState === "Replied" ? "Αναμονή απάντησης πελάτη" : "Απάντηση στον πελάτη";
            if (current.nextAction !== want) patch.nextAction = want;
          }
          if (Object.keys(canonPatchProps(patch)).length) {
            await updatePage(pageId!, canonPatchProps(patch));
            if (row.action === "unchanged") row.action = "update";
          }
        }

        // Communication Log: one entry per message / form submission, linked and with the Order ID.
        for (const a of attachByReq.get(r.id) ?? []) {
          if (a.role === "notification") {
            await upsertLedger(db, a.key, {
              folder: "INBOX",
              direction: "incoming",
              classification: "site_notification",
              action: "notification",
              status: "synced",
              notion_order_page_id: pageId,
              notion_order_record: code,
            });
            continue;
          }
          const existingLog =
            ledgerLog(a.key) ??
            (a.key.startsWith("website:") ? null : (logByLink.get(mid(a.key)) ?? null));
          if (existingLog) {
            const patch: Record<string, unknown> = {};
            if (
              a.logStatus &&
              existingLog.status !== a.logStatus &&
              AUTO_LOG.includes(existingLog.status ?? "")
            )
              patch.Status = { select: { name: a.logStatus } };
            if (!existingLog.orderIds.length)
              patch["Order / Request"] = { relation: [{ id: pageId }] };
            if (existingLog.related !== code)
              patch["Related Record ID"] = {
                rich_text: [{ type: "text", text: { content: code } }],
              };
            if (Object.keys(patch).length) {
              await updatePage(existingLog.id, patch);
              count("log_updated");
            }
            await upsertLedger(db, a.key, {
              status: "synced",
              notion_order_page_id: pageId,
              notion_order_record: code,
              notion_log_page_id: existingLog.id,
            });
            continue;
          }
          if (!customerId && r.customerEmail)
            customerId = await ensureCustomer(
              r.customerEmail,
              r.customerName,
              r.source,
              r.customerPhone,
            );
          let props: Record<string, unknown>;
          if (a.role === "website") {
            const s = subById.get(a.key.slice(8));
            props = logCreateProps({
              activity: `Αίτημα από το site: ${r.subject}`,
              direction: "Incoming",
              channel: "Website",
              date: a.date,
              contactEmail: r.customerEmail,
              contactName: r.customerName,
              summary:
                r.submissionIds.length > 1
                  ? `${r.submissionIds.length} ίδιες υποβολές → 1 αίτημα.`
                  : "Υποβολή φόρμας του site.",
              threadUrl: null,
              messageUrl: trackUrl(s?.orderCode ?? code),
              status: a.logStatus ?? "Needs Reply",
              relatedRecord: code,
              orderPageId: pageId,
              customerPageId: customerId,
            });
          } else {
            const msg = byId.get(a.key);
            if (!msg) throw new Error("Το μήνυμα δεν βρέθηκε ξανά στο mailbox");
            const outgoing = a.role === "reply" || a.role === "forward";
            const counterpart = outgoing ? (msg.to.find((x) => x.email !== own) ?? null) : msg.from;
            props = logCreateProps({
              activity: `${a.role === "reply" ? "Απάντηση TOREO" : a.role === "forward" ? "Προώθηση TOREO" : "Εισερχόμενο email"}: ${msg.subject || "(χωρίς θέμα)"}`,
              direction: outgoing ? "Outgoing" : "Incoming",
              channel: "Email",
              date: msg.date,
              contactEmail: counterpart?.email ?? null,
              contactName: counterpart?.name ?? null,
              summary: [
                a.role === "forward"
                  ? "Προώθηση σε τρίτο — δεν μετράει ως απάντηση στον πελάτη."
                  : "",
                cleanSnippet(msg.snippet, 300),
              ]
                .filter(Boolean)
                .join("\n"),
              threadUrl: mid(msg.root),
              messageUrl: mid(msg.messageId),
              status: a.logStatus ?? "Needs Reply",
              relatedRecord: code,
              orderPageId: pageId,
              customerPageId: a.role === "forward" ? null : customerId,
              attachments: msg.attachments,
            });
          }
          const log = await createPage(DATA_SOURCES.log, props);
          count("log_created");
          const msg = byId.get(a.key);
          await upsertLedger(db, a.key, {
            folder: a.key.startsWith("website:") ? "website" : (msg?.folder ?? "INBOX"),
            uid: msg?.uid ?? null,
            direction: a.key.startsWith("website:")
              ? "website"
              : a.role === "customer"
                ? "incoming"
                : "outgoing",
            in_reply_to: msg?.inReplyTo ?? null,
            refs: msg?.refs ?? [],
            thread_root: msg?.root ?? null,
            from_email: msg?.from?.email ?? r.customerEmail,
            to_emails: msg?.to.map((x) => x.email) ?? [],
            sent_at: a.date,
            classification: a.role === "customer" || a.role === "website" ? "customer" : "outgoing",
            action: a.role,
            status: "synced",
            notion_order_page_id: pageId,
            notion_order_record: code,
            notion_log_page_id: log.id,
          });
          if (row.action === "unchanged") row.action = "update";
        }

        // Tasks: one reply task while TOREO owes a reply; closed once a real reply was sent.
        const mine = tasks.filter((t) => t.orderIds.includes(pageId!));
        const tp = planReplyTasks(r.replyState, mine, r.lastCustomerAt);
        for (const id of tp.done) {
          await updatePage(id, {
            Status: { status: { name: "Done" } },
            Notes: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content:
                      "Ολοκληρώθηκε αυτόματα: βρέθηκε απάντηση της TOREO στο νήμα (Απεσταλμένα).",
                  },
                },
              ],
            },
          });
          count("tasks_done");
          notes.push("task → Done");
        }
        for (const id of tp.cancel) {
          await updatePage(id, {
            Status: { status: { name: "Cancelled" } },
            Notes: {
              rich_text: [
                { type: "text", text: { content: "Διπλό task απάντησης — κρατήθηκε ένα." } },
              ],
            },
          });
          count("tasks_cancelled");
        }
        if (tp.create) {
          await createPage(
            DATA_SOURCES.tasks,
            taskCreateProps({
              title:
                `Απάντηση σε ${r.customerName || r.customerEmail || "πελάτη"}: ${r.subject}`.slice(
                  0,
                  200,
                ),
              source: r.source,
              orderPageId: pageId!,
              relatedRecord: code,
              notes: "Ο πελάτης έγραψε τελευταίος. Ορίστε υπεύθυνο και προθεσμία.",
            }),
          );
          count("tasks_created");
          notes.push("νέο task απάντησης");
        }
        for (const t of mine)
          if (t.related !== code && !tp.cancel.includes(t.id)) {
            await updatePage(t.id, {
              "Related Record ID": { rich_text: [{ type: "text", text: { content: code } }] },
            });
            count("task_ids_updated");
          }
        if (row.action === "unchanged" && (tp.create || tp.done.length || tp.cancel.length))
          row.action = "update";
        row.reason =
          notes.join(" · ") ||
          (row.action === "unchanged" ? "Καμία αλλαγή" : "Ενημερώθηκε το ιστορικό");
        count(row.action);
        result.rows.push(row);
      } catch (e) {
        row.action = "error";
        row.reason = `Σφάλμα: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`;
        count("error");
        result.rows.push(row);
        pending++;
        break; // stop safely; the next run resumes (every step above is idempotent)
      }
    }
    // Possible duplicates: flagged with permanent Order IDs (now assigned), never merged.
    if (!result.counts.error)
      for (const r of ordered) {
        if (!r.duplicates.length || outOfTime()) continue;
        const own = pageOf.get(r.id);
        if (!own) continue;
        const current = r.isNew ? null : (pages.get(r.id) ?? null);
        if (current?.duplicateCheck && current.duplicateCheck !== "Possible duplicate") continue;
        const codes = r.duplicates
          .map((id) => pageOf.get(id)?.code ?? pages.get(id)?.orderId ?? null)
          .filter((c): c is string => !!c)
          .sort();
        if (!codes.length || current?.possibleDuplicates === codes.join(", ")) continue;
        try {
          await updatePage(own.pageId, canonPatchProps({ duplicates: codes }));
          count("duplicates_flagged");
        } catch (e) {
          console.error("[mail-sync] duplicate flag failed", errText(e));
          count("error");
        }
      }
    if (!result.counts.error && !outOfTime()) await classifyPhase(true);
    else pending++;
    result.remaining = pending;
    result.ok = !result.counts.error;
    return result;

    // 5. Evidence-based labels: Order Check on requests, Classification on Customers. A label a
    //    person changed in Notion is never overwritten; only strong mislinks are corrected.
    async function classifyPhase(write: boolean) {
      const customers = customerPages.map(readCustomerPage);
      const custById = new Map(customers.map((c) => [c.id, c]));
      const custByEmail = new Map(
        customers.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c]),
      );
      const lastAuto = new Map<string, string>(autoLabels.map((a: any) => [a.target, a.value]));
      const planById = new Map(plan.requests.map((r) => [r.id, r]));
      const checks = new Map<string, OrderCheck>();
      const remember = async (target: string, value: string, reason: string) =>
        db
          .from("mail_sync_auto_labels")
          .upsert(
            { target, value, reason, updated_at: new Date().toISOString() },
            { onConflict: "target" },
          );

      for (const p of pages.values()) {
        if (write && outOfTime()) return;
        const r = planById.get(p.pageId);
        const senders = new Set<string>();
        for (const a of attachByReq.get(p.pageId) ?? [])
          if (a.role === "customer") {
            const f = byId.get(a.key)?.from?.email;
            if (f && f !== own) senders.add(f);
          }
        for (const l of logs)
          if (
            l.orderIds.includes(p.pageId) &&
            l.direction === "Incoming" &&
            l.contactEmail &&
            l.contactEmail !== own
          )
            senders.add(l.contactEmail.toLowerCase());
        const linked = p.customerIds
          .map((id) => custById.get(id))
          .filter((c): c is NonNullable<typeof c> => !!c);
        const evidence = {
          status: r?.status ?? p.status,
          source: p.source,
          subject: p.title,
          customerEmail: p.customerEmail,
          customerName: p.customerName,
          linkedCustomers: linked.map((c) => ({ email: c.email, name: c.name })),
          submissionEmails: (r?.submissionIds ?? [])
            .map((id) => subById.get(id)?.email)
            .filter((e): e is string => !!e),
          incomingSenders: [...senders],
        };
        let v = checkOrder(evidence);
        // Strong-evidence correction: linked to another person's card while a card with the
        // record's exact email exists -> relink to that card and note it on the record.
        const exact = p.customerEmail ? custByEmail.get(p.customerEmail.toLowerCase()) : undefined;
        const wrong = linked.find(
          (c) =>
            c.email && p.customerEmail && c.email.toLowerCase() !== p.customerEmail.toLowerCase(),
        );
        if (v.value === "Customer mismatch" && wrong && exact && exact.id !== wrong.id) {
          const note = `Διόρθωση ${new Date().toISOString().slice(0, 10)}: η σύνδεση πελάτη άλλαξε από «${wrong.name ?? wrong.email}» σε «${exact.name ?? exact.email}» (ίδιο email με το αίτημα).`;
          if (write) {
            await updatePage(p.pageId, {
              Customer: { relation: [{ id: exact.id }] },
              "Internal Notes": {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: [p.internalNotes, note].filter(Boolean).join("\n").slice(0, 1900),
                    },
                  },
                ],
              },
            });
            count("customer_links_fixed");
          } else count("customer_links_to_fix");
          result.rows.push({
            key: p.pageId,
            kind: "request",
            action: "correction",
            reason: note,
            order: p.orderId,
            domain: domainOf(p.customerEmail),
            date: p.lastContact ?? p.receivedAt ?? "",
          });
          v = checkOrder({
            ...evidence,
            linkedCustomers: [{ email: exact.email, name: exact.name }],
          });
        }
        checks.set(p.pageId, v.value);
        count(`check:${v.value}`);
        if (v.review)
          result.rows.push({
            key: p.pageId,
            kind: "review",
            action: v.value,
            reason: v.reason,
            order: p.orderId ?? websiteCodeOf(p),
            domain: domainOf(p.customerEmail),
            date: p.lastContact ?? p.receivedAt ?? "",
          });
        const target = `order:${p.pageId}`;
        if (
          write &&
          p.orderCheck !== v.value &&
          mayWriteLabel(p.orderCheck, lastAuto.get(target) ?? null)
        ) {
          await updatePage(p.pageId, {
            "Order Check": { select: { name: v.value } },
            "Check Reason": { rich_text: [{ type: "text", text: { content: v.reason } }] },
          });
          await remember(target, v.value, v.reason);
          count("checks_written");
        } else if (write && !lastAuto.has(target) && p.orderCheck === v.value)
          await remember(target, v.value, v.reason);
      }

      for (const c of customers) {
        if (write && outOfTime()) return;
        if (!c.email) continue;
        const email = c.email.toLowerCase();
        const orders = [...pages.values()].filter(
          (p) => p.customerIds.includes(c.id) || (p.customerEmail ?? "").toLowerCase() === email,
        );
        const inbound = messages
          .filter((m) => m.folder === "inbox" && (m.fromEmail ?? "").toLowerCase() === email)
          .map((m) => ({ cls: m.cls, subject: m.subject }));
        const outbound = plan.attachments
          .filter(
            (a) =>
              (a.role === "reply" || a.role === "forward") &&
              byId.get(a.key)?.to.some((t) => t.email === email),
          )
          .map((a) => a.role as "reply" | "forward");
        const v = classifyContact({
          email,
          type: c.type,
          orders: orders.map((p) => ({
            status: planById.get(p.pageId)?.status ?? p.status,
            check: checks.get(p.pageId) ?? null,
          })),
          inbound,
          outbound,
          website: submissions.some((s) => s.email.toLowerCase() === email),
          ignore,
        });
        count(`contact:${v.value}`);
        if (v.review)
          result.rows.push({
            key: c.id,
            kind: "review",
            action: `Πελάτης: ${v.value}`,
            reason: v.reason,
            order: null,
            domain: domainOf(email),
            date: "",
          });
        const target = `customer:${c.id}`;
        if (
          write &&
          (c.classification !== v.value || c.review !== v.review || c.reason !== v.reason) &&
          mayWriteLabel(c.classification, lastAuto.get(target) ?? null)
        ) {
          await updatePage(c.id, {
            Classification: { select: { name: v.value } },
            "Classification Reason": { rich_text: [{ type: "text", text: { content: v.reason } }] },
            "Classification Review": { checkbox: v.review },
          });
          await remember(target, v.value, v.reason);
          count("classifications_written");
        }
      }
    }
  } catch (e) {
    result.error = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    return result;
  } finally {
    if (result.runId)
      await db
        .from("mail_sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          ok: result.ok,
          counts: result.counts,
          error: result.error,
          report: {
            rows: result.rows,
            duplicates: result.duplicates,
            remaining: result.remaining,
            schemaProblems: result.schemaProblems,
          },
        })
        .eq("id", result.runId);
    await releaseLock(db);
  }
}

/** Ledger row per message / submission (unique message_id), created or completed in place. */
async function upsertLedger(db: any, key: string, patch: Record<string, unknown>) {
  const { data } = await db
    .from("mail_sync_messages")
    .select("id")
    .eq("message_id", key)
    .maybeSingle();
  if (data?.id) {
    const { error } = await db
      .from("mail_sync_messages")
      .update({ ...patch, error: null, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await db
    .from("mail_sync_messages")
    .insert({ message_id: key, folder: "INBOX", direction: "incoming", ...patch });
  if (error && error.code !== "23505") throw new Error(error.message);
  if (error) await db.from("mail_sync_messages").update(patch).eq("message_id", key);
}
