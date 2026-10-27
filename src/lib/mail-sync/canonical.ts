// Pure rules for "one canonical record per real request" across the website form, the website's
// notification email, customer emails and TOREO replies (INBOX + Sent). No I/O; unit-tested.
//
// Match order for every incoming item (first hit wins):
//   0. the message is already attached to a request (stable, never re-matched)
//   1. stable website submission id (X-TOREO-Submission-ID / notification ↔ submission)
//   2. explicit TOREO Order ID (TR-YYYY-NNNN) in the subject or X-TOREO-Order-ID
//   3. email thread (Message-ID / In-Reply-To / References)
//   4. exact customer email + same normalized subject within SUBJECT_WINDOW_DAYS
//   5. the customer's only open request active around that date
// Anything ambiguous goes to review — never auto-merged and never a second record.
import { matchesSenderList, normalizeSubject, type Classification } from "./mime";

const DAY = 86_400_000;
export const SUBJECT_WINDOW_DAYS = 30;
export const NOTIFICATION_WINDOW_MS = 15 * 60_000;
export const DUPLICATE_WINDOW_DAYS = 14;
/** An email this close to a request, from the same customer, is about that request. */
export const SAME_REQUEST_WINDOW_MS = DAY;
export const CLOSED_STATUSES = ["Delivered", "Lost / Cancelled"];
/** Pipeline statuses that only describe "who has the ball"; the reply engine may move these. */
export const REPLY_STATUSES = [
  "New",
  "Needs Review",
  "Awaiting TOREO Reply",
  "Replied",
  "Awaiting Customer",
];
export const OPEN_TASK = ["Not Started", "In Progress", "Waiting"];
export const AUTO_NEXT_ACTIONS = [
  "Απάντηση στον πελάτη",
  "Νέο email πελάτη — χρειάζεται απάντηση",
  "Αναμονή απάντησης πελάτη",
  "Έλεγχος αν το αίτημα είναι ακόμη ενεργό",
  "Παρακολούθηση",
];

export type ReplyState = "Needs Reply" | "Replied";
export type LogStatus = "Needs Reply" | "Replied" | "Follow-up Needed" | "Closed";

const lc = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const ORDER_CODE_RE = /\bTR-\d{4}-\d{4,6}\b/gi;

/** TOREO Order IDs (TR-YYYY-NNNN) mentioned in a text, upper-cased and unique. */
export function orderCodesIn(...texts: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const t of texts)
    for (const m of (t ?? "").matchAll(ORDER_CODE_RE)) out.add(m[0].toUpperCase());
  return [...out];
}

/** Subject for comparison: no Re/Fwd prefixes, no order codes, no punctuation noise. */
export function subjectKey(s: string | null | undefined): string {
  return normalizeSubject((s ?? "").replace(ORDER_CODE_RE, " "))
    .replace(/[\s\-–—|:·]+/g, " ")
    .trim();
}

export interface CMsg {
  messageId: string;
  folder: "inbox" | "sent";
  inReplyTo: string | null;
  refs: string[];
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[];
  replyTo: string | null;
  subject: string;
  date: string;
  /** Incoming classification, or "outgoing" for the Sent folder. */
  cls: Classification | "outgoing";
  hdrOrderId?: string | null;
  hdrSubmissionId?: string | null;
}

export interface CSubmission {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  service: string | null;
  createdAt: string;
  /** Stable website Order ID (orders.order_code), when the site created one. */
  orderCode: string | null;
  orderStatus: string | null;
  orderId?: string | null;
  /** Hash of service + message, used only to merge accidental double submissions. */
  contentKey: string;
}

export interface CRequest {
  /** Notion page id for existing records. */
  id: string;
  orderCode: string | null;
  customerEmail: string | null;
  subject: string;
  status: string | null;
  receivedAt: string;
  lastActivity: string;
  duplicateCheck?: string | null;
}

export interface CanonInput {
  submissions: CSubmission[];
  messages: CMsg[];
  requests: CRequest[];
  /** Identity key -> existing request id (canonical keys + earlier sync ledger). */
  keys: Map<string, string>;
  /** Keys whose record the owner removed in Notion: never recreated. */
  removedKeys: Set<string>;
  /** Messages an earlier run left for human review: only strong evidence (rules 1–3) may attach them. */
  priorReview?: Set<string>;
  own: string;
  internal?: string[];
  now: number;
  staleDays: number;
  /** Website order status (database) -> Notion status. */
  statusMap?: Record<string, string>;
}

export type Role = "website" | "customer" | "reply" | "forward" | "notification";

export interface Attachment {
  /** Message-ID, or website:<submissionId> for the form entry. */
  key: string;
  requestId: string;
  role: Role;
  date: string;
  via: string;
  logStatus: LogStatus | null;
}

export interface ReviewItem {
  key: string;
  /** "match": which request?  "supplier": reply to a TOREO-initiated email (likely supplier). */
  queue: "match" | "supplier";
  kind: "incoming" | "outgoing" | "website";
  date: string;
  email: string | null;
  reason: string;
  candidates: string[];
}

export interface RequestPlan {
  id: string;
  isNew: boolean;
  source: "Website" | "Email";
  orderCode: string | null;
  orderId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  subject: string;
  receivedAt: string;
  submissionIds: string[];
  /** All identity keys this request should own. */
  keys: string[];
  replyState: ReplyState | null;
  lastCustomerAt: string | null;
  lastReplyAt: string | null;
  lastActivity: string;
  /** New status for an existing record (null = unchanged); initial status for a new one. */
  status: string | null;
  duplicates: string[];
}

export interface CanonPlan {
  requests: RequestPlan[];
  attachments: Attachment[];
  review: ReviewItem[];
  skipped: { key: string; reason: string }[];
}

/** Accidental double submissions: same email + same content within 30 minutes are one request. */
export function mergeDoubleSubmissions(
  subs: CSubmission[],
): { main: CSubmission; ids: string[] }[] {
  const sorted = [...subs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const out: { main: CSubmission; ids: string[]; last: number }[] = [];
  for (const s of sorted) {
    const t = Date.parse(s.createdAt);
    const hit = out.find(
      (g) =>
        lc(g.main.email) === lc(s.email) &&
        g.main.contentKey === s.contentKey &&
        t - g.last <= 30 * 60_000 &&
        // Two different website Order IDs are two orders, even with identical text.
        !(g.main.orderCode && s.orderCode && g.main.orderCode !== s.orderCode),
    );
    if (hit) {
      hit.ids.push(s.id);
      hit.last = t;
      if (!hit.main.orderCode && s.orderCode) hit.main = { ...s };
    } else out.push({ main: s, ids: [s.id], last: t });
  }
  return out.map(({ main, ids }) => ({ main, ids }));
}

/** Last relevant event decides who has the ball (by timestamp, never by processing order). */
export function replyStateOf(events: { dir: "in" | "out"; date: string }[]): {
  state: ReplyState | null;
  lastIn: string | null;
  lastOut: string | null;
} {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const lastIn = [...sorted].reverse().find((e) => e.dir === "in")?.date ?? null;
  const lastOut = [...sorted].reverse().find((e) => e.dir === "out")?.date ?? null;
  const last = sorted[sorted.length - 1];
  return { state: last ? (last.dir === "in" ? "Needs Reply" : "Replied") : null, lastIn, lastOut };
}

/**
 * Status for an existing record after recomputing the reply state. Only the "who has the ball"
 * statuses move; Quote Sent, In Production, Delivered, Lost / Cancelled etc. are never touched.
 */
export function nextStatus(
  current: string | null,
  state: ReplyState | null,
  lastActivity: string,
  now: number,
  staleDays: number,
): string | null {
  if (!state) return null;
  if (current && !REPLY_STATUSES.includes(current)) return null;
  const stale = now - Date.parse(lastActivity) > staleDays * DAY;
  let want: string | null = null;
  if (state === "Replied") {
    if (!current || current === "New" || current === "Awaiting TOREO Reply") want = "Replied";
    else if (current === "Needs Review" && !stale) want = "Replied";
  } else if (!current || current === "Replied" || current === "Awaiting Customer") {
    want = stale ? "Needs Review" : "Awaiting TOREO Reply";
  }
  return want && want !== current ? want : null;
}

/** Initial status for a new record. */
export function initialStatus(
  state: ReplyState | null,
  website: boolean,
  mapped: string | null,
  lastActivity: string,
  now: number,
  staleDays: number,
): string {
  if (mapped && mapped !== "New") return mapped;
  const stale = now - Date.parse(lastActivity) > staleDays * DAY;
  if (state === "Replied") return "Replied";
  if (stale) return "Needs Review";
  return website ? "New" : "Awaiting TOREO Reply";
}

export interface TaskRow {
  id: string;
  status: string | null;
  category: string | null;
  lastEdited: string;
}

/** One reply task per record: create when needed, close when TOREO replied, never fight a human. */
export function planReplyTasks(
  state: ReplyState | null,
  tasks: TaskRow[],
  lastCustomerAt: string | null,
): { create: boolean; done: string[]; cancel: string[] } {
  const reply = tasks.filter((t) => t.category === "Customer Reply");
  const open = reply.filter((t) => OPEN_TASK.includes(t.status ?? ""));
  if (state === "Replied") return { create: false, done: open.map((t) => t.id), cancel: [] };
  if (state !== "Needs Reply") return { create: false, done: [], cancel: [] };
  if (open.length) return { create: false, done: [], cancel: open.slice(1).map((t) => t.id) };
  const closed = reply.filter((t) => !OPEN_TASK.includes(t.status ?? ""));
  // A task someone closed after the latest customer message stays closed.
  const lastClosed = closed
    .map((t) => t.lastEdited)
    .sort()
    .pop();
  const create = !lastClosed || (!!lastCustomerAt && lastCustomerAt > lastClosed);
  return { create, done: [], cancel: [] };
}

/** Pairs of open records that look like the same request (same customer, same subject or close dates). */
export function duplicateCandidates(
  reqs: {
    id: string;
    label: string;
    customerEmail: string | null;
    subject: string;
    receivedAt: string;
    status: string | null;
    duplicateCheck?: string | null;
  }[],
  windowDays = DUPLICATE_WINDOW_DAYS,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const open = reqs.filter(
    (r) =>
      r.customerEmail &&
      !CLOSED_STATUSES.includes(r.status ?? "") &&
      r.duplicateCheck !== "Not a duplicate",
  );
  for (let i = 0; i < open.length; i++)
    for (let j = i + 1; j < open.length; j++) {
      const a = open[i];
      const b = open[j];
      if (lc(a.customerEmail) !== lc(b.customerEmail)) continue;
      const sa = subjectKey(a.subject);
      const same = !!sa && sa === subjectKey(b.subject);
      const close =
        Math.abs(Date.parse(a.receivedAt) - Date.parse(b.receivedAt)) <= windowDays * DAY;
      if (!same && !close) continue;
      out.set(a.id, [...(out.get(a.id) ?? []), b.label]);
      out.set(b.id, [...(out.get(b.id) ?? []), a.label]);
    }
  return out;
}

interface Work extends RequestPlan {
  events: { dir: "in" | "out"; date: string }[];
}

export function planCanonical(input: CanonInput): CanonPlan {
  const own = lc(input.own);
  const internal = input.internal ?? [];
  const keys = new Map(input.keys);
  const priorReview = input.priorReview ?? new Set<string>();
  const isInternal = (e: string | null) => !e || lc(e) === own || matchesSenderList(e, internal);
  const work = new Map<string, Work>();
  const attachments: Attachment[] = [];
  const review: ReviewItem[] = [];
  const skipped: { key: string; reason: string }[] = [];
  const reviewKeys = new Set<string>();
  /** TOREO-initiated emails with no customer request (suppliers, outreach) and replies to them. */
  const outreach = new Set<string>();

  for (const r of input.requests)
    work.set(r.id, {
      id: r.id,
      isNew: false,
      source: "Email",
      orderCode: r.orderCode,
      orderId: null,
      customerEmail: lc(r.customerEmail) || null,
      customerName: null,
      customerPhone: null,
      subject: r.subject,
      receivedAt: r.receivedAt,
      submissionIds: [],
      keys: [],
      replyState: null,
      lastCustomerAt: null,
      lastReplyAt: null,
      lastActivity: r.lastActivity,
      status: r.status,
      duplicates: [],
      events: [],
    });
  const existingStatus = new Map(input.requests.map((r) => [r.id, r.status]));
  const dupCheck = new Map(input.requests.map((r) => [r.id, r.duplicateCheck ?? null]));
  const label = (w: Work) => w.orderCode ?? w.subject.slice(0, 40);
  const own_ = (w: Work, ...ks: string[]) => {
    for (const k of ks) {
      if (input.removedKeys.has(k)) continue;
      const cur = keys.get(k);
      if (cur && cur !== w.id) continue; // a key never moves to another request
      keys.set(k, w.id);
      if (!w.keys.includes(k)) w.keys.push(k);
    }
  };
  const lookup = (k: string): { id?: string; removed?: boolean } =>
    input.removedKeys.has(k) ? { removed: true } : keys.has(k) ? { id: keys.get(k)! } : {};
  const touch = (w: Work, date: string) => {
    if (date > w.lastActivity) w.lastActivity = date;
  };
  const openFor = (email: string) =>
    [...work.values()].filter(
      (w) =>
        w.customerEmail === email &&
        !CLOSED_STATUSES.includes(existingStatus.get(w.id) ?? w.status ?? ""),
    );
  const statusMap = input.statusMap ?? {};

  // 1. Website requests (stable submission id + website Order ID).
  for (const { main: s, ids } of mergeDoubleSubmissions(input.submissions)) {
    const ks = [
      ...ids.map((id) => `submission:${id}`),
      ...(s.orderCode ? [`order:${s.orderCode.toUpperCase()}`] : []),
    ];
    if (isInternal(s.email)) {
      skipped.push({ key: `website:${s.id}`, reason: "Δοκιμή / εσωτερικός αποστολέας TOREO" });
      continue;
    }
    if (ks.some((k) => input.removedKeys.has(k))) {
      skipped.push({
        key: `website:${s.id}`,
        reason: "Η εγγραφή διαγράφηκε στο Notion — δεν ξαναδημιουργείται",
      });
      continue;
    }
    const hits = new Set(ks.map((k) => keys.get(k)).filter((x): x is string => !!x));
    if (hits.size > 1) {
      review.push({
        key: `website:${s.id}`,
        kind: "website",
        date: s.createdAt,
        email: lc(s.email),
        queue: "match",
        reason: "Η υποβολή αντιστοιχεί σε περισσότερες από μία εγγραφές",
        candidates: [...hits].map((id) => label(work.get(id)!)),
      });
      continue;
    }
    let w = hits.size ? work.get([...hits][0]) : undefined;
    if (!w) {
      const id = `new:website:${s.id}`;
      w = {
        id,
        isNew: true,
        source: "Website",
        orderCode: s.orderCode?.toUpperCase() ?? null,
        orderId: s.orderId ?? null,
        customerEmail: lc(s.email),
        customerName: s.name || null,
        customerPhone: s.phone ?? null,
        subject: `${s.orderCode ? s.orderCode.toUpperCase() + " — " : ""}${s.service ?? "Αίτημα από το site"}`,
        receivedAt: s.createdAt,
        submissionIds: [],
        keys: [],
        replyState: null,
        lastCustomerAt: null,
        lastReplyAt: null,
        lastActivity: s.createdAt,
        status: s.orderStatus ? (statusMap[s.orderStatus] ?? null) : null,
        duplicates: [],
        events: [],
      };
      work.set(id, w);
    }
    w.source = "Website";
    if (!w.orderCode && s.orderCode) w.orderCode = s.orderCode.toUpperCase();
    w.customerName = w.customerName ?? (s.name || null);
    w.customerPhone = w.customerPhone ?? s.phone ?? null;
    w.submissionIds.push(...ids.filter((x) => !w!.submissionIds.includes(x)));
    own_(w, ...ks);
    w.events.push({ dir: "in", date: s.createdAt });
    touch(w, s.createdAt);
    attachments.push({
      key: `website:${s.id}`,
      requestId: w.id,
      role: "website",
      date: s.createdAt,
      via: "submission",
      logStatus: null,
    });
  }

  const subsByEmail = new Map<string, CSubmission[]>();
  for (const s of input.submissions) {
    const e = lc(s.email);
    subsByEmail.set(e, [...(subsByEmail.get(e) ?? []), s]);
  }
  const threadIds = (m: CMsg) =>
    [m.inReplyTo, ...[...m.refs].reverse()].filter((x): x is string => !!x);
  const strongMatch = (
    m: CMsg,
  ): {
    id?: string;
    via?: string;
    removed?: boolean;
    conflict?: string[];
    inReview?: boolean;
    outreach?: boolean;
  } => {
    const self = lookup(`msg:${m.messageId}`);
    if (self.removed) return { removed: true };
    if (self.id) return { id: self.id, via: "already" };
    if (m.hdrSubmissionId) {
      const r = lookup(`submission:${m.hdrSubmissionId}`);
      if (r.removed) return { removed: true };
      if (r.id) return { id: r.id, via: "submission" };
    }
    const codes = orderCodesIn(m.subject, m.hdrOrderId);
    const byCode = new Set<string>();
    for (const c of codes) {
      const r = lookup(`order:${c}`);
      if (r.removed) return { removed: true };
      if (r.id) byCode.add(r.id);
    }
    if (byCode.size > 1) return { conflict: [...byCode] };
    if (byCode.size === 1) return { id: [...byCode][0], via: "order_id" };
    for (const t of threadIds(m)) {
      if (reviewKeys.has(t)) return { inReview: true };
      if (outreach.has(t)) return { outreach: true };
      const r = lookup(`msg:${t}`);
      if (r.removed) return { removed: true };
      if (r.id) return { id: r.id, via: "thread" };
    }
    return {};
  };
  const toReview = (
    m: CMsg,
    kind: ReviewItem["kind"],
    reason: string,
    ids: string[],
    queue: ReviewItem["queue"] = "match",
  ) => {
    if (queue === "match") reviewKeys.add(m.messageId);
    review.push({
      key: m.messageId,
      queue,
      kind,
      date: m.date,
      email:
        kind === "outgoing"
          ? lc(m.toEmails.find((t) => !isInternal(t))) || null
          : lc(m.fromEmail) || null,
      reason,
      candidates: ids.map((id) => (work.get(id) ? label(work.get(id)!) : id)),
    });
  };

  const msgs = [...input.messages].sort((a, b) => a.date.localeCompare(b.date));
  for (const m of msgs) {
    const isNotification =
      m.folder === "inbox" &&
      (!!m.hdrSubmissionId ||
        m.cls === "site_notification" ||
        (m.cls === "own" && /new quote request/i.test(m.subject)));

    // 2. Website notification emails: attach to the website request, never a record of their own.
    if (isNotification) {
      let id = strongMatch(m).id;
      if (!id && m.replyTo) {
        const near = (subsByEmail.get(lc(m.replyTo)) ?? []).filter(
          (s) => Math.abs(Date.parse(s.createdAt) - Date.parse(m.date)) <= NOTIFICATION_WINDOW_MS,
        );
        if (near.length === 1) id = lookup(`submission:${near[0].id}`).id;
      }
      if (id && work.get(id)) {
        own_(work.get(id)!, `msg:${m.messageId}`);
        attachments.push({
          key: m.messageId,
          requestId: id,
          role: "notification",
          date: m.date,
          via: "notification",
          logStatus: null,
        });
      } else
        skipped.push({ key: m.messageId, reason: "Ειδοποίηση φόρμας χωρίς αντίστοιχη υποβολή" });
      continue;
    }

    if (m.folder === "sent") {
      const recipients = m.toEmails.filter((t) => !isInternal(t)).map(lc);
      if (!recipients.length) {
        skipped.push({ key: m.messageId, reason: "Χωρίς εξωτερικό παραλήπτη" });
        continue;
      }
      const s = strongMatch(m);
      if (s.removed) {
        skipped.push({ key: m.messageId, reason: "Η σχετική εγγραφή διαγράφηκε στο Notion" });
        continue;
      }
      if (s.inReview) {
        toReview(m, "outgoing", "Ίδιο νήμα με email που περιμένει χειροκίνητο έλεγχο", []);
        continue;
      }
      if (s.conflict) {
        toReview(
          m,
          "outgoing",
          "Email της TOREO που αντιστοιχεί σε περισσότερες εγγραφές",
          s.conflict,
        );
        continue;
      }
      const w = s.id ? work.get(s.id) : undefined;
      if (!w) {
        if (recipients.some((r) => openFor(r).length > 0)) {
          toReview(
            m,
            "outgoing",
            "Email της TOREO σε πελάτη με ανοιχτό αίτημα, χωρίς νήμα ή Order ID",
            [],
          );
        } else {
          // TOREO-initiated mail to someone with no customer request (supplier, partner, outreach).
          outreach.add(m.messageId);
          skipped.push({
            key: m.messageId,
            reason: "Email της TOREO χωρίς αίτημα πελάτη (π.χ. προμηθευτής) — μόνο στο mailbox",
          });
        }
        continue;
      }
      // Counts as a reply only when it actually went to this record's customer.
      const reply = !!w.customerEmail && recipients.includes(w.customerEmail);
      own_(w, `msg:${m.messageId}`, ...threadIds(m).map((t) => `msg:${t}`));
      if (reply) {
        w.events.push({ dir: "out", date: m.date });
        touch(w, m.date);
      }
      attachments.push({
        key: m.messageId,
        requestId: w.id,
        role: reply ? "reply" : "forward",
        date: m.date,
        via: s.via ?? "thread",
        logStatus: null,
      });
      continue;
    }

    if (m.cls !== "customer") {
      skipped.push({ key: m.messageId, reason: `Δεν είναι email πελάτη (${m.cls})` });
      continue;
    }
    const from = lc(m.fromEmail);
    const s = strongMatch(m);
    if (s.removed) {
      // The owner deleted that record in Notion on purpose: never recreate it.
      skipped.push({ key: m.messageId, reason: "Η εγγραφή αυτού του νήματος διαγράφηκε στο Notion" });
      continue;
    }
    if (s.outreach) {
      outreach.add(m.messageId);
      toReview(
        m,
        "incoming",
        "Απάντηση σε email της TOREO προς τρίτο (πιθανός προμηθευτής) — όχι αίτημα πελάτη",
        [],
        "supplier",
      );
      continue;
    }
    if (s.inReview) {
      toReview(m, "incoming", "Ίδιο νήμα με email που περιμένει χειροκίνητο έλεγχο", []);
      continue;
    }
    if (s.conflict) {
      toReview(m, "incoming", "Αντιστοιχεί σε περισσότερες από μία εγγραφές", s.conflict);
      continue;
    }
    let w = s.id ? work.get(s.id) : undefined;
    let via = s.via ?? "";
    if (!w) {
      if (priorReview.has(m.messageId)) {
        toReview(m, "incoming", "Παραμένει για χειροκίνητο έλεγχο (χωρίς νήμα ή Order ID)", []);
        continue;
      }
      const t = Date.parse(m.date);
      const open = openFor(from);
      // 4. Same customer + same subject within the window.
      const sk = subjectKey(m.subject);
      const bySubject = sk
        ? open.filter(
            (o) =>
              subjectKey(o.subject) === sk &&
              Math.abs(Date.parse(o.lastActivity) - t) <= SUBJECT_WINDOW_DAYS * DAY,
          )
        : [];
      if (bySubject.length > 1) {
        toReview(
          m,
          "incoming",
          "Ίδιος πελάτης και θέμα σε περισσότερες εγγραφές",
          bySubject.map((o) => o.id),
        );
        continue;
      }
      if (bySubject.length === 1) {
        w = bySubject[0];
        via = "email_subject";
      } else {
        // 5. Never dedupe by person alone: the customer's only open request attaches only when this
        //    email arrives within a day of that request (e.g. the form + a follow-up email). Later
        //    emails without thread / Order ID / subject evidence may be a new purchase -> review.
        const active = open.filter(
          (o) =>
            t >= Date.parse(o.receivedAt) - DAY &&
            t <= Date.parse(o.lastActivity) + input.staleDays * DAY,
        );
        if (active.length > 1) {
          toReview(
            m,
            "incoming",
            "Ο πελάτης έχει περισσότερες ανοιχτές εγγραφές",
            active.map((o) => o.id),
          );
          continue;
        }
        if (active.length === 1) {
          if (Math.abs(t - Date.parse(active[0].receivedAt)) <= SAME_REQUEST_WINDOW_MS) {
            w = active[0];
            via = "same_day_as_request";
          } else {
            toReview(m, "incoming", "Ίδιος πελάτης με ανοιχτό αίτημα — ίδια ή νέα παραγγελία;", [
              active[0].id,
            ]);
            continue;
          }
        }
      }
    }
    if (!w) {
      const id = `new:email:${m.messageId}`;
      w = {
        id,
        isNew: true,
        source: "Email",
        orderCode: null,
        orderId: null,
        customerEmail: from,
        customerName: m.fromName,
        customerPhone: null,
        subject:
          m.subject.replace(/^\s*((re|fw|fwd|απ|σχετ|προωθ)\s*:\s*)+/i, "").trim() ||
          "(χωρίς θέμα)",
        receivedAt: m.date,
        submissionIds: [],
        keys: [],
        replyState: null,
        lastCustomerAt: null,
        lastReplyAt: null,
        lastActivity: m.date,
        status: null,
        duplicates: [],
        events: [],
      };
      work.set(id, w);
      via = "new";
    }
    w.customerName = w.customerName ?? m.fromName;
    own_(w, `msg:${m.messageId}`, ...threadIds(m).map((t) => `msg:${t}`));
    w.events.push({ dir: "in", date: m.date });
    touch(w, m.date);
    attachments.push({
      key: m.messageId,
      requestId: w.id,
      role: "customer",
      date: m.date,
      via,
      logStatus: null,
    });
  }

  // 3. Reply state per request, then log statuses, statuses and duplicate candidates.
  const out: RequestPlan[] = [];
  for (const w of work.values()) {
    const rs = replyStateOf(w.events);
    w.replyState = rs.state;
    w.lastCustomerAt = rs.lastIn;
    w.lastReplyAt = rs.lastOut;
    if (w.isNew) {
      w.status = initialStatus(
        rs.state,
        w.source === "Website",
        w.status,
        w.lastActivity,
        input.now,
        input.staleDays,
      );
    } else {
      w.status = nextStatus(
        existingStatus.get(w.id) ?? null,
        rs.state,
        w.lastActivity,
        input.now,
        input.staleDays,
      );
    }
  }
  for (const a of attachments) {
    const w = work.get(a.requestId)!;
    if (a.role === "customer" || a.role === "website")
      a.logStatus = w.lastReplyAt && w.lastReplyAt > a.date ? "Replied" : "Needs Reply";
    else if (a.role === "reply") a.logStatus = "Replied";
    else if (a.role === "forward") a.logStatus = "Closed";
  }
  const dups = duplicateCandidates(
    [...work.values()].map((w) => ({
      id: w.id,
      label: w.id, // ids: the caller turns them into permanent Order IDs once assigned
      customerEmail: w.customerEmail,
      subject: w.subject,
      receivedAt: w.receivedAt,
      status: w.isNew ? w.status : (existingStatus.get(w.id) ?? null),
      duplicateCheck: dupCheck.get(w.id) ?? null,
    })),
  );
  for (const w of work.values()) {
    w.duplicates = dups.get(w.id) ?? [];
    const { events: _e, ...plan } = w;
    void _e;
    out.push(plan);
  }
  return { requests: out, attachments, review, skipped };
}
