// Pure, evidence-based classification of contacts (Customers) and requests (Orders & Quotes).
// Nothing here deletes, merges or renames: it only proposes a label + a reason, and says when a
// person should look. Unit-tested.
import { PERSONAL_DOMAINS, isSystemSender, matchesSenderList } from "./mime";
export { PERSONAL_DOMAINS, SYSTEM_DOMAINS, isSystemSender } from "./mime";

export const CONTACT_CLASSES = [
  "Confirmed customer",
  "Prospect / lead",
  "Supplier / partner",
  "Automated / system",
  "Spam / marketing",
  "Uncertain",
] as const;
export type ContactClass = (typeof CONTACT_CLASSES)[number];

export const ORDER_CHECKS = [
  "Genuine order",
  "Sales inquiry",
  "Suspected non-order",
  "Customer mismatch",
  "Needs review",
] as const;
export type OrderCheck = (typeof ORDER_CHECKS)[number];

/** Statuses that prove a real purchase (not just an inquiry). */
export const CONFIRMED_STATUSES = [
  "Confirmed Order",
  "In Production",
  "Ready for Dispatch",
  "Delivered",
];
export const INQUIRY_STATUSES = [
  "New",
  "Needs Review",
  "Awaiting TOREO Reply",
  "Replied",
  "Preparing Quote",
  "Quote Sent",
  "Awaiting Customer",
  "On Hold",
  "Lost / Cancelled",
];

const lc = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

const SYSTEM_SUBJECT =
  /(verification code|security (alert|code|info)|sign[- ]?in|password|one-time code|your account|κωδικ(ός|ού) (επαλήθευσης|πρόσβασης)|successfully submitted|registration (form|confirmed)|account (created|verified)|delivery status notification|undeliverable|out of office|automatic reply|αυτόματη απάντηση)/i;
const MARKETING_SUBJECT =
  /(newsletter|webinar|unsubscribe|special offer|% off|promo|black friday|προσφορ(ά|ές) (μόνο|έως)|εκπτώσ)/i;

export const isSystemSubject = (s: string | null | undefined) => SYSTEM_SUBJECT.test(s ?? "");
export const isMarketingSubject = (s: string | null | undefined) => MARKETING_SUBJECT.test(s ?? "");

export interface ContactEvidence {
  email: string;
  /** Notion Customers "Type" as set today (Lead / Client / Supplier / Partner / Other). */
  type?: string | null;
  /** Statuses + automatic checks of the requests linked to this contact. */
  orders: { status: string | null; check: OrderCheck | null }[];
  /** Incoming messages from this address: classification + subject (subject used only for patterns). */
  inbound: { cls: string; subject: string }[];
  /** TOREO messages to this address that are linked to a customer request as a reply/forward. */
  outbound: ("reply" | "forward")[];
  website: boolean;
  ignore?: string[];
}

export interface Verdict<T> {
  value: T;
  reason: string;
  review: boolean;
}

export function classifyContact(c: ContactEvidence): Verdict<ContactClass> {
  const type = c.type ?? null;
  const confirmed = c.orders.some((o) => CONFIRMED_STATUSES.includes(o.status ?? ""));
  const genuine = c.orders.some((o) => o.check === "Genuine order" || o.check === "Sales inquiry");
  const realInbound = c.inbound.filter((m) => m.cls === "customer");
  if (isSystemSender(c.email))
    return {
      value: "Automated / system",
      reason: "Αποστολέας ειδοποιήσεων / no-reply / πλατφόρμα",
      review: c.orders.length > 0 || type === "Client",
    };
  if (
    matchesSenderList(c.email, c.ignore ?? []) ||
    (c.inbound.length > 0 && c.inbound.every((m) => m.cls === "bulk" || m.cls === "ignored"))
  )
    return {
      value: "Spam / marketing",
      reason: "Λίστα εξαιρέσεων / μαζική ή διαφημιστική αποστολή",
      review: c.orders.length > 0,
    };
  if (
    c.inbound.length > 0 &&
    c.inbound.every((m) => m.cls === "auto" || isSystemSubject(m.subject)) &&
    !confirmed &&
    !c.website
  )
    return {
      value: "Automated / system",
      reason: "Μόνο αυτόματα μηνύματα (π.χ. επιβεβαίωση εγγραφής, κωδικοί)",
      review: true,
    };
  if (
    c.inbound.length > 0 &&
    c.inbound.every((m) => isMarketingSubject(m.subject)) &&
    !confirmed &&
    !c.website
  )
    return {
      value: "Spam / marketing",
      reason: "Μόνο διαφημιστικά / newsletter θέματα",
      review: true,
    };
  if (type === "Supplier" || type === "Partner")
    return { value: "Supplier / partner", reason: `Ορίστηκε ως ${type} στο Notion`, review: false };
  if (
    !realInbound.length &&
    !c.website &&
    c.outbound.length > 0 &&
    c.outbound.every((r) => r === "forward")
  )
    return {
      value: "Supplier / partner",
      reason: "Λαμβάνει μόνο προωθήσεις της TOREO, δεν έχει στείλει αίτημα",
      review: true,
    };
  if (confirmed)
    return {
      value: "Confirmed customer",
      reason: "Έχει επιβεβαιωμένη παραγγελία (Confirmed / Production / Dispatch / Delivered)",
      review: false,
    };
  if (genuine || c.website)
    return {
      value: "Prospect / lead",
      reason: c.website
        ? "Αίτημα από τη φόρμα του site, χωρίς επιβεβαιωμένη παραγγελία"
        : "Πραγματικό αίτημα προσφοράς, χωρίς επιβεβαιωμένη παραγγελία",
      review: type === "Client",
    };
  if (realInbound.length)
    return {
      value: "Uncertain",
      reason: "Έχει στείλει email αλλά δεν υπάρχει επιβεβαιωμένο αίτημα",
      review: true,
    };
  return {
    value: "Uncertain",
    reason: "Δεν υπάρχει αίτημα ή email του ίδιου — χρειάζεται έλεγχο",
    review: true,
  };
}

const GREEK: Record<string, string> = {
  α: "a",
  β: "v",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "i",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  φ: "f",
  χ: "ch",
  ψ: "ps",
  ω: "o",
};
/** Name tokens in a comparable Latin form (accents removed, Greek transliterated, loose vowels). */
export function nameTokens(name: string | null | undefined): string[] {
  const base = (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[α-ω]/g, (ch) => GREEK[ch] ?? ch)
    .replace(/[^a-z0-9\s]/g, " ");
  return base
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .map((t) =>
      t
        .replace(/(ou|u|y|i|e|h|w)/g, "i")
        .replace(/(ph|f)/g, "f")
        .replace(/(ch|kh|c|k)/g, "k")
        .replace(/(th)/g, "t"),
    );
}
/** True when two names share a token (Παναγιώτης ~ Panagiotis); false when both have tokens and none match. */
export function namesCompatible(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean | null {
  const x = nameTokens(a);
  const y = nameTokens(b);
  if (!x.length || !y.length) return null;
  return x.some((t) =>
    y.some(
      (u) => t === u || (t.length >= 5 && u.length >= 5 && (t.startsWith(u) || u.startsWith(t))),
    ),
  );
}
const domainOf = (e: string | null | undefined) => lc(e).split("@")[1] ?? "";
/** Same person/company mailbox: exact address, or same company domain (never a personal domain). */
export function sameParty(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!lc(a) || !lc(b)) return false;
  if (lc(a) === lc(b)) return true;
  const d = domainOf(a);
  return !!d && d === domainOf(b) && !PERSONAL_DOMAINS.includes(d);
}

export interface OrderEvidence {
  status: string | null;
  source: string | null;
  subject: string;
  customerEmail: string | null;
  customerName: string | null;
  /** The Customers card(s) this record is linked to. */
  linkedCustomers: { email: string | null; name: string | null }[];
  submissionEmails: string[];
  /** Senders of incoming messages linked to this record (own address excluded). */
  incomingSenders: string[];
  /** Classification of the first incoming message, when the record came from email. */
  firstMessageClass?: string | null;
}

export function checkOrder(o: OrderEvidence): Verdict<OrderCheck> {
  const email = lc(o.customerEmail);
  const wrongCard = o.linkedCustomers.find((c) => c.email && lc(c.email) !== email);
  if (email && wrongCard)
    return {
      value: "Customer mismatch",
      reason: "Η κάρτα πελάτη που συνδέθηκε έχει άλλο email από το αίτημα",
      review: true,
    };
  if (email && o.submissionEmails.some((e) => lc(e) !== email))
    return {
      value: "Customer mismatch",
      reason: "Το email της φόρμας του site διαφέρει από το email του αιτήματος",
      review: true,
    };
  const stranger = o.incomingSenders.find((s) => !sameParty(s, email));
  if (email && stranger)
    return {
      value: "Customer mismatch",
      reason: "Συνδέθηκε εισερχόμενο email από άλλον αποστολέα (όχι ο πελάτης ή η εταιρεία του)",
      review: true,
    };
  const nameCard = o.linkedCustomers.find(
    (c) => namesCompatible(c.name, o.customerName) === false && !(c.name ?? "").includes("@"),
  );
  if (nameCard)
    return {
      value: "Needs review",
      reason: "Το όνομα στο αίτημα δεν ταιριάζει με το όνομα της κάρτας πελάτη",
      review: true,
    };
  if (isSystemSender(email))
    return {
      value: "Suspected non-order",
      reason: "Ο αποστολέας είναι σύστημα ειδοποιήσεων / no-reply",
      review: true,
    };
  if (o.firstMessageClass && ["auto", "bulk", "ignored"].includes(o.firstMessageClass))
    return {
      value: "Suspected non-order",
      reason: "Αυτόματο ή μαζικό μήνυμα, όχι αίτημα πελάτη",
      review: true,
    };
  if (o.source !== "Website" && isSystemSubject(o.subject))
    return {
      value: "Suspected non-order",
      reason: "Το θέμα μοιάζει με αυτόματη ειδοποίηση (εγγραφή, κωδικός, επιβεβαίωση)",
      review: true,
    };
  if (o.source !== "Website" && isMarketingSubject(o.subject))
    return {
      value: "Suspected non-order",
      reason: "Το θέμα μοιάζει με διαφήμιση / newsletter",
      review: true,
    };
  if (CONFIRMED_STATUSES.includes(o.status ?? ""))
    return { value: "Genuine order", reason: "Επιβεβαιωμένη παραγγελία", review: false };
  if (
    o.source === "Website" ||
    INQUIRY_STATUSES.includes(o.status ?? "") ||
    o.incomingSenders.length
  )
    return {
      value: "Sales inquiry",
      reason: o.source === "Website" ? "Αίτημα από τη φόρμα του site" : "Αίτημα πελάτη με email",
      review: false,
    };
  return {
    value: "Needs review",
    reason: "Δεν υπάρχει αρκετή ένδειξη για το αν είναι αίτημα",
    review: true,
  };
}

/** Should the automation write `next`? Only when the field is empty or still shows our last value. */
export function mayWriteLabel(current: string | null, lastAuto: string | null): boolean {
  return !current || (!!lastAuto && current === lastAuto);
}
