/* eslint-disable @typescript-eslint/no-explicit-any -- service-role client rows and Notion JSON follow the existing untyped pattern */
// One-off historical import (website requests + info@toreo.gr) into the existing Notion databases.
// Preview: read-only everywhere (mailbox EXAMINE + BODY.PEEK, Notion queries, DB selects) and stores
// only a metadata report. Import: admin-triggered, gated by live_writes + history_import + an
// approved preview (<24h); writes only to Orders & Quotes / Communication Log; never sends email.
import { ImapSession, PAPAKI } from "./imap.server";
import { imapDate } from "./imap-parse";
import { classifyIncoming, cleanSnippet, mid } from "./mime";
import {
  LOG_SCHEMA,
  ORDERS_SCHEMA,
  logCreateProps,
  orderCreateProps,
  readExistingPage,
  readLogLink,
  readOrderPage,
  threadMarkerProps,
  validateSchema,
} from "./notion-map";
import {
  DATA_SOURCES,
  createPage,
  getDataSourceProperties,
  listAllPages,
  updatePage,
} from "./notion.server";
import {
  importable,
  planHistory,
  previewRow,
  type HMsg,
  type HSubmission,
  type PlanUnit,
  type PreviewRow,
} from "./history";
import { admin, claimLock, releaseLock, siteSender, toMsg, type Msg } from "./sync.server";

const RUN_BUDGET_MS = 20_000;
const UNIT_RESERVE_MS = 6_000;
const PREVIEW_MAX_AGE_MS = 24 * 3_600_000;

export interface HistoryResult {
  ok: boolean;
  runId: string | null;
  mode: "history_preview" | "history";
  counts: Record<string, number>;
  rows: PreviewRow[];
  remaining: number;
  error: string | null;
}

async function loadSubmissions(db: any): Promise<HSubmission[]> {
  const [subs, orders, intake] = await Promise.all([
    db.from("submissions").select("id, name, surname, email, service, created_at").order("created_at"),
    db.from("orders").select("id, order_code, customer_email, status, created_at"),
    db.from("request_intake").select("submission_id, order_id").not("submission_id", "is", null),
  ]);
  for (const r of [subs, orders, intake]) if (r.error) throw new Error(r.error.message);
  const byId = new Map<string, any>((orders.data ?? []).map((o: any) => [o.id, o]));
  const viaIntake = new Map<string, any>();
  for (const r of intake.data ?? []) if (r.order_id && byId.has(r.order_id)) viaIntake.set(r.submission_id, byId.get(r.order_id));
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
      service: s.service ?? null,
      createdAt: new Date(s.created_at).toISOString(),
      orderCode: o?.order_code ?? null,
      orderStatus: o?.status ?? null,
    };
  });
}

async function loadMailbox(cutoff: string, password: string) {
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

async function buildPlan(db: any, settings: any, password: string) {
  const own = PAPAKI.user;
  const sender = siteSender();
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
        : classifyIncoming({ headers: msg.headers, from: msg.from, ownAddress: own, siteSender: sender }),
  }));
  const ids = msgs.map((m) => m.messageId).concat(submissions.map((s) => `website:${s.id}`));
  const done = new Set<string>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await db
      .from("mail_sync_messages")
      .select("message_id")
      .in("message_id", ids.slice(i, i + 150))
      .in("status", ["synced", "skipped"]);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) done.add(r.message_id);
  }
  const units = planHistory({
    messages: msgs,
    submissions: submissions.filter((s) => Date.parse(s.createdAt) >= cutoffMs),
    pages: orderPages.map(readExistingPage),
    loggedLinks: new Set(logPages.map(readLogLink).filter((x): x is string => !!x)),
    done,
    own,
    now: Date.now(),
    staleDays: settings.history_stale_days,
  });
  const byId = new Map(mail.messages.map(({ msg }) => [msg.messageId, msg]));
  return { units, folders: mail.folders, byId, submissions, notionPages: orderPages.length, logPages: logPages.length };
}

export async function runHistory(opts: {
  mode: "history_preview" | "history";
  only?: "website" | "thread";
  limit?: number;
}): Promise<HistoryResult> {
  const db = await admin();
  const { data: settings, error: sErr } = await db.from("mail_sync_settings").select("*").eq("id", 1).single();
  if (sErr) throw new Error(sErr.message);
  const result: HistoryResult = { ok: false, runId: null, mode: opts.mode, counts: {}, rows: [], remaining: 0, error: null };
  const password = process.env.PAPAKI_EMAIL_PASSWORD;
  if (!password) return { ...result, error: "Ο κωδικός του email δεν είναι ρυθμισμένος." };

  let approved: Map<string, string> | null = null;
  if (opts.mode === "history") {
    if (!settings.live_writes || !settings.history_import)
      return { ...result, error: "Απαιτούνται ενεργές «Ζωντανές εγγραφές» και «Ιστορική εισαγωγή»." };
    const { data: prev } = await db
      .from("mail_sync_runs")
      .select("id, approved_at, report")
      .eq("mode", "history_preview")
      .not("approved_at", "is", null)
      .order("approved_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!prev || Date.now() - Date.parse(prev.approved_at) > PREVIEW_MAX_AGE_MS)
      return { ...result, error: "Χρειάζεται εγκεκριμένη προεπισκόπηση από τις τελευταίες 24 ώρες." };
    approved = new Map((prev.report?.rows ?? []).map((r: PreviewRow) => [r.key, r.fingerprint]));
  }

  if (!(await claimLock(db, "admin", settings))) return { ...result, error: "Τρέχει ήδη άλλη εκτέλεση." };
  const { data: run } = await db
    .from("mail_sync_runs")
    .insert({ mode: opts.mode, trigger: "admin" })
    .select("id")
    .single();
  result.runId = run?.id ?? null;
  const started = Date.now();
  let extra: Record<string, unknown> = {};
  try {
    const [op, lp] = await Promise.all([
      getDataSourceProperties(DATA_SOURCES.orders),
      getDataSourceProperties(DATA_SOURCES.log),
    ]);
    const problems = [...validateSchema(op, ORDERS_SCHEMA), ...validateSchema(lp, LOG_SCHEMA)];
    const statusOpts = new Set((op.Status?.select?.options ?? []).map((o: any) => o.name));
    const logOpts = new Set((lp.Status?.select?.options ?? []).map((o: any) => o.name));
    if (problems.length) throw new Error(`Το Notion άλλαξε: ${problems.join("; ")}`);

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

    const { go, changed } = importable(plan.units, approved!);
    let queue = go.filter((u) => !opts.only || u.kind === opts.only);
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
    for (const u of changed)
      result.rows.push({ ...previewRow(u), action: "manual_review", reason: "Άλλαξε μετά την προεπισκόπηση — νέα προεπισκόπηση" });
    let processed = 0;
    for (const u of queue) {
      if (processed >= limit || Date.now() - started > RUN_BUDGET_MS - UNIT_RESERVE_MS) break;
      try {
        await importUnit(db, u, plan.byId, logOpts);
        result.rows.push({ ...previewRow(u), reason: "Καταχωρήθηκε" });
        result.counts[u.action] = (result.counts[u.action] ?? 0) + 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.rows.push({ ...previewRow(u), action: "manual_review", reason: `Σφάλμα: ${msg.slice(0, 200)}` });
        result.counts.error = (result.counts.error ?? 0) + 1;
        processed++;
        break; // keep order; the rest waits for the next run
      }
      processed++;
    }
    queue = queue.slice(processed);
    result.remaining = queue.length;
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
  const ins = await db.from("mail_sync_messages").insert({ status: "processing", ...row }).select("*").single();
  if (!ins.error) return ins.data;
  if (ins.error.code !== "23505") throw new Error(ins.error.message);
  const { data } = await db.from("mail_sync_messages").select("*").eq("message_id", row.message_id).single();
  return data;
}

async function importUnit(db: any, u: PlanUnit, byId: Map<string, Msg>, logOpts: Set<unknown>) {
  const own = PAPAKI.user;
  let pageId = u.target?.pageId ?? null;
  let record = u.target?.record ?? null;

  let unitRow: any = null;
  if (u.kind === "website") {
    unitRow = await claim(db, {
      message_id: u.key,
      folder: "website",
      direction: "website",
      from_email: u.customerEmail,
      from_name: u.customerName,
      subject: u.subject.slice(0, 500),
      sent_at: u.firstDate,
      classification: "customer",
      action: u.action,
      match_reason: "Ιστορική εισαγωγή",
    });
    if (unitRow.notion_order_page_id) {
      pageId = unitRow.notion_order_page_id;
      record = unitRow.notion_order_record;
    }
  }

  if (!pageId && u.action === "new_record") {
    const trackUrl = u.orderCode ? `https://www.toreo.gr/track?code=${encodeURIComponent(u.orderCode)}` : null;
    const page = readOrderPage(
      await createPage(
        DATA_SOURCES.orders,
        orderCreateProps({
          subject: u.subject,
          source: u.kind === "website" ? "Website" : "Email",
          customerName: u.customerName,
          customerEmail: u.customerEmail!,
          receivedAt: u.firstDate,
          lastContact: u.lastDate,
          threadUrl: u.threadRoot ? mid(u.threadRoot) : null,
          websiteUrl: trackUrl,
          nextAction: u.status === "Awaiting TOREO Reply" ? "Απάντηση στον πελάτη" : "Έλεγχος ιστορικού αιτήματος",
          status: u.status ?? undefined,
        }),
      ),
    );
    pageId = page.pageId;
    record = page.record;
    if (unitRow)
      await db
        .from("mail_sync_messages")
        .update({ notion_order_page_id: pageId, notion_order_record: record })
        .eq("id", unitRow.id);
  } else if (pageId && u.action === "attach" && u.threadRoot) {
    // Only fills an empty thread marker; status and other fields stay untouched.
    const existing = await (await import("./notion.server")).notionFetch(`/pages/${pageId}`);
    if (!readExistingPage(existing).threadUrl) await updatePage(pageId, threadMarkerProps(mid(u.threadRoot)));
  }
  if (!pageId) throw new Error("Δεν βρέθηκε εγγραφή-στόχος");

  if (unitRow && !unitRow.notion_log_page_id) {
    const log = await createPage(
      DATA_SOURCES.log,
      logCreateProps({
        activity: `Αίτημα από το site: ${u.subject}`,
        direction: "Incoming",
        channel: "Website",
        date: u.firstDate,
        contactEmail: u.customerEmail,
        contactName: u.customerName,
        summary: "Ιστορική εισαγωγή αιτήματος από το site.",
        threadUrl: null,
        messageUrl: u.orderCode ? `https://www.toreo.gr/track?code=${encodeURIComponent(u.orderCode)}` : null,
        status: u.messages.some((m) => m.direction === "outgoing") ? "Replied" : u.status === "Needs Review" ? "Follow-up Needed" : "Needs Reply",
        relatedRecord: record,
      }),
    );
    await db.from("mail_sync_messages").update({ notion_log_page_id: log.id }).eq("id", unitRow.id);
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
      action: "history",
      match_reason: "Ιστορική εισαγωγή",
      notion_order_page_id: pageId,
      notion_order_record: record,
    });
    if (row.status === "synced") continue;
    if (!row.notion_log_page_id) {
      const status = logOpts.has(m.logStatus) ? m.logStatus : "Replied";
      const log = await createPage(
        DATA_SOURCES.log,
        logCreateProps({
          activity: `${outgoing ? "Απάντηση TOREO" : "Εισερχόμενο email"}: ${msg.subject || "(χωρίς θέμα)"}`,
          direction: outgoing ? "Outgoing" : "Incoming",
          channel: "Email",
          date: msg.date,
          contactEmail: counterpart?.email ?? null,
          contactName: counterpart?.name ?? null,
          summary: [cleanSnippet(msg.snippet), msg.attachments.length ? `Συνημμένα: ${msg.attachments.join(", ")}` : ""]
            .filter(Boolean)
            .join("\n"),
          threadUrl: mid(msg.root),
          messageUrl: mid(msg.messageId),
          status,
          relatedRecord: record,
        }),
      );
      await db.from("mail_sync_messages").update({ notion_log_page_id: log.id }).eq("id", row.id);
    }
    await db.from("mail_sync_messages").update({ status: "synced", error: null }).eq("id", row.id);
  }
  if (unitRow) await db.from("mail_sync_messages").update({ status: "synced", error: null }).eq("id", unitRow.id);
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
