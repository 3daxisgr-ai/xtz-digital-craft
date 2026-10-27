// Pure decision rules: what a synced email should do in Notion. Unit-tested.
import { normalizeSubject } from "./mime";
import type { OrderPage } from "./notion-map";

/** Records that are finished; new emails never attach to them by subject. */
export const CLOSED_STATUSES = ["Delivered", "Lost / Cancelled"];

/** A customer email moves the record to "Awaiting TOREO Reply" only from these statuses. */
export const AWAITING_FROM = [
  "New",
  "Needs Review",
  "Replied",
  "Awaiting Customer",
  "Quote Sent",
  "Awaiting TOREO Reply",
];

/** A TOREO reply marks the record "Replied" only from these statuses. */
export const REPLIED_FROM = ["New", "Needs Review", "Awaiting TOREO Reply"];

export type MatchVia = "thread_db" | "thread_notion" | "batch" | "email_subject";

export interface Target extends OrderPage {
  via: MatchVia;
}

export interface IncomingDecision {
  action: "create_order" | "update_order" | "join_new";
  setStatus: string | null;
  nextAction: string | null;
  reason: string;
}

export function decideIncoming(
  target: Target | null,
  pendingNewFrom: string | null = null,
): IncomingDecision {
  if (!target && pendingNewFrom) {
    return {
      action: "join_new",
      setStatus: null,
      nextAction: null,
      reason: `Ίδιο νήμα με νέο αίτημα (${pendingNewFrom})`,
    };
  }
  if (!target) {
    return {
      action: "create_order",
      setStatus: "Awaiting TOREO Reply",
      nextAction: "Απάντηση στον πελάτη",
      reason: "Δεν βρέθηκε υπάρχουσα εγγραφή — νέο αίτημα",
    };
  }
  const via = target.via === "email_subject" ? "ίδιος αποστολέας και θέμα" : "ίδιο νήμα email";
  if (target.status && !AWAITING_FROM.includes(target.status)) {
    return {
      action: "update_order",
      setStatus: null,
      nextAction: "Νέο email πελάτη — χρειάζεται απάντηση",
      reason: `Βρέθηκε ${target.record ?? target.title} (${via}). Η κατάσταση «${target.status}» διατηρείται.`,
    };
  }
  return {
    action: "update_order",
    setStatus: "Awaiting TOREO Reply",
    nextAction: "Απάντηση στον πελάτη",
    reason: `Βρέθηκε ${target.record ?? target.title} (${via})`,
  };
}

export interface OutgoingDecision {
  action: "mark_replied" | "log_only" | "forward_logged" | "manual_review";
  setStatus: string | null;
  reason: string;
}

/**
 * A TOREO reply is linked only through In-Reply-To / References (never by guessing),
 * and counts as a reply only when it goes to that record's customer. A forward to a
 * third party (e.g. a supplier) is logged without changing the record.
 * `hint` is an unsafe guess (same recipient) shown to the admin, never acted on.
 */
export function decideOutgoing(
  target: Target | null,
  isReply: boolean,
  hint: OrderPage | null = null,
  recipients: string[] = [],
): OutgoingDecision {
  if (!target) {
    const why = isReply
      ? "Η απάντηση δεν αντιστοιχεί με ασφάλεια σε γνωστό εισερχόμενο email"
      : "Νέο εξερχόμενο email (όχι απάντηση)";
    return {
      action: "manual_review",
      setStatus: null,
      reason: hint
        ? `${why}. Πιθανή εγγραφή: ${hint.record ?? hint.title} — χρειάζεται έλεγχο.`
        : `${why} — χρειάζεται έλεγχο.`,
    };
  }
  const label = target.record ?? target.title;
  const customer = target.customerEmail?.toLowerCase() ?? null;
  const to = recipients.map((r) => r.toLowerCase());
  if (!customer) {
    return {
      action: "manual_review",
      setStatus: null,
      reason: `Το ${label} δεν έχει email πελάτη — δεν μπορεί να επιβεβαιωθεί ότι είναι απάντηση. Χρειάζεται έλεγχο.`,
    };
  }
  if (!to.includes(customer)) {
    return {
      action: "forward_logged",
      setStatus: null,
      reason: `Προώθηση στο ${to.join(", ") || "—"} (όχι στον πελάτη) για το ${label}; η κατάσταση δεν αλλάζει`,
    };
  }
  if (target.status && REPLIED_FROM.includes(target.status)) {
    return { action: "mark_replied", setStatus: "Replied", reason: `Απάντηση στο ${label}` };
  }
  return {
    action: "log_only",
    setStatus: null,
    reason: `Απάντηση στο ${label}; η κατάσταση «${target.status ?? "—"}» διατηρείται`,
  };
}

/** Exactly one open record from the same customer with the same subject, else null. */
export function pickEmailSubjectMatch(
  pages: OrderPage[],
  subject: string | null,
): OrderPage | null {
  const want = normalizeSubject(subject);
  if (!want) return null;
  const hits = pages.filter(
    (p) => !(p.status && CLOSED_STATUSES.includes(p.status)) && normalizeSubject(p.title) === want,
  );
  return hits.length === 1 ? hits[0] : null;
}

/** Highest UID such that every processed UID up to it succeeded (checkpoint never skips a failure). */
export function nextCheckpoint(current: number, results: { uid: number; ok: boolean }[]): number {
  let cp = current;
  for (const r of [...results].sort((a, b) => a.uid - b.uid)) {
    if (!r.ok) break;
    if (r.uid > cp) cp = r.uid;
  }
  return cp;
}
