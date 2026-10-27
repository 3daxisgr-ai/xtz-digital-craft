/* eslint-disable @typescript-eslint/no-explicit-any -- service-role client rows and Notion JSON follow the existing untyped pattern */
// One-off historical import (website requests + info@toreo.gr) into the existing Notion databases.
// Preview: read-only everywhere (mailbox EXAMINE + BODY.PEEK, Notion queries, DB selects) and stores
// only a metadata report. Import: admin-triggered, gated by live_writes + history_import + an
// approved preview (<24h); writes only to the existing TOREO databases; never sends email.
import { ImapSession, PAPAKI } from "./imap.server";
import { imapDate } from "./imap-parse";
import { classifyIncoming, cleanSnippet, mid } from "./mime";
import {
  CUSTOMERS_SCHEMA,
  LOG_SCHEMA,
  ORDERS_SCHEMA,
  TASKS_SCHEMA,
  customerCreateProps,
  logCreateProps,
  orderCreateProps,
  readExistingPage,
  readLogLink,
  readOrderPage,
  taskCreateProps,
  threadMarkerProps,
  validateSchema,
} from "./notion-map";
import {
  DATA_SOURCES,
  createPage,
  findCustomerByEmail,
  getDataSourceProperties,
  listAllPages,
  notionFetch,
  updatePage,
} from "./notion.server";
import {
  CLIENT_STATUSES,
  fingerprint,
  importable,
  planHistory,
  previewRow,
  type HMsg,
  type HSubmission,
  type PlanUnit,
  type PreviewRow,
} from "./history";
import { admin, claimLock, releaseLock, siteSender, toMsg, type Msg } from "./sync.server";

const DEFAULT_BUDGET_MS = 20_000;
const UNIT_RESERVE_MS = 6_000;
const PREVIEW_MAX_AGE_MS = 24 * 3_600_000;
const HISTORY_TAG = "Ιστορική εισαγωγή";

export interface HistoryResult {
  ok: boolean;
  runId: string | null;
  mode: "history_preview" | "history";
  counts: Record<string, number>;
  rows: PreviewRow[];
  remaining: number;
  error: string | null;
}

const trackUrl = (code: string | null) =>
  code ? `https://www.toreo.gr/track?code=${encodeURIComponent(code)}` : null;

export async function loadSubmissions(db: any): Promise<HSubmission[]> {
  const [subs, orders, intake] = await Promise.all([
    db
      .from("submissions")
      .select("id, name, surname, email, phone, service, message, created_at")
      .order("created_at"),
    db.from("orders").select("id, order_code, customer_email, status, created_at"),
    db.from("request_intake").select("submission_id, order_id").not("submission_id", "is", null),
  ]);
  for (const r of [subs, orders, intake]) if (r.error) throw new Error(r.error.message);
  const byId = new Map<string, any>((orders.data ?? []).map((o: any) => [o.id, o]));
  const viaIntake = new Map<string, any>();
  for (const r of intake.data ?? [])
    if (r.order_id && byId.has(r.order_id)) viaIntake.set(r.submission_id, byId.get(r.order_id));
  return (subs.data ?? []).map((s: any) => {
    let o = viaIntake.get(s.id);
    if (!o) {
      // Same email, created within 15 minutes, and unique.
      const t = Date.parse(s.created_at);
      const near = (orders.data ?? []).filter(
        (x: any) =>
          (x.customer_email ?? "").toLowerCase() === (s.email ?? "").toLowerCase() &&
          Math.abs(Date.parse(x.created_at) - t) <= 15 * 60_000,
      );
      if (near.length === 1) o = near[0];
    }
    return {
      id: s.id,
      email: s.email,
      name: `${s.name ?? ""}${s.surname ? " " + s.surname : ""}`.trim(),
      phone: s.phone ?? null,
      service: s.service ?? null,
      createdAt: new Date(s.created_at).toISOString(),
      orderCode: o?.order_code ?? null,
      orderStatus: o?.status ?? null,
      orderId: o?.id ?? null,
      contentKey: fingerprint([s.service ?? "", (s.message ?? "").trim()]),
    };
  });
}

export async function loadMailbox(cutoff: string, password: string) {
  const session = await ImapSession.open(PAPAKI.host, PAPAKI.port);
  try {
    await session.login(PAPAKI.user, password);
    const list = await session.list();
    const sent =
      list.find((f) => f.flags.some((x) => x.toLowerCase() === "\\sent")) ??
      list.find((f) => /sent/i.test(f.name));
    const out: { kind: "inbox" | "sent"; msg: Msg }[] = [];
    const folders: { kind: string; uidvalidity: number | null; count: number }[] = [];
    for (const [kind, name] of [
      ["inbox", "INBOX"],
      ["sent", sent?.name ?? null],
    ] as const) {
      if (!name) continue;
      const ex = await session.examine(name);
      const uids = await session.uidSearch(`SINCE ${imapDate(new Date(cutoff))}`);
      for (let i = 0; i < uids.length; i += 50) {
        const recs = await session.uidFetch(uids.slice(i, i + 50));
        for (const r of recs) out.push({ kind, msg: toMsg(r, name, ex.uidvalidity) });
      }
      folders.push({ kind, uidvalidity: ex.uidvalidity, count: uids.length });
    }
    await session.logout();
    return { messages: out, folders };
  } finally {
    await session.close().catch(() => {});
  }
}

async function selectIn(db: any, column: string, values: string[], extra: (q: any) => any) {
  const rows: any[] = [];
  for (let i = 0; i < values.length; i += 150) {
    const { data, error } = await extra(
      db
        .from("mail_sync_messages")
        .select("message_id, notion_order_page_id, status")
        .in(column, values.slice(i, i + 150)),
    );
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  return rows;
}

async function buildPlan(db: any, settings: any, password: string) {
  const own = PAPAKI.user;
  const sender = siteSender();
  const internal: string[] = settings.internal_senders ?? [];
  const ignore: string[] = settings.ignore_senders ?? [];
  const [mail, submissions, orderPages, logPages] = await Promise.all([
    loadMailbox(settings.history_cutoff, password),
    loadSubmissions(db),
    listAllPages(DATA_SOURCES.orders),
    listAllPages(DATA_SOURCES.log),
  ]);
  const cutoffMs = Date.parse(settings.history_cutoff);
  const msgs: HMsg[] = mail.messages.map(({ kind, msg }) => ({
    messageId: msg.messageId,
    folder: kind,
    inReplyTo: msg.inReplyTo,
    refs: msg.refs,
    root: msg.root,
    fromEmail: msg.from?.email ?? null,
    fromName: msg.from?.name ?? null,
    toEmails: msg.to.map((a) => a.email),
    subject: msg.subject,
    date: msg.date,
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
  }));
  const keys = [
    ...msgs.map((m) => m.messageId),
    ...msgs.map((m) => `thread:${m.root}`),
    ...submissions.map((s) => `website:${s.id}`),
  ];
  const ledger = await selectIn(db, "message_id", Array.from(new Set(keys)), (q) =>
    q.in("status", ["synced", "skipped"]),
  );
  const done = new Set<string>(ledger.map((r) => r.message_id));
  // Records this import created are matched through the ledger, never re-matched by email.
  const own_pages = new Set<string>(
    (
      await db
        .from("mail_sync_messages")
        .select("notion_order_page_id")
        .eq("match_reason", HISTORY_TAG)
        .not("notion_order_page_id", "is", null)
    ).data?.map((r: any) => r.notion_order_page_id) ?? [],
  );
  const units = planHistory({
    messages: msgs,
    submissions: submissions.filter((s) => Date.parse(s.createdAt) >= cutoffMs),
    pages: orderPages.filter((p: any) => !own_pages.has(p.id)).map(readExistingPage),
    loggedLinks: new Set(logPages.map(readLogLink).filter((x): x is string => !!x)),
    done,
    own,
    now: Date.now(),
    staleDays: settings.history_stale_days,
    internal,
    ignore,
  });
  const byId = new Map(mail.messages.map(({ msg }) => [msg.messageId, msg]));
  return {
    units,
    folders: mail.folders,
    byId,
    submissions,
    notionPages: orderPages.length,
    logPages: logPages.length,
  };
}

export async function runHistory(opts: {
  mode: "history_preview" | "history";
  only?: "website" | "thread";
  limit?: number;
  budgetMs?: number;
}): Promise<HistoryResult> {
  const db = await admin();
  const { data: settings, error: sErr } = await db
    .from("mail_sync_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (sErr) throw new Error(sErr.message);
  const result: HistoryResult = {
    ok: false,
    runId: null,
    mode: opts.mode,
    counts: {},
    rows: [],
    remaining: 0,
    error: null,
  };
  const password = process.env.PAPAKI_EMAIL_PASSWORD;
  if (!password) return { ...result, error: "Ο κωδικός του email δεν είναι ρυθμισμένος." };

  let approved: Map<string, string> | null = null;
  if (opts.mode === "history")
    return {
      ...result,
      error:
        "Η ιστορική εισαγωγή αντικαταστάθηκε από την «Ενοποίηση αιτημάτων» (ένα αίτημα = μία εγγραφή, ένα Order ID).",
    };
  if (opts.mode === ("history" as string)) {
    if (!settings.live_writes || !settings.history_import)
      return {
        ...result,
        error: "Απαιτούνται ενεργές «Ζωντανές εγγραφές» και «Ιστορική εισαγωγή».",
      };
    const { data: prev } = await db
      .from("mail_sync_runs")
      .select("id, approved_at, report")
      .eq("mode", "history_preview")
      .not("approved_at", "is", null)
      .order("approved_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!prev || Date.now() - Date.parse(prev.approved_at) > PREVIEW_MAX_AGE_MS)
      return {
        ...result,
        error: "Χρειάζεται εγκεκριμένη προεπισκόπηση από τις τελευταίες 24 ώρες.",
      };
    approved = new Map((prev.report?.rows ?? []).map((r: PreviewRow) => [r.key, r.fingerprint]));
  }

  if (!(await claimLock(db, "admin", settings)))
    return { ...result, error: "Τρέχει ήδη άλλη εκτέλεση." };
  const { data: run } = await db
    .from("mail_sync_runs")
    .insert({ mode: opts.mode, trigger: "admin" })
    .select("id")
    .single();
  result.runId = run?.id ?? null;
  const started = Date.now();
  const budget = Math.min(Math.max(opts.budgetMs ?? DEFAULT_BUDGET_MS, 10_000), 120_000);
  let extra: Record<string, unknown> = {};
  try {
    const [op, lp, cp, tp] = await Promise.all([
      getDataSourceProperties(DATA_SOURCES.orders),
      getDataSourceProperties(DATA_SOURCES.log),
      getDataSourceProperties(DATA_SOURCES.customers),
      getDataSourceProperties(DATA_SOURCES.tasks),
    ]);
    const problems = [
      ...validateSchema(op, ORDERS_SCHEMA).map((p) => `Orders & Quotes: ${p}`),
      ...validateSchema(lp, LOG_SCHEMA).map((p) => `Communication Log: ${p}`),
      ...validateSchema(cp, CUSTOMERS_SCHEMA).map((p) => `Customers: ${p}`),
      ...validateSchema(tp, TASKS_SCHEMA).map((p) => `Tasks: ${p}`),
    ];
    if (problems.length) throw new Error(`Το Notion άλλαξε: ${problems.join("; ")}`);
    const statusOpts = new Set((op.Status?.select?.options ?? []).map((o: any) => o.name));

    const plan = await buildPlan(db, settings, password);
    for (const u of plan.units) {
      if (u.status && !statusOpts.has(u.status)) {
        u.action = "manual_review";
        u.reason = `Η κατάσταση «${u.status}» δεν υπάρχει στο Notion`;
      }
    }
    extra = {
      cutoff: settings.history_cutoff,
      staleDays: settings.history_stale_days,
      folders: plan.folders,
      submissions: plan.submissions.length,
      notionOrders: plan.notionPages,
      notionLogs: plan.logPages,
    };

    if (opts.mode === "history_preview") {
      result.rows = plan.units.map(previewRow);
      for (const r of result.rows) result.counts[r.action] = (result.counts[r.action] ?? 0) + 1;
      result.ok = true;
      return result;
    }

    const clientEmails = new Set(
      plan.units
        .filter((u) => u.status && CLIENT_STATUSES.includes(u.status) && u.customerEmail)
        .map((u) => u.customerEmail!),
    );
    const { go, changed } = importable(plan.units, approved!);
    // Requests first (they create the customer cards), history-only entries after.
    const queue = go
      .filter((u) => !opts.only || u.kind === opts.only)
      .sort((a, b) => Number(a.action === "log_only") - Number(b.action === "log_only"));
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    for (const u of changed)
      result.rows.push({
        ...previewRow(u),
        action: "manual_review",
        reason: "Άλλαξε μετά την προεπισκόπηση — νέα προεπισκόπηση",
      });
    const customers = new Map<string, string | null>();
    let processed = 0;
    for (const u of queue) {
      if (processed >= limit || Date.now() - started > budget - UNIT_RESERVE_MS) break;
      processed++;
      try {
        await importUnit(db, u, plan.byId, customers, clientEmails);
        result.rows.push({ ...previewRow(u), reason: `Καταχωρήθηκε · ${u.reason}` });
        result.counts[u.action] = (result.counts[u.action] ?? 0) + 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.rows.push({
          ...previewRow(u),
          action: "manual_review",
          reason: `Σφάλμα: ${msg.slice(0, 200)}`,
        });
        result.counts.error = (result.counts.error ?? 0) + 1;
        break; // keep order; the rest waits for the next run
      }
    }
    result.remaining = queue.length - processed + (result.counts.error ? 1 : 0);
    result.ok = !result.counts.error;
    return result;
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
          report: { rows: result.rows, remaining: result.remaining, ...extra },
        })
        .eq("id", result.runId);
    await releaseLock(db);
  }
}

/** Ledger row claim: the unique message_id prevents duplicates across runs and the live sync. */
async function claim(db: any, row: Record<string, unknown>) {
  const ins = await db
    .from("mail_sync_messages")
    .insert({ status: "processing", match_reason: HISTORY_TAG, ...row })
    .select("*")
    .single();
  if (!ins.error) return ins.data;
  if (ins.error.code !== "23505") throw new Error(ins.error.message);
  const { data } = await db
    .from("mail_sync_messages")
    .select("*")
    .eq("message_id", row.message_id)
    .single();
  return data;
}
const setRow = (db: any, id: string, patch: Record<string, unknown>) =>
  db.from("mail_sync_messages").update(patch).eq("id", id);

/** Find or create the customer card (only for real customer requests). */
async function customerFor(
  u: PlanUnit,
  cache: Map<string, string | null>,
  clientEmails: Set<string>,
  create: boolean,
): Promise<string | null> {
  const email = u.customerEmail;
  if (!email) return null;
  if (cache.has(email) && (cache.get(email) || !create)) return cache.get(email)!;
  let id = await findCustomerByEmail(email);
  if (!id && create) {
    const page = await createPage(
      DATA_SOURCES.customers,
      customerCreateProps({
        name: u.customerName,
        email,
        phone: u.customerPhone,
        source: u.kind === "website" ? "Website" : "Email",
        client: clientEmails.has(email),
      }),
    );
    id = page.id;
  }
  cache.set(email, id);
  return id;
}

async function importUnit(
  db: any,
  u: PlanUnit,
  byId: Map<string, Msg>,
  customers: Map<string, string | null>,
  clientEmails: Set<string>,
) {
  const own = PAPAKI.user;
  const isRequest = u.action === "new_record" || u.action === "attach";
  const flagged = u.action === "manual_review";
  const unitRow = await claim(db, {
    message_id: u.key,
    folder: u.kind === "website" ? "website" : "history",
    direction: u.kind === "website" ? "website" : "incoming",
    from_email: u.customerEmail,
    from_name: u.customerName,
    subject: u.subject.slice(0, 500),
    sent_at: u.firstDate,
    classification: "customer",
    action: u.action,
    thread_root: u.threadRoot,
  });
  const customerId = await customerFor(u, customers, clientEmails, isRequest || flagged);

  let pageId: string | null = unitRow.notion_order_page_id ?? u.target?.pageId ?? null;
  let record: string | null = unitRow.notion_order_record ?? u.target?.record ?? null;
  if (!pageId && u.action === "new_record") {
    const page = readOrderPage(
      await createPage(
        DATA_SOURCES.orders,
        orderCreateProps({
          subject: u.subject,
          source: u.kind === "website" ? "Website" : "Email",
          customerName: u.customerName,
          customerEmail: u.customerEmail!,
          customerPhone: u.customerPhone,
          receivedAt: u.firstDate,
          lastContact: u.lastDate,
          threadUrl: u.threadRoot ? mid(u.threadRoot) : null,
          websiteUrl: trackUrl(u.orderCode),
          nextAction:
            u.status === "Awaiting TOREO Reply" || u.status === "New"
              ? "Απάντηση στον πελάτη"
              : u.status === "Needs Review"
                ? "Έλεγχος αν το αίτημα είναι ακόμη ενεργό"
                : "Παρακολούθηση",
          status: u.status ?? undefined,
          customerPageId: customerId,
          internalNotes: `${HISTORY_TAG}: ${u.reason}`,
        }),
      ),
    );
    pageId = page.pageId;
    record = page.record;
    await setRow(db, unitRow.id, { notion_order_page_id: pageId, notion_order_record: record });
  } else if (pageId && u.action === "attach") {
    // Existing record: only fill an empty thread marker / customer link; status stays untouched.
    const existing = readExistingPage(await notionFetch(`/pages/${pageId}`));
    if (!existing.threadUrl && u.threadRoot)
      await updatePage(pageId, threadMarkerProps(mid(u.threadRoot)));
    await setRow(db, unitRow.id, { notion_order_page_id: pageId, notion_order_record: record });
  }
  if (isRequest && !pageId) throw new Error("Δεν βρέθηκε εγγραφή-στόχος");

  // Website request entry (once).
  if (u.kind === "website" && !unitRow.notion_log_page_id) {
    const log = await createPage(
      DATA_SOURCES.log,
      logCreateProps({
        activity: `Αίτημα από το site: ${u.subject}`,
        direction: "Incoming",
        channel: "Website",
        date: u.firstDate,
        contactEmail: u.customerEmail,
        contactName: u.customerName,
        summary:
          u.submissionIds.length > 1
            ? `${HISTORY_TAG} · ${u.submissionIds.length} ίδιες υποβολές συγχωνεύτηκαν.`
            : `${HISTORY_TAG} αιτήματος από το site.`,
        threadUrl: u.threadRoot ? mid(u.threadRoot) : null,
        messageUrl: trackUrl(u.orderCode),
        status: u.messages.some((m) => m.direction === "outgoing")
          ? "Replied"
          : u.status === "Needs Review"
            ? "Follow-up Needed"
            : "Needs Reply",
        relatedRecord: record,
        orderPageId: pageId,
        customerPageId: customerId,
      }),
    );
    await setRow(db, unitRow.id, { notion_log_page_id: log.id });
  }

  for (const m of u.messages) {
    if (m.done) continue;
    const msg = byId.get(m.messageId);
    if (!msg) throw new Error("Το μήνυμα δεν βρέθηκε ξανά στο mailbox");
    const outgoing = m.direction === "outgoing";
    const counterpart = outgoing ? (msg.to.find((a) => a.email !== own) ?? null) : msg.from;
    const row = await claim(db, {
      message_id: msg.messageId,
      folder: msg.folder,
      uid: msg.uid,
      direction: m.direction,
      in_reply_to: msg.inReplyTo,
      refs: msg.refs,
      thread_root: msg.root,
      from_email: msg.from?.email ?? null,
      from_name: msg.from?.name ?? null,
      to_emails: msg.to.map((a) => a.email),
      subject: msg.subject.slice(0, 500),
      sent_at: msg.date,
      snippet: msg.snippet,
      attachment_names: msg.attachments,
      classification: outgoing ? "outgoing" : "customer",
      action: u.action,
      notion_order_page_id: pageId,
      notion_order_record: record,
    });
    if (row.status === "synced") continue;
    if (!row.notion_log_page_id) {
      const label = outgoing ? "Email TOREO" : "Εισερχόμενο email";
      const log = await createPage(
        DATA_SOURCES.log,
        logCreateProps({
          activity: `${flagged ? "⚠ Έλεγχος — " : ""}${label}: ${msg.subject || "(χωρίς θέμα)"}`,
          direction: outgoing ? "Outgoing" : "Incoming",
          channel: "Email",
          date: msg.date,
          contactEmail: counterpart?.email ?? null,
          contactName: counterpart?.name ?? null,
          summary: [
            flagged || u.action === "log_only" ? `${HISTORY_TAG}: ${u.reason}` : "",
            cleanSnippet(msg.snippet, 300),
          ]
            .filter(Boolean)
            .join("\n"),
          threadUrl: mid(msg.root),
          messageUrl: mid(msg.messageId),
          status: m.logStatus,
          relatedRecord: record,
          orderPageId: pageId,
          customerPageId: customerId,
          attachments: msg.attachments,
        }),
      );
      await setRow(db, row.id, { notion_log_page_id: log.id });
    }
    await setRow(db, row.id, { status: "synced", error: null });
  }

  if (u.task && pageId) {
    const fresh = await db
      .from("mail_sync_messages")
      .select("action")
      .eq("id", unitRow.id)
      .single();
    if (fresh.data?.action !== "task_created") {
      await createPage(
        DATA_SOURCES.tasks,
        taskCreateProps({
          title: `Απάντηση σε ${u.customerName || u.customerEmail}: ${u.subject}`.slice(0, 200),
          source: u.kind === "website" ? "Website" : "Email",
          orderPageId: pageId,
          relatedRecord: record,
          notes: "Δημιουργήθηκε από την ιστορική εισαγωγή. Ορίστε υπεύθυνο και προθεσμία.",
        }),
      );
      await setRow(db, unitRow.id, { action: "task_created" });
    }
  }

  // Double website submissions point to the same record.
  for (const sid of u.submissionIds.slice(1)) {
    await db.from("mail_sync_messages").upsert(
      {
        message_id: `website:${sid}`,
        folder: "website",
        direction: "website",
        status: "synced",
        action: "duplicate",
        match_reason: HISTORY_TAG,
        notion_order_page_id: pageId,
        notion_order_record: record,
      },
      { onConflict: "message_id" },
    );
  }
  await setRow(db, unitRow.id, { status: "synced", error: null });
}

/** Admin approval of a preview (required before importing). */
export async function approvePreview(runId: string, actor: string) {
  const db = await admin();
  const { data, error } = await db
    .from("mail_sync_runs")
    .update({ approved_at: new Date().toISOString(), approved_by: actor })
    .eq("id", runId)
    .eq("mode", "history_preview")
    .eq("ok", true)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Η προεπισκόπηση δεν βρέθηκε ή απέτυχε.");
  return { ok: true };
}
