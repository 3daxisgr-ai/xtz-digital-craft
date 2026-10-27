// Pure planning rules for the one-off historical import (website requests + mailbox) into Notion.
// No I/O here — everything is decided from plain inputs so it can be unit-tested and previewed.
import { matchesSenderList, mid, normalizeSubject, type Classification } from "./mime";

export const CLOSED = ["Delivered", "Lost / Cancelled"];
/** Statuses that mean the contact is a real client (not just a lead). */
export const CLIENT_STATUSES = [
  "Confirmed Order",
  "In Production",
  "Ready for Dispatch",
  "Delivered",
];
/** New records in these statuses get a "reply to customer" task (no owner/due date invented). */
export const TASK_STATUSES = ["Awaiting TOREO Reply", "New"];

/** Website order status (database) -> Notion "Status" option. Only existing Notion options. */
export const ORDER_STATUS_TO_NOTION: Record<string, string> = {
  quote_received: "New",
  engineering_review: "Preparing Quote",
  quote_sent: "Quote Sent",
  awaiting_approval: "Quote Sent",
  payment_received: "Confirmed Order",
  production: "In Production",
  quality_inspection: "In Production",
  packaging: "In Production",
  ready_for_shipping: "Ready for Dispatch",
  shipped: "Ready for Dispatch",
  delivered: "Delivered",
  completed: "Delivered",
  cancelled: "Lost / Cancelled",
  rejected: "Lost / Cancelled",
};

export interface HMsg {
  messageId: string;
  folder: "inbox" | "sent";
  inReplyTo: string | null;
  refs: string[];
  root: string;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[];
  subject: string;
  date: string;
  /** Incoming classification, or "outgoing" for the Sent folder. */
  cls: Classification | "outgoing";
}

export interface HSubmission {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  service: string | null;
  createdAt: string;
  orderCode: string | null;
  orderStatus: string | null;
  /** Hash of service + message, used only to spot double submissions. */
  contentKey: string;
}

export interface ExistingPage {
  pageId: string;
  record: string | null;
  title: string;
  status: string | null;
  customerEmail: string | null;
  threadUrl: string | null;
  websiteUrl: string | null;
}

export type UnitAction =
  | "new_record"
  | "attach"
  | "log_only"
  | "duplicate"
  | "skip"
  | "manual_review";
export type LogStatus = "Needs Reply" | "Replied" | "Follow-up Needed" | "Closed";

export interface UnitMessage {
  messageId: string;
  direction: "incoming" | "outgoing";
  date: string;
  logStatus: LogStatus;
  done: boolean;
}

export interface PlanUnit {
  key: string;
  kind: "thread" | "website";
  action: UnitAction;
  reason: string;
  /** Status for a NEW record. Existing records never change status. */
  status: string | null;
  target: { pageId: string; record: string | null } | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  subject: string;
  firstDate: string;
  lastDate: string;
  submissionId: string | null;
  /** All submission ids of this request (double submissions are merged). */
  submissionIds: string[];
  orderCode: string | null;
  threadRoot: string | null;
  messages: UnitMessage[];
  /** Create a "reply to customer" task for this new record. */
  task: boolean;
  fingerprint: string;
}

export interface PlanInput {
  messages: HMsg[];
  submissions: HSubmission[];
  pages: ExistingPage[];
  /** mid: links already present in the Communication Log. */
  loggedLinks: Set<string>;
  /** Ledger keys already finished (message ids, thread:<root>, website:<id>). */
  done: Set<string>;
  own: string;
  now: number;
  staleDays: number;
  /** TOREO staff/test addresses. */
  internal?: string[];
  /** Platform / marketing / solicitation senders. */
  ignore?: string[];
}

const DAY = 86_400_000;
const lc = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
export const domainOf = (e: string | null) => (e && e.includes("@") ? e.split("@")[1] : "—");

/** Union messages into threads via Message-ID / In-Reply-To / References. */
export function groupThreads(msgs: HMsg[]): HMsg[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => {
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const m of msgs) {
    union(m.messageId, m.messageId);
    for (const r of [m.inReplyTo, ...m.refs]) if (r) union(m.messageId, r);
  }
  const groups = new Map<string, HMsg[]>();
  for (const m of msgs) {
    const k = find(m.messageId);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(m);
  }
  return [...groups.values()].map((g) => g.sort((a, b) => a.date.localeCompare(b.date)));
}

/** Double submissions: same email + same content within 30 minutes are one request. */
export function mergeDuplicateSubmissions(
  subs: HSubmission[],
): { main: HSubmission; ids: string[] }[] {
  const sorted = [...subs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const out: { main: HSubmission; ids: string[]; last: number }[] = [];
  for (const s of sorted) {
    const t = Date.parse(s.createdAt);
    const hit = out.find(
      (g) =>
        lc(g.main.email) === lc(s.email) &&
        g.main.contentKey === s.contentKey &&
        t - g.last <= 30 * 60_000,
    );
    if (hit) {
      hit.ids.push(s.id);
      hit.last = t;
      // Prefer the copy linked to an order.
      if (!hit.main.orderCode && s.orderCode) hit.main = { ...s, id: hit.main.id };
    } else out.push({ main: s, ids: [s.id], last: t });
  }
  return out.map(({ main, ids }) => ({ main, ids }));
}

/** Final status of a NEW record, from the last relevant message (never auto-closed). */
export function finalThreadStatus(
  relevant: { direction: "incoming" | "outgoing"; date: string }[],
  now: number,
  staleDays: number,
): string {
  const last = relevant[relevant.length - 1];
  if (!last) return "Needs Review";
  if (now - Date.parse(last.date) > staleDays * DAY) return "Needs Review";
  return last.direction === "incoming" ? "Awaiting TOREO Reply" : "Replied";
}

/** Log status per message: answered customer emails are "Replied", the last unanswered "Needs Reply". */
export function logStatuses(
  msgs: { direction: "incoming" | "outgoing"; toCustomer: boolean }[],
): LogStatus[] {
  return msgs.map((m, i) => {
    if (m.direction === "outgoing") return m.toCustomer ? "Replied" : "Closed";
    const answered = msgs.slice(i + 1).some((n) => n.direction === "outgoing" && n.toCustomer);
    return answered ? "Replied" : "Needs Reply";
  });
}

/** Stable short hash (FNV-1a) — detects plan changes between preview and import. */
export function fingerprint(parts: (string | null)[]): string {
  let h = 0x811c9dc5;
  for (const ch of parts.map((p) => p ?? "∅").join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

interface Draft {
  key: string;
  kind: "thread" | "website";
  action: UnitAction;
  reason: string;
  target: { pageId: string; record: string | null } | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  subject: string;
  firstDate: string;
  sub: HSubmission | null;
  submissionIds: string[];
  threadRoot: string | null;
  msgs: HMsg[];
  /** Status from the website order (overrides the thread-derived status when meaningful). */
  mapped: string | null;
}

export function planHistory(input: PlanInput): PlanUnit[] {
  const own = lc(input.own);
  const internal = input.internal ?? [];
  const ignore = input.ignore ?? [];
  const isExternal = (e: string) =>
    lc(e) !== own && !matchesSenderList(e, internal) && !matchesSenderList(e, ignore);
  const isDone = (id: string) => input.done.has(id) || input.loggedLinks.has(mid(id));

  const pagesByEmail = new Map<string, ExistingPage[]>();
  for (const p of input.pages) {
    const e = lc(p.customerEmail);
    if (!e) continue;
    if (!pagesByEmail.has(e)) pagesByEmail.set(e, []);
    pagesByEmail.get(e)!.push(p);
  }
  const pageByThread = new Map<string, ExistingPage>();
  for (const p of input.pages) if (p.threadUrl) pageByThread.set(p.threadUrl, p);

  // Website requests (double submissions merged, internal/test senders skipped).
  const drafts: Draft[] = [];
  const skipped: Draft[] = [];
  const subDrafts = new Map<string, Draft>();
  const subByCode = new Map<string, Draft>();
  for (const { main: s, ids } of mergeDuplicateSubmissions(input.submissions)) {
    const d: Draft = {
      key: `website:${s.id}`,
      kind: "website",
      action: "new_record",
      reason: ids.length > 1 ? `Αίτημα site (${ids.length} ίδιες υποβολές → 1)` : "Αίτημα site",
      target: null,
      customerEmail: lc(s.email),
      customerName: s.name,
      customerPhone: s.phone ?? null,
      subject: `${s.orderCode ? s.orderCode + " — " : ""}${s.service ?? "Αίτημα από το site"}`,
      firstDate: s.createdAt,
      sub: s,
      submissionIds: ids,
      threadRoot: null,
      msgs: [],
      mapped: s.orderStatus ? (ORDER_STATUS_TO_NOTION[s.orderStatus] ?? null) : null,
    };
    if (matchesSenderList(s.email, internal) || lc(s.email) === own) {
      skipped.push({ ...d, action: "skip", reason: "Δοκιμή / εσωτερικός αποστολέας TOREO" });
      continue;
    }
    if (ids.some((id) => input.done.has(`website:${id}`))) {
      d.action = "duplicate";
      d.reason = "Έχει ήδη καταχωρηθεί";
    } else if (s.orderCode) {
      const code = s.orderCode.toUpperCase();
      const existing = input.pages.find(
        (p) =>
          p.title.toUpperCase().includes(code) ||
          (p.websiteUrl ?? "").toUpperCase().includes(encodeURIComponent(code)),
      );
      if (existing) {
        d.action = "attach";
        d.reason = `Υπάρχει ήδη ως ${existing.record ?? existing.title}`;
        d.target = { pageId: existing.pageId, record: existing.record };
      }
      subByCode.set(code, d);
    }
    subDrafts.set(s.id, d);
    drafts.push(d);
  }

  const outgoingOnly: { thread: HMsg[]; relevant: HMsg[]; customer: string }[] = [];

  for (const thread of groupThreads(input.messages)) {
    const first = thread[0];
    const root = first.root;
    const customerMsgs = thread.filter((m) => m.cls === "customer");
    const externalOut = thread.filter(
      (m) => m.cls === "outgoing" && m.toEmails.some((t) => isExternal(t)),
    );
    const base: Draft = {
      key: `thread:${root}`,
      kind: "thread",
      action: "new_record",
      reason: "Νέο νήμα πελάτη",
      target: null,
      customerEmail: null,
      customerName: customerMsgs[0]?.fromName ?? null,
      customerPhone: null,
      subject:
        first.subject.replace(/^\s*((re|fw|fwd|απ|σχετ|προωθ)\s*:\s*)+/i, "").trim() ||
        "(χωρίς θέμα)",
      firstDate: first.date,
      sub: null,
      submissionIds: [],
      threadRoot: root,
      msgs: [],
      mapped: null,
    };
    if (!customerMsgs.length && !externalOut.length) {
      skipped.push({
        ...base,
        action: "skip",
        reason: "Ειδοποιήσεις / newsletter / εσωτερικά ή αυτόματα email",
      });
      continue;
    }
    const relevant = thread.filter((m) => m.cls === "customer" || externalOut.includes(m));
    const customer = lc(
      customerMsgs[0]?.fromEmail ?? externalOut[0]?.toEmails.find((t) => isExternal(t)),
    );
    base.customerEmail = customer;
    base.msgs = relevant;

    // 1. Existing Notion record via thread marker.
    const byThread = thread
      .flatMap((m) => [m.messageId, m.inReplyTo, ...m.refs, m.root])
      .filter((x): x is string => !!x)
      .map((x) => pageByThread.get(mid(x)))
      .find(Boolean);
    if (byThread) {
      drafts.push({
        ...base,
        action: "attach",
        reason: `Ίδιο νήμα με ${byThread.record ?? byThread.title}`,
        target: { pageId: byThread.pageId, record: byThread.record },
      });
      continue;
    }
    // 2. Website order code in a subject, or 3. same email within ±1 day of exactly one request.
    const code = thread
      .map((m) => /\b([A-Z]{2,5}-(?:\d{4}-)?\d{3,6})\b/i.exec(m.subject)?.[1]?.toUpperCase())
      .find((c) => c && subByCode.has(c));
    let sub: Draft | undefined = code ? subByCode.get(code) : undefined;
    if (!sub && customer && customerMsgs.length) {
      const t0 = Date.parse(first.date);
      const near = [...subDrafts.values()].filter(
        (s) => s.customerEmail === customer && Math.abs(Date.parse(s.firstDate) - t0) <= DAY,
      );
      if (near.length === 1) sub = near[0];
      else if (near.length > 1) {
        drafts.push({
          ...base,
          action: "manual_review",
          reason: "Ταιριάζει με περισσότερα από ένα αιτήματα του site",
        });
        continue;
      }
    }
    if (sub) {
      sub.msgs.push(...relevant);
      sub.threadRoot = sub.threadRoot ?? root;
      continue;
    }
    if (!customerMsgs.length) {
      outgoingOnly.push({ thread, relevant, customer });
      continue;
    }
    // 4. Exactly one open existing Notion record for the same customer.
    const open = (pagesByEmail.get(customer) ?? []).filter((p) => !CLOSED.includes(p.status ?? ""));
    if (open.length === 1) {
      drafts.push({
        ...base,
        action: "attach",
        reason: `Ίδιος πελάτης με ανοιχτή εγγραφή ${open[0].record ?? open[0].title}`,
        target: { pageId: open[0].pageId, record: open[0].record },
      });
      continue;
    }
    if (open.length > 1) {
      drafts.push({
        ...base,
        action: "manual_review",
        reason: "Ο πελάτης έχει περισσότερες ανοιχτές εγγραφές",
      });
      continue;
    }
    drafts.push(base);
  }

  // TOREO-initiated threads: attach to the customer's only request, else keep as history only.
  for (const o of outgoingOnly) {
    const mine = drafts.filter(
      (d) =>
        d.customerEmail === o.customer && ["new_record", "attach", "duplicate"].includes(d.action),
    );
    if (mine.length === 1 && mine[0].action !== "duplicate") {
      mine[0].msgs.push(...o.relevant);
      continue;
    }
    drafts.push({
      key: `thread:${o.thread[0].root}`,
      kind: "thread",
      action: "log_only",
      reason: mine.length
        ? "Email της TOREO σε πελάτη με πολλά αιτήματα — μόνο στο ιστορικό, χρειάζεται σύνδεση"
        : "Email της TOREO χωρίς αίτημα πελάτη — μόνο στο ιστορικό",
      target: null,
      customerEmail: o.customer,
      customerName: null,
      customerPhone: null,
      subject: o.thread[0].subject || "(χωρίς θέμα)",
      firstDate: o.thread[0].date,
      sub: null,
      submissionIds: [],
      threadRoot: o.thread[0].root,
      msgs: o.relevant,
      mapped: null,
    });
  }

  const units: PlanUnit[] = [];
  for (const d of [...drafts, ...skipped]) units.push(finalize(d, input, isDone));
  return units.sort((a, b) => a.firstDate.localeCompare(b.firstDate));
}

function finalize(d: Draft, input: PlanInput, isDone: (id: string) => boolean): PlanUnit {
  const seen = new Set<string>();
  const msgs = d.msgs
    .filter((m) => (seen.has(m.messageId) ? false : (seen.add(m.messageId), true)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const customer = d.customerEmail;
  const dirs = [
    ...(d.sub ? [{ direction: "incoming" as const, toCustomer: false, date: d.firstDate }] : []),
    ...msgs.map((m) => ({
      direction: (m.cls === "outgoing" ? "outgoing" : "incoming") as "incoming" | "outgoing",
      toCustomer: m.cls === "outgoing" && m.toEmails.some((t) => lc(t) === customer),
      date: m.date,
    })),
  ];
  const ls = logStatuses(dirs);
  const off = d.sub ? 1 : 0;
  const messages: UnitMessage[] = msgs.map((m, i) => ({
    messageId: m.messageId,
    direction: dirs[i + off].direction,
    date: m.date,
    logStatus: d.action === "manual_review" ? "Follow-up Needed" : ls[i + off],
    done: isDone(m.messageId),
  }));
  let action = d.action;
  let reason = d.reason;
  if (
    (action === "new_record" || action === "log_only" || action === "manual_review") &&
    input.done.has(d.key)
  ) {
    action = "duplicate";
    reason = "Έχει ήδη καταχωρηθεί";
  } else if (
    d.kind === "thread" &&
    action !== "skip" &&
    messages.length &&
    messages.every((m) => m.done)
  ) {
    action = "duplicate";
    reason = "Υπάρχει ήδη στο Notion";
  } else if (action === "attach" && messages.length && messages.every((m) => m.done)) {
    action = "duplicate";
  }
  const derived = finalThreadStatus(dirs, input.now, input.staleDays);
  const status =
    action !== "new_record"
      ? null
      : d.mapped && d.mapped !== "New"
        ? d.mapped
        : msgs.length
          ? derived
          : derived === "Needs Review"
            ? "Needs Review"
            : (d.mapped ?? derived);
  const u = {
    key: d.key,
    kind: d.kind,
    action,
    reason,
    status,
    target: d.target,
    customerEmail: customer,
    customerName: d.customerName,
    customerPhone: d.customerPhone,
    subject: d.subject,
    firstDate: d.firstDate,
    lastDate: dirs.length ? dirs[dirs.length - 1].date : d.firstDate,
    submissionId: d.sub?.id ?? null,
    submissionIds: d.submissionIds,
    orderCode: d.sub?.orderCode ?? null,
    threadRoot: d.threadRoot,
    messages,
    task: action === "new_record" && !!status && TASK_STATUSES.includes(status),
  };
  return {
    ...u,
    fingerprint: fingerprint([
      u.key,
      u.action,
      u.status,
      u.target?.pageId ?? null,
      u.customerEmail,
      ...u.submissionIds,
      ...u.messages.map((m) => m.messageId).sort(),
    ]),
  };
}

/** Admin summary row stored in the preview report (no subjects, bodies or full addresses). */
export function previewRow(u: PlanUnit) {
  return {
    key: u.key,
    kind: u.kind,
    action: u.action,
    reason: u.reason,
    status: u.status,
    record: u.target?.record ?? u.orderCode ?? null,
    domain: domainOf(u.customerEmail),
    firstDate: u.firstDate,
    lastDate: u.lastDate,
    messages: u.messages.length,
    pendingMessages: u.messages.filter((m) => !m.done).length,
    task: u.task,
    fingerprint: u.fingerprint,
  };
}
export type PreviewRow = ReturnType<typeof previewRow>;

const IMPORTABLE: UnitAction[] = ["new_record", "attach", "log_only", "manual_review"];

/** Units that may be imported now: approved in the preview with an unchanged fingerprint. */
export function importable(
  units: PlanUnit[],
  approved: Map<string, string>,
): { go: PlanUnit[]; changed: PlanUnit[] } {
  const go: PlanUnit[] = [];
  const changed: PlanUnit[] = [];
  for (const u of units) {
    if (!IMPORTABLE.includes(u.action)) continue;
    if (approved.get(u.key) === u.fingerprint) go.push(u);
    else changed.push(u);
  }
  return { go, changed };
}
