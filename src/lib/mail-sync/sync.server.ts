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
  LOG_SCHEMA,
  ORDERS_SCHEMA,
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
  };
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
      const [op, lp] = await Promise.all([
        getDataSourceProperties(DATA_SOURCES.orders),
        getDataSourceProperties(DATA_SOURCES.log),
      ]);
      result.schemaProblems = [
        ...validateSchema(op, ORDERS_SCHEMA).map((p) => `Orders & Quotes: ${p}`),
        ...validateSchema(lp, LOG_SCHEMA).map((p) => `Communication Log: ${p}`),
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

    if (result.schemaProblems.length)
      throw new Error("Η δομή του Notion δεν ταιριάζει — δεν έγινε καμία εγγραφή.");

    // 1. Read new messages from both folders (read-only).
    const batches: { kind: "inbox" | "sent"; report: FolderReport; msgs: Msg[] }[] = [];
    for (const [kind, name] of [
      ["inbox", "INBOX"],
      ["sent", sentFolder],
    ] as const) {
      if (!name) continue;
      const ex = await session.examine(name);
      const { data: st } = await db
        .from("mail_sync_state")
        .select("*")
        .eq("folder", name)
        .maybeSingle();
      const initialized = !st || Number(st.uidvalidity) !== ex.uidvalidity;
      let uids: number[];
      let before: number;
      if (initialized) {
        const since = new Date(Date.now() - settings.lookback_days * 86_400_000);
        uids = (await session.uidSearch(`SINCE ${imapDate(since)}`)).sort((a, b) => a - b);
        before = uids.length ? uids[0] - 1 : Math.max(0, (ex.uidnext ?? 1) - 1);
      } else {
        before = Number(st.last_uid);
        uids = (await session.uidSearch(`UID ${before + 1}:*`))
          .filter((u) => u > before)
          .sort((a, b) => a - b);
      }
      const take = uids.slice(0, settings.max_per_folder);
      const recs = await session.uidFetch(take);
      const msgs = recs.map((r) => toMsg(r, name, ex.uidvalidity)).sort((a, b) => a.uid - b.uid);
      batches.push({
        kind,
        msgs,
        report: {
          folder: name,
          kind,
          exists: ex.exists,
          uidvalidity: ex.uidvalidity,
          checkpointBefore: before,
          checkpointAfter: before,
          initialized,
          pending: uids.length,
          taken: msgs.length,
        },
      });
    }
    await session.logout();
    session = null;

    // 2. Known messages from earlier live runs (dedupe + threading).
    const ids = new Set<string>();
    for (const b of batches)
      for (const m of b.msgs) [m.messageId, m.inReplyTo, ...m.refs].forEach((x) => x && ids.add(x));
    const known = new Map<string, any>();
    const idList = Array.from(ids);
    for (let i = 0; i < idList.length; i += 150) {
      const { data } = await db
        .from("mail_sync_messages")
        .select(
          "message_id, direction, status, notion_order_page_id, notion_order_record, notion_log_page_id",
        )
        .in("message_id", idList.slice(i, i + 150));
      for (const r of data ?? []) known.set(r.message_id, r);
    }

    const own = PAPAKI.user;
    const sender = siteSender();
    const batchTargets = new Map<string, { target: Target | null; pendingNew: string | null }>();
    const pendingInfo = new Map<string, { email: string; subject: string }>();
    const emailCache = new Map<string, OrderPage[]>();
    const ordersFor = async (email: string) => {
      if (!emailCache.has(email)) emailCache.set(email, await findOrdersByEmail(email));
      return emailCache.get(email)!;
    };
    const live = opts.mode === "live";

    const threadTarget = async (
      m: Msg,
      incomingOnly: boolean,
    ): Promise<{ target: Target | null; pendingNew: string | null }> => {
      const cands = [m.inReplyTo, ...[...m.refs].reverse()].filter((x): x is string => !!x);
      for (const c of cands) {
        const k = known.get(c);
        if (k?.notion_order_page_id && (!incomingOnly || k.direction !== "outgoing")) {
          const page = await getOrder(k.notion_order_page_id);
          return { target: { ...page, via: "thread_db" }, pendingNew: null };
        }
      }
      for (const c of cands) {
        const b = batchTargets.get(c);
        if (b) return b;
      }
      if (cands.length) {
        const hits = await findOrdersByThread([...cands, m.root].map(mid));
        if (hits[0]) return { target: { ...hits[0], via: "thread_notion" }, pendingNew: null };
      }
      return { target: null, pendingNew: null };
    };

    // Claim (or resume) the ledger row for a message — the unique message_id prevents duplicates.
    const claimRow = async (
      m: Msg,
      direction: "incoming" | "outgoing",
      extra: Record<string, unknown>,
    ) => {
      const row = {
        message_id: m.messageId,
        folder: m.folder,
        uid: m.uid,
        direction,
        status: "processing",
        ...extra,
      };
      const ins = await db.from("mail_sync_messages").insert(row).select("*").single();
      if (!ins.error) return ins.data;
      if (ins.error.code !== "23505") throw new Error(ins.error.message);
      const { data } = await db
        .from("mail_sync_messages")
        .select("*")
        .eq("message_id", m.messageId)
        .single();
      return data;
    };
    const fullFields = (m: Msg) => ({
      in_reply_to: m.inReplyTo,
      refs: m.refs,
      thread_root: m.root,
      from_email: m.from?.email ?? null,
      from_name: m.from?.name ?? null,
      to_emails: m.to.map((a) => a.email),
      subject: m.subject.slice(0, 500),
      sent_at: m.date,
      snippet: m.snippet,
      attachment_names: m.attachments,
    });
    const setRow = (id: string, patch: Record<string, unknown>) =>
      db.from("mail_sync_messages").update(patch).eq("id", id);

    for (const b of batches) {
      const outcomes: { uid: number; ok: boolean }[] = [];
      for (const m of b.msgs) {
        if (Date.now() - started > RUN_BUDGET_MS) break;
        const base: ReportItem = {
          folder: b.kind,
          uid: m.uid,
          date: m.date,
          from: m.from?.email ?? null,
          to: m.to[0]?.email ?? null,
          subject: m.subject,
          classification: "customer",
          action: "",
          reason: "",
          target: null,
          setStatus: null,
          ok: true,
        };
        const done = known.get(m.messageId);
        if (done && ["synced", "skipped", "manual_review"].includes(done.status)) {
          result.items.push({
            ...base,
            action: "already_done",
            reason: "Έχει ήδη καταχωρηθεί (ίδιο Message-ID)",
          });
          outcomes.push({ uid: m.uid, ok: true });
          continue;
        }
        try {
          if (b.kind === "inbox") {
            const cls = classifyIncoming({
              headers: m.headers,
              from: m.from,
              ownAddress: own,
              siteSender: sender,
            });
            base.classification = cls;
            if (cls !== "customer") {
              const why: Record<string, string> = {
                own: "Μήνυμα από το info@toreo.gr",
                site_notification: "Ειδοποίηση φόρμας του site (καταγράφεται από τη φόρμα)",
                auto: "Αυτόματο μήνυμα",
                bulk: "Newsletter / μαζική αποστολή",
              };
              result.items.push({ ...base, action: "skip", reason: why[cls] ?? cls });
              if (live) {
                await db.from("mail_sync_messages").upsert(
                  {
                    message_id: m.messageId,
                    folder: m.folder,
                    uid: m.uid,
                    direction: "incoming",
                    classification: cls,
                    status: "skipped",
                    action: "skip",
                  },
                  { onConflict: "message_id" },
                );
              }
              outcomes.push({ uid: m.uid, ok: true });
              continue;
            }
            const found = await threadTarget(m, false);
            let target = found.target;
            const pendingNew = found.pendingNew;
            if (!target && !pendingNew && m.from) {
              const hit = pickEmailSubjectMatch(await ordersFor(m.from.email), m.subject);
              if (hit) target = { ...hit, via: "email_subject" };
            }
            const d = decideIncoming(target, pendingNew);
            const item: ReportItem = {
              ...base,
              action: d.action,
              reason: d.reason,
              setStatus: d.setStatus,
              target: target
                ? { record: target.record, title: target.title, status: target.status }
                : null,
            };
            if (!live) {
              result.items.push(item);
              batchTargets.set(
                m.messageId,
                target
                  ? { target, pendingNew: null }
                  : { target: null, pendingNew: pendingNew ?? m.messageId },
              );
              if (!target && !pendingNew && m.from)
                pendingInfo.set(m.messageId, { email: m.from.email, subject: m.subject });
              outcomes.push({ uid: m.uid, ok: true });
              continue;
            }
            const row = await claimRow(m, "incoming", {
              ...fullFields(m),
              classification: cls,
              action: d.action,
              match_reason: d.reason,
            });
            let page: OrderPage | null = target;
            if (!page && row.notion_order_page_id) page = await getOrder(row.notion_order_page_id);
            if (!page) {
              const created = await createPage(
                DATA_SOURCES.orders,
                orderCreateProps({
                  subject: m.subject || `Email από ${m.from?.name ?? m.from?.email}`,
                  source: "Email",
                  customerName: m.from?.name ?? null,
                  customerEmail: m.from!.email,
                  receivedAt: m.date,
                  threadUrl: mid(m.root),
                  nextAction: d.nextAction ?? "Απάντηση στον πελάτη",
                }),
              );
              page = readOrderPage(created);
              await setRow(row.id, {
                notion_order_page_id: page.pageId,
                notion_order_record: page.record,
              });
            } else {
              await updatePage(
                page.pageId,
                orderUpdateProps({
                  status: d.setStatus,
                  lastContact: m.date,
                  nextAction: d.nextAction,
                }),
              );
              await setRow(row.id, {
                notion_order_page_id: page.pageId,
                notion_order_record: page.record,
              });
            }
            if (!row.notion_log_page_id) {
              const log = await createPage(
                DATA_SOURCES.log,
                logCreateProps({
                  activity: `Εισερχόμενο email: ${m.subject || "(χωρίς θέμα)"}`,
                  direction: "Incoming",
                  channel: "Email",
                  date: m.date,
                  contactEmail: m.from?.email ?? null,
                  contactName: m.from?.name ?? null,
                  summary: [
                    m.snippet,
                    m.attachments.length ? `Συνημμένα: ${m.attachments.join(", ")}` : "",
                  ]
                    .filter(Boolean)
                    .join("\n"),
                  threadUrl: mid(m.root),
                  messageUrl: mid(m.messageId),
                  status: "Needs Reply",
                  relatedRecord: page.record,
                }),
              );
              await setRow(row.id, { notion_log_page_id: log.id });
            }
            await setRow(row.id, { status: "synced", error: null });
            const t: Target = { ...page, via: target?.via ?? "batch" };
            batchTargets.set(m.messageId, { target: t, pendingNew: null });
            known.set(m.messageId, {
              message_id: m.messageId,
              direction: "incoming",
              status: "synced",
              notion_order_page_id: page.pageId,
            });
            result.items.push({
              ...item,
              target: { record: page.record, title: page.title, status: page.status },
            });
            outcomes.push({ uid: m.uid, ok: true });
          } else {
            base.classification = "outgoing";
            const recipients = m.to.filter((a) => a.email !== own);
            if (!recipients.length) {
              result.items.push({ ...base, action: "skip", reason: "Χωρίς εξωτερικό παραλήπτη" });
              if (live) {
                await db.from("mail_sync_messages").upsert(
                  {
                    message_id: m.messageId,
                    folder: m.folder,
                    uid: m.uid,
                    direction: "outgoing",
                    classification: "own",
                    status: "skipped",
                    action: "skip",
                  },
                  { onConflict: "message_id" },
                );
              }
              outcomes.push({ uid: m.uid, ok: true });
              continue;
            }
            const isReply = !!(m.inReplyTo || m.refs.length);
            const found = await threadTarget(m, true);
            let target = found.target;
            // Dry-run only: the original is a record that would be created earlier in this run.
            if (!target && found.pendingNew) {
              const p = pendingInfo.get(found.pendingNew);
              target = {
                pageId: "(νέα εγγραφή)",
                record: null,
                title: p?.subject ?? "(νέα εγγραφή)",
                status: "Awaiting TOREO Reply",
                customerEmail: p?.email ?? null,
                via: "batch",
              };
            }
            let hint: OrderPage | null = null;
            if (!target) {
              const pages = await ordersFor(recipients[0].email);
              hint = pages.find((p) => p.status === "Awaiting TOREO Reply") ?? null;
            }
            const d = decideOutgoing(
              target,
              isReply,
              hint,
              recipients.map((r) => r.email),
            );
            const item: ReportItem = {
              ...base,
              to: recipients.map((r) => r.email).join(", "),
              action: d.action,
              reason: d.reason,
              setStatus: d.setStatus,
              target: target
                ? { record: target.record, title: target.title, status: target.status }
                : null,
            };
            if (!live) {
              result.items.push(item);
              outcomes.push({ uid: m.uid, ok: true });
              continue;
            }
            const row = await claimRow(m, "outgoing", {
              ...fullFields(m),
              classification: "outgoing",
              action: d.action,
              match_reason: d.reason,
              notion_order_page_id: target?.pageId ?? null,
              notion_order_record: target?.record ?? null,
            });
            if (target && (d.action === "mark_replied" || d.action === "log_only")) {
              await updatePage(
                target.pageId,
                orderUpdateProps({ status: d.setStatus, lastContact: m.date }),
              );
            }
            if (!row.notion_log_page_id) {
              const manual = d.action === "manual_review";
              const forward = d.action === "forward_logged";
              const log = await createPage(
                DATA_SOURCES.log,
                logCreateProps({
                  activity: `${manual ? "⚠ Έλεγχος — " : ""}${forward ? "Προώθηση TOREO" : "Απάντηση TOREO"}: ${m.subject || "(χωρίς θέμα)"}`,
                  direction: "Outgoing",
                  channel: "Email",
                  date: m.date,
                  contactEmail: recipients[0].email,
                  contactName: recipients[0].name,
                  summary:
                    manual || forward
                      ? `${manual ? "Χειροκίνητος έλεγχος: " : ""}${d.reason}\n${m.snippet}`
                      : m.snippet,
                  threadUrl: mid(m.root),
                  messageUrl: mid(m.messageId),
                  status: manual || forward ? "Follow-up Needed" : "Replied",
                  relatedRecord: target?.record ?? null,
                }),
              );
              await setRow(row.id, { notion_log_page_id: log.id });
            }
            await setRow(row.id, {
              status: d.action === "manual_review" ? "manual_review" : "synced",
              error: null,
            });
            result.items.push(item);
            outcomes.push({ uid: m.uid, ok: true });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          result.items.push({
            ...base,
            action: base.action || "error",
            reason: "Σφάλμα — θα ξαναδοκιμαστεί",
            ok: false,
            error: msg.slice(0, 300),
          });
          outcomes.push({ uid: m.uid, ok: false });
          if (live) {
            await db
              .from("mail_sync_messages")
              .update({ status: "failed", error: msg.slice(0, 500) })
              .eq("message_id", m.messageId)
              .neq("status", "synced");
          }
          break; // keep order: later messages wait for the next run
        }
      }
      b.report.checkpointAfter = nextCheckpoint(b.report.checkpointBefore, outcomes);
      if (
        live &&
        (b.report.checkpointAfter !== Number(b.report.checkpointBefore) || b.report.initialized)
      ) {
        await db.from("mail_sync_state").upsert(
          {
            folder: b.report.folder,
            uidvalidity: b.report.uidvalidity,
            last_uid: b.report.checkpointAfter,
          },
          { onConflict: "folder" },
        );
      }
      result.folders.push(b.report);
    }

    result.ok = result.items.every((i) => i.ok);
    if (!result.ok) result.error = "Ορισμένα μηνύματα απέτυχαν και θα ξαναδοκιμαστούν.";
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

/** Website form -> Notion (only when the admin enabled it). Never throws. */
export async function syncWebsiteSubmission(input: {
  submissionId: string;
  name: string;
  email: string;
  phone?: string | null;
  service?: string | null;
  message?: string | null;
  orderCode?: string | null;
  trackUrl?: string | null;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  try {
    const settings = await getSettings();
    if (!settings.website_hook) return { ok: true, skipped: true };
    const db = await admin();
    const key = `website:${input.submissionId}`;
    const ins = await db
      .from("mail_sync_messages")
      .insert({
        message_id: key,
        folder: "website",
        direction: "website",
        from_email: input.email.toLowerCase(),
        from_name: input.name,
        subject: `${input.service ?? "Αίτημα από το site"}`.slice(0, 500),
        sent_at: new Date().toISOString(),
        snippet: cleanSnippet(input.message),
        classification: "customer",
        status: "processing",
      })
      .select("*")
      .single();
    if (ins.error)
      return {
        ok: ins.error.code === "23505",
        skipped: true,
        error: ins.error.code === "23505" ? undefined : ins.error.message,
      };
    const now = new Date().toISOString();
    const title = `${input.orderCode ? input.orderCode + " — " : ""}${input.service ?? "Αίτημα από το site"}`;
    const page = readOrderPage(
      await createPage(
        DATA_SOURCES.orders,
        orderCreateProps({
          subject: title,
          source: "Website",
          customerName: input.name,
          customerEmail: input.email.toLowerCase(),
          customerPhone: input.phone ?? null,
          receivedAt: now,
          threadUrl: null,
          websiteUrl: input.trackUrl ?? null,
          nextAction: "Απάντηση στον πελάτη",
        }),
      ),
    );
    await db
      .from("mail_sync_messages")
      .update({ notion_order_page_id: page.pageId, notion_order_record: page.record })
      .eq("id", ins.data.id);
    const log = await createPage(
      DATA_SOURCES.log,
      logCreateProps({
        activity: `Αίτημα από το site: ${title}`,
        direction: "Incoming",
        channel: "Website",
        date: now,
        contactEmail: input.email.toLowerCase(),
        contactName: input.name,
        summary: cleanSnippet(input.message),
        threadUrl: null,
        messageUrl: input.trackUrl ?? null,
        status: "Needs Reply",
        relatedRecord: page.record,
      }),
    );
    await db
      .from("mail_sync_messages")
      .update({ notion_log_page_id: log.id, status: "synced" })
      .eq("id", ins.data.id);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mail-sync] website submission -> Notion failed", msg);
    try {
      const db = await admin();
      await db
        .from("mail_sync_messages")
        .update({ status: "failed", error: msg.slice(0, 500) })
        .eq("message_id", `website:${input.submissionId}`);
    } catch {
      /* ignore */
    }
    return { ok: false, error: msg };
  }
}
