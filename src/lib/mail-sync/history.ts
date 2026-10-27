// Pure planning rules for the one-off historical import (website requests + mailbox) into Notion.
// No I/O here — everything is decided from plain inputs so it can be unit-tested and previewed.
import { mid, normalizeSubject, type Classification } from "./mime";

export const CLOSED = ["Delivered", "Lost / Cancelled"];

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
  service: string | null;
  createdAt: string;
  orderCode: string | null;
  orderStatus: string | null;
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

export type UnitAction = "new_record" | "attach" | "duplicate" | "skip" | "manual_review";
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
  subject: string;
  firstDate: string;
  lastDate: string;
  submissionId: string | null;
  orderCode: string | null;
  threadRoot: string | null;
  messages: UnitMessage[];
  fingerprint: string;
}

export interface PlanInput {
  messages: HMsg[];
  submissions: HSubmission[];
  pages: ExistingPage[];
  /** mid: links already present in the Communication Log. */
  loggedLinks: Set<string>;
  /** Ledger keys already finished (message ids and website:<id>). */
  done: Set<string>;
  own: string;
  now: number;
  staleDays: number;
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

function finish(u: Omit<PlanUnit, "fingerprint">): PlanUnit {
  return {
    ...u,
    fingerprint: fingerprint([
      u.key,
      u.action,
      u.status,
      u.target?.pageId ?? null,
      ...u.messages.map((m) => m.messageId).sort(),
    ]),
  };
}

export function planHistory(input: PlanInput): PlanUnit[] {
  const own = lc(input.own);
  const pagesByEmail = new Map<string, ExistingPage[]>();
  for (const p of input.pages) {
    const e = lc(p.customerEmail);
    if (!e) continue;
    if (!pagesByEmail.has(e)) pagesByEmail.set(e, []);
    pagesByEmail.get(e)!.push(p);
  }
  const pageByThread = new Map<string, ExistingPage>();
  for (const p of input.pages) if (p.threadUrl) pageByThread.set(p.threadUrl, p);

  const subByCode = new Map<string, HSubmission>();
  for (const s of input.submissions) if (s.orderCode) subByCode.set(s.orderCode.toUpperCase(), s);

  /** Website submission already in Notion (by order code in title/link). */
  const pageForSubmission = (s: HSubmission): ExistingPage | null => {
    if (!s.orderCode) return null;
    const code = s.orderCode.toUpperCase();
    return (
      input.pages.find(
        (p) =>
          p.title.toUpperCase().includes(code) ||
          (p.websiteUrl ?? "").toUpperCase().includes(encodeURIComponent(code)),
      ) ?? null
    );
  };

  const units: PlanUnit[] = [];
  const threadsForSub = new Map<string, HMsg[][]>();

  for (const thread of groupThreads(input.messages)) {
    const customerMsgs = thread.filter((m) => m.cls === "customer");
    const outgoing = thread.filter((m) => m.cls === "outgoing");
    const externalOut = outgoing.filter((m) => m.toEmails.some((t) => lc(t) !== own));
    const first = thread[0];
    const root = first.root;
    const allDone = thread.every(
      (m) => input.done.has(m.messageId) || input.loggedLinks.has(mid(m.messageId)),
    );

    const base = {
      key: `thread:${root}`,
      kind: "thread" as const,
      status: null,
      target: null,
      customerName: null as string | null,
      subject: normalizeSubject(first.subject) || "(χωρίς θέμα)",
      firstDate: first.date,
      lastDate: thread[thread.length - 1].date,
      submissionId: null,
      orderCode: null,
      threadRoot: root,
    };

    if (!customerMsgs.length && !externalOut.length) {
      units.push(
        finish({
          ...base,
          action: "skip",
          reason: "Μόνο αυτόματα / newsletter / ειδοποιήσεις φόρμας",
          customerEmail: null,
          messages: [],
        }),
      );
      continue;
    }

    const customer = lc(
      customerMsgs[0]?.fromEmail ?? externalOut[0]?.toEmails.find((t) => lc(t) !== own),
    );
    base.customerName = customerMsgs[0]?.fromName ?? null;
    const relevant = thread.filter((m) => m.cls === "customer" || externalOut.includes(m));
    const dirs = relevant.map((m) => ({
      direction: (m.cls === "outgoing" ? "outgoing" : "incoming") as "incoming" | "outgoing",
      toCustomer: m.cls === "outgoing" && m.toEmails.some((t) => lc(t) === customer),
      date: m.date,
    }));
    const ls = logStatuses(dirs);
    const messages: UnitMessage[] = relevant.map((m, i) => ({
      messageId: m.messageId,
      direction: dirs[i].direction,
      date: m.date,
      logStatus: ls[i],
      done: input.done.has(m.messageId) || input.loggedLinks.has(mid(m.messageId)),
    }));

    if (allDone || messages.every((m) => m.done)) {
      units.push(
        finish({
          ...base,
          action: "duplicate",
          reason: "Υπάρχει ήδη στο Notion",
          customerEmail: customer,
          messages,
        }),
      );
      continue;
    }

    // 1. Existing Notion record via thread marker.
    const byThread = thread
      .flatMap((m) => [m.messageId, m.inReplyTo, ...m.refs, m.root])
      .filter((x): x is string => !!x)
      .map((x) => pageByThread.get(mid(x)))
      .find(Boolean);
    if (byThread) {
      units.push(
        finish({
          ...base,
          action: "attach",
          reason: `Ίδιο νήμα με ${byThread.record ?? byThread.title}`,
          target: { pageId: byThread.pageId, record: byThread.record },
          customerEmail: customer,
          messages,
        }),
      );
      continue;
    }

    // 2. Website order code in a subject -> merge into that submission.
    const code = thread
      .map((m) => /\b([A-Z]{2,5}-\d{3,6})\b/i.exec(m.subject)?.[1]?.toUpperCase())
      .find((c) => c && subByCode.has(c));
    let sub: HSubmission | undefined = code ? subByCode.get(code) : undefined;
    // 3. Same customer email, first message within ±1 day of exactly one submission.
    if (!sub && customer) {
      const t0 = Date.parse(first.date);
      const near = input.submissions.filter(
        (s) => lc(s.email) === customer && Math.abs(Date.parse(s.createdAt) - t0) <= DAY,
      );
      if (near.length === 1) sub = near[0];
      else if (near.length > 1) {
        units.push(
          finish({
            ...base,
            action: "manual_review",
            reason: "Ταιριάζει με περισσότερα από ένα αιτήματα του site",
            customerEmail: customer,
            messages,
          }),
        );
        continue;
      }
    }
    if (sub) {
      if (!threadsForSub.has(sub.id)) threadsForSub.set(sub.id, []);
      threadsForSub.get(sub.id)!.push(thread);
      continue;
    }

    // 4. Exactly one open Notion record for the same customer.
    const open = (pagesByEmail.get(customer) ?? []).filter((p) => !CLOSED.includes(p.status ?? ""));
    if (open.length === 1) {
      units.push(
        finish({
          ...base,
          action: "attach",
          reason: `Ίδιος πελάτης με ανοιχτή εγγραφή ${open[0].record ?? open[0].title}`,
          target: { pageId: open[0].pageId, record: open[0].record },
          customerEmail: customer,
          messages,
        }),
      );
      continue;
    }
    if (open.length > 1) {
      units.push(
        finish({
          ...base,
          action: "manual_review",
          reason: "Ο πελάτης έχει περισσότερες ανοιχτές εγγραφές",
          customerEmail: customer,
          messages,
        }),
      );
      continue;
    }
    if (!customerMsgs.length) {
      units.push(
        finish({
          ...base,
          action: "manual_review",
          reason: "Email της TOREO χωρίς αντίστοιχο αίτημα πελάτη",
          customerEmail: customer,
          messages,
        }),
      );
      continue;
    }
    units.push(
      finish({
        ...base,
        action: "new_record",
        reason: "Νέο νήμα πελάτη",
        status: finalThreadStatus(dirs, input.now, input.staleDays),
        customerEmail: customer,
        messages,
      }),
    );
  }

  for (const s of input.submissions) {
    const threads = threadsForSub.get(s.id) ?? [];
    const customer = lc(s.email);
    const msgs = threads
      .flat()
      .filter(
        (m) =>
          m.cls === "customer" || (m.cls === "outgoing" && m.toEmails.some((t) => lc(t) !== own)),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    const dirs = [
      { direction: "incoming" as const, toCustomer: false, date: s.createdAt },
      ...msgs.map((m) => ({
        direction: (m.cls === "outgoing" ? "outgoing" : "incoming") as "incoming" | "outgoing",
        toCustomer: m.cls === "outgoing" && m.toEmails.some((t) => lc(t) === customer),
        date: m.date,
      })),
    ];
    const ls = logStatuses(dirs);
    const key = `website:${s.id}`;
    const messages: UnitMessage[] = msgs.map((m, i) => ({
      messageId: m.messageId,
      direction: dirs[i + 1].direction,
      date: m.date,
      logStatus: ls[i + 1],
      done: input.done.has(m.messageId) || input.loggedLinks.has(mid(m.messageId)),
    }));
    const existing = pageForSubmission(s);
    const mapped = s.orderStatus ? (ORDER_STATUS_TO_NOTION[s.orderStatus] ?? null) : null;
    const derived = finalThreadStatus(dirs, input.now, input.staleDays);
    const status =
      mapped && mapped !== "New" ? mapped : msgs.length ? derived : (mapped ?? derived);
    const base = {
      key,
      kind: "website" as const,
      customerEmail: customer,
      customerName: s.name,
      subject: `${s.orderCode ? s.orderCode + " — " : ""}${s.service ?? "Αίτημα από το site"}`,
      firstDate: s.createdAt,
      lastDate: dirs[dirs.length - 1].date,
      submissionId: s.id,
      orderCode: s.orderCode,
      threadRoot: threads[0]?.[0]?.root ?? null,
      messages,
    };
    if (input.done.has(key)) {
      units.push(
        finish({
          ...base,
          action: "duplicate",
          reason: "Έχει ήδη καταχωρηθεί",
          status: null,
          target: null,
        }),
      );
    } else if (existing) {
      units.push(
        finish({
          ...base,
          action: messages.some((m) => !m.done) ? "attach" : "duplicate",
          reason: `Υπάρχει ήδη ως ${existing.record ?? existing.title}`,
          status: null,
          target: { pageId: existing.pageId, record: existing.record },
        }),
      );
    } else {
      units.push(
        finish({
          ...base,
          action: "new_record",
          reason: threads.length ? `Αίτημα site + ${msgs.length} email` : "Αίτημα site",
          status,
          target: null,
        }),
      );
    }
  }

  return units.sort((a, b) => a.firstDate.localeCompare(b.firstDate));
}

/** Customer-safe summary row stored in the preview report (no subjects, bodies or full addresses). */
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
    fingerprint: u.fingerprint,
  };
}
export type PreviewRow = ReturnType<typeof previewRow>;

/** Units that may be imported now: approved in the preview with an unchanged fingerprint. */
export function importable(
  units: PlanUnit[],
  approved: Map<string, string>,
): { go: PlanUnit[]; changed: PlanUnit[] } {
  const go: PlanUnit[] = [];
  const changed: PlanUnit[] = [];
  for (const u of units) {
    if (u.action !== "new_record" && u.action !== "attach") continue;
    if (approved.get(u.key) === u.fingerprint) go.push(u);
    else changed.push(u);
  }
  return { go, changed };
}
