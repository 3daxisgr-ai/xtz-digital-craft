/* eslint-disable @typescript-eslint/no-explicit-any -- service-role client and ledger rows match the existing untyped admin-client pattern */
// Email (info@toreo.gr, Papaki) -> Notion Business OS sync. Server-only.
// Guarantees: mailbox opened read-only (EXAMINE + BODY.PEEK), nothing is sent, deleted or moved;
// dry runs write nothing except their own run report; checkpoints never skip a failed message.
import { ImapError, ImapSession, PAPAKI } from "./imap.server";
import { imapDate, type FetchRecord } from "./imap-parse";
import {
  classifyIncoming,
  cleanSnippet,
  decodeWords,
  mid,
  parseAddressList,
  parseHeaders,
  parseMessageIds,
  threadRoot,
  type Address,
  type Classification,
} from "./mime";
import {
  CUSTOMERS_SCHEMA,
  TASKS_SCHEMA,
  LOG_SCHEMA,
  ORDERS_SCHEMA,
  customerCreateProps,
  taskCreateProps,
  logCreateProps,
  orderCreateProps,
  orderUpdateProps,
  readOrderPage,
  validateSchema,
  type OrderPage,
} from "./notion-map";
import {
  DATA_SOURCES,
  createPage,
  findCustomerByEmail,
  findOrdersByEmail,
  findOrdersByThread,
  getDataSourceProperties,
  getOrder,
  updatePage,
} from "./notion.server";
import {
  decideIncoming,
  decideOutgoing,
  nextCheckpoint,
  pickEmailSubjectMatch,
  type Target,
} from "./plan";

import type { FolderReport, ReportItem } from "./types";
export type { FolderReport, ReportItem } from "./types";

export type Mode = "dry" | "live" | "probe";
export type Trigger = "admin" | "cron";

const RUN_BUDGET_MS = 22_000;
const LOCK_MS = 90_000;

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export interface Settings {
  live_writes: boolean;
  website_hook: boolean;
  max_per_folder: number;
  lookback_days: number;
  min_interval_seconds: number;
  lock_until: string | null;
  last_run_at: string | null;
  updated_by: string | null;
  updated_at: string;
  ignore_senders?: string[];
  internal_senders?: string[];
}

export async function getSettings(): Promise<Settings> {
  const db = await admin();
  const { data, error } = await db.from("mail_sync_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data as Settings;
}

export interface Msg {
  folder: string;
  uid: number;
  messageId: string;
  inReplyTo: string | null;
  refs: string[];
  root: string;
  from: Address | null;
  to: Address[];
  subject: string;
  date: string;
  snippet: string;
  attachments: string[];
  headers: Record<string, string>;
  replyTo: string | null;
  hdrOrderId: string | null;
  hdrSubmissionId: string | null;
}

export function toMsg(rec: FetchRecord, folder: string, uidvalidity: number | null): Msg {
  const headers = parseHeaders(rec.headerRaw ?? "");
  const messageId =
    parseMessageIds(headers["message-id"])[0] ??
    `<no-id.${folder}.${uidvalidity ?? 0}.${rec.uid}@toreo.local>`;
  const inReplyTo = parseMessageIds(headers["in-reply-to"])[0] ?? null;
  const refs = parseMessageIds(headers["references"]);
  const parsedDate =
    Date.parse(headers["date"] ?? "") || Date.parse(rec.internalDate ?? "") || Date.now();
  return {
    folder,
    uid: rec.uid!,
    messageId,
    inReplyTo,
    refs,
    root: threadRoot(refs, inReplyTo, messageId),
    from: parseAddressList(headers["from"])[0] ?? null,
    to: [...parseAddressList(headers["to"]), ...parseAddressList(headers["cc"])],
    subject: decodeWords(headers["subject"] ?? "").trim(),
    date: new Date(parsedDate).toISOString(),
    snippet: cleanSnippet(rec.preview),
    attachments: rec.attachmentNames.map((n) => decodeWords(n)).slice(0, 20),
    headers,
    replyTo: parseAddressList(headers["reply-to"])[0]?.email ?? null,
    hdrOrderId: (headers["x-toreo-order-id"] ?? "").trim().toUpperCase() || null,
    hdrSubmissionId: /^[0-9a-f-]{36}$/i.test((headers["x-toreo-submission-id"] ?? "").trim())
      ? headers["x-toreo-submission-id"].trim().toLowerCase()
      : null,
  };
}

/** Customer card for a requester: existing one by email, else a new Lead (never guessed fields). */
export async function ensureCustomer(
  email: string,
  name: string | null,
  source: "Email" | "Website",
  phone?: string | null,
): Promise<string> {
  const found = await findCustomerByEmail(email);
  if (found) return found;
  const page = await createPage(
    DATA_SOURCES.customers,
    customerCreateProps({ name, email, phone, source, client: false }),
  );
  return page.id;
}

/** "Reply to customer" task linked to the record (owner/due date left for TOREO to set). */
export async function createReplyTask(opts: {
  who: string;
  subject: string;
  source: "Email" | "Website";
  orderPageId: string;
  record: string | null;
}) {
  return createPage(
    DATA_SOURCES.tasks,
    taskCreateProps({
      title: `Απάντηση σε ${opts.who}: ${opts.subject}`.slice(0, 200),
      source: opts.source,
      orderPageId: opts.orderPageId,
      relatedRecord: opts.record,
      notes: "Ορίστε υπεύθυνο και προθεσμία.",
    }),
  );
}

export interface RunResult {
  ok: boolean;
  busy?: boolean;
  runId: string | null;
  mode: Mode;
  transport: string | null;
  folders: FolderReport[];
  items: ReportItem[];
  schemaProblems: string[];
  probe?: { folders: string[]; sentFolder: string | null };
  counts: Record<string, number>;
  error: string | null;
}

export function siteSender(): string | null {
  const raw = process.env.EMAIL_FROM ?? "";
  return parseAddressList(raw)[0]?.email ?? null;
}

export async function claimLock(db: any, trigger: Trigger, s: Settings): Promise<boolean> {
  const now = new Date();
  const iso = now.toISOString();
  let q = db
    .from("mail_sync_settings")
    .update({ lock_until: new Date(now.getTime() + LOCK_MS).toISOString(), last_run_at: iso })
    .eq("id", 1)
    .or(`lock_until.is.null,lock_until.lt.${iso}`);
  if (trigger === "cron") {
    const minAgo = new Date(now.getTime() - s.min_interval_seconds * 1000).toISOString();
    q = q.or(`last_run_at.is.null,last_run_at.lt.${minAgo}`);
  }
  const { data, error } = await q.select("id");
  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length === 1;
}

export async function releaseLock(db: any) {
  await db.from("mail_sync_settings").update({ lock_until: null }).eq("id", 1);
}

export async function runMailSync(opts: { mode: Mode; trigger: Trigger }): Promise<RunResult> {
  if (opts.mode !== "probe") {
    // One decision engine for every run: the canonical reconcile (one record per real request).
    const { reconcile } = await import("./canonical.server");
    const r = await reconcile({ apply: opts.mode === "live", trigger: opts.trigger });
    return {
      ok: r.ok,
      busy: r.busy,
      runId: r.runId,
      mode: opts.mode,
      transport: null,
      folders: [],
      items: [],
      schemaProblems: r.schemaProblems,
      counts: r.counts,
      error: r.error,
    };
  }
  const db = await admin();
  const settings = await getSettings();
  const result: RunResult = {
    ok: false,
    runId: null,
    mode: opts.mode,
    transport: null,
    folders: [],
    items: [],
    schemaProblems: [],
    counts: {},
    error: null,
  };
  if (opts.mode === "live" && !settings.live_writes) {
    result.error = "Οι ζωντανές εγγραφές είναι απενεργοποιημένες.";
    return result;
  }
  const password = process.env.PAPAKI_EMAIL_PASSWORD;
  if (!password) {
    result.error = "Ο κωδικός του email δεν είναι ρυθμισμένος.";
    return result;
  }
  if (!(await claimLock(db, opts.trigger, settings))) {
    result.busy = true;
    result.error = "Τρέχει ήδη άλλη εκτέλεση ή η προηγούμενη έγινε πολύ πρόσφατα.";
    return result;
  }

  const { data: run } = await db
    .from("mail_sync_runs")
    .insert({ mode: opts.mode, trigger: opts.trigger })
    .select("id")
    .single();
  result.runId = run?.id ?? null;
  const started = Date.now();
  let session: ImapSession | null = null;

  try {
    // Notion schema check first (read-only) — refuse to write into a database that changed.
    if (opts.mode !== "probe" || process.env.NOTION_API_KEY) {
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
    }

    session = await ImapSession.open(PAPAKI.host, PAPAKI.port);
    result.transport = session.transportKind;
    await session.login(PAPAKI.user, password);
    const list = await session.list();
    const sent =
      list.find((f) => f.flags.some((x) => x.toLowerCase() === "\\sent")) ??
      list.find((f) => /sent/i.test(f.name));
    const sentFolder = sent?.name ?? null;

    if (opts.mode === "probe") {
      result.probe = { folders: list.map((f) => f.name), sentFolder };
      for (const [kind, name] of [
        ["inbox", "INBOX"],
        ["sent", sentFolder],
      ] as const) {
        if (!name) continue;
        const ex = await session.examine(name);
        result.folders.push({
          folder: name,
          kind,
          exists: ex.exists,
          uidvalidity: ex.uidvalidity,
          checkpointBefore: 0,
          checkpointAfter: 0,
          initialized: false,
          pending: 0,
          taken: 0,
        });
      }
      result.ok = true;
      return result;
    }

    // Dry / live runs are handled by the canonical reconcile (see runMailSync).
    return result;
  } catch (e) {
    const msg = e instanceof ImapError ? e.message : e instanceof Error ? e.message : String(e);
    result.ok = false;
    result.error = msg.slice(0, 500);
    return result;
  } finally {
    if (session) await session.close().catch(() => {});
    for (const i of result.items) result.counts[i.action] = (result.counts[i.action] ?? 0) + 1;
    if (result.runId) {
      await db
        .from("mail_sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          ok: result.ok,
          counts: result.counts,
          error: result.error,
          report: {
            transport: result.transport,
            folders: result.folders,
            items: result.items,
            schemaProblems: result.schemaProblems,
            probe: result.probe ?? null,
          },
        })
        .eq("id", result.runId);
    }
    await releaseLock(db);
  }
}

/**
 * Website form -> Notion (only when the admin enabled it). Never throws.
 * Uses the canonical ledger: retries, double clicks and a concurrent mailbox run all resolve to the
 * same canonical request and the same Order ID (the website's own code when it has one).
 */
export async function syncWebsiteSubmission(input: {
  submissionId: string;
  name: string;
  email: string;
  phone?: string | null;
  service?: string | null;
  message?: string | null;
  orderCode?: string | null;
  orderId?: string | null;
  trackUrl?: string | null;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  try {
    const settings = await getSettings();
    if (!settings.website_hook) return { ok: true, skipped: true };
    const db = await admin();
    const { claimCanonical, claimNotionCreation, saveNotionPage } = await import("./canonical.server");
    const { findOrderByOrderId } = await import("./notion.server");
    const email = input.email.toLowerCase();
    const code = input.orderCode?.toUpperCase() ?? null;
    const canon = await claimCanonical(db, {
      keys: [`submission:${input.submissionId}`, ...(code ? [`order:${code}`] : [])],
      source: "Website",
      email,
      subject: input.service ?? "Αίτημα από το site",
      orderCode: code,
      orderId: input.orderId ?? null,
    });
    if (canon.conflict || !canon.request_id || !canon.order_code)
      return { ok: false, error: "Η υποβολή αντιστοιχεί σε περισσότερες εγγραφές — χειροκίνητος έλεγχος" };
    if (canon.notion_page_id) return { ok: true, skipped: true }; // retry / already created
    if (!(await claimNotionCreation(db, canon.request_id))) return { ok: true, skipped: true };
    const orderCode = canon.order_code;
    const existing = await findOrderByOrderId(orderCode);
    if (existing) {
      await saveNotionPage(db, canon.request_id, existing.id);
      return { ok: true, skipped: true };
    }
    const now = new Date().toISOString();
    const title = `${orderCode} — ${input.service ?? "Αίτημα από το site"}`;
    const trackUrl = input.trackUrl ?? `https://www.toreo.gr/track?code=${encodeURIComponent(orderCode)}`;
    const customerId = await ensureCustomer(email, input.name, "Website", input.phone ?? null);
    const page = readOrderPage(
      await createPage(
        DATA_SOURCES.orders,
        orderCreateProps({
          subject: title,
          source: "Website",
          customerName: input.name,
          customerEmail: email,
          customerPhone: input.phone ?? null,
          receivedAt: now,
          threadUrl: null,
          websiteUrl: trackUrl,
          nextAction: "Απάντηση στον πελάτη",
          status: "New",
          customerPageId: customerId,
          orderId: orderCode,
          replyState: "Needs Reply",
        }),
      ),
    );
    await saveNotionPage(db, canon.request_id, page.pageId);
    const key = `website:${input.submissionId}`;
    const ins = await db
      .from("mail_sync_messages")
      .insert({
        message_id: key,
        folder: "website",
        direction: "website",
        from_email: email,
        from_name: input.name,
        subject: `${input.service ?? "Αίτημα από το site"}`.slice(0, 500),
        sent_at: now,
        snippet: cleanSnippet(input.message),
        classification: "customer",
        status: "processing",
        notion_order_page_id: page.pageId,
        notion_order_record: orderCode,
      })
      .select("id, notion_log_page_id")
      .single();
    if (ins.error && ins.error.code !== "23505") throw new Error(ins.error.message);
    if (!ins.error) {
      const log = await createPage(
        DATA_SOURCES.log,
        logCreateProps({
          activity: `Αίτημα από το site: ${title}`,
          direction: "Incoming",
          channel: "Website",
          date: now,
          contactEmail: email,
          contactName: input.name,
          summary: cleanSnippet(input.message),
          threadUrl: null,
          messageUrl: trackUrl,
          status: "Needs Reply",
          relatedRecord: orderCode,
          orderPageId: page.pageId,
          customerPageId: customerId,
        }),
      );
      await createReplyTask({
        who: input.name || email,
        subject: title,
        source: "Website",
        orderPageId: page.pageId,
        record: orderCode,
      });
      await db
        .from("mail_sync_messages")
        .update({ notion_log_page_id: log.id, status: "synced" })
        .eq("id", ins.data.id);
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mail-sync] website submission -> Notion failed", msg.slice(0, 200));
    return { ok: false, error: msg };
  }
}
