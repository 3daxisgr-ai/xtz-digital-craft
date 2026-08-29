/**
 * Request/email identity + duplicate classification.
 *
 * Pure, dependency-light helpers so they can be unit-tested without a database.
 * The rule of the system: identity is derived from CONTENT, never from a
 * filename, a UI state flag or a request counter.
 */

import { createHash } from "node:crypto";

export type DuplicateClass = "exact" | "near" | "same_project" | "not_duplicate";

export interface IntakeIdentity {
  senderEmail: string;
  subjectRaw?: string | null;
  subjectNormalized: string;
  bodyHash: string;
  attachmentsHash: string | null;
  fingerprint: string;
}

export interface IntakeInput {
  senderEmail: string;
  subject?: string | null;
  body?: string | null;
  /** Service / process / material / quantity etc. — anything that identifies the request. */
  facts?: Record<string, unknown> | null;
  /** File names + sizes, or content hashes when available. */
  attachments?: { name?: string | null; size?: number | null; hash?: string | null }[] | null;
}

export function sha256(v: string): string {
  return createHash("sha256").update(v, "utf8").digest("hex");
}

/** Strip reply/forward prefixes, order codes, punctuation and case. */
export function normalizeSubject(subject?: string | null): string {
  if (!subject) return "";
  let s = subject.toLowerCase();
  // Greek + English reply/forward prefixes, possibly repeated ("re: re: fwd:")
  for (let i = 0; i < 6; i++) {
    const next = s.replace(/^\s*(re|fw|fwd|απ|απάντηση|προωθ|προώθηση)\s*(\[\d+\])?\s*:\s*/i, "");
    if (next === s) break;
    s = next;
  }
  return s
    .replace(/\btr-\d{4}-\d{4}\b/g, " ")
    .replace(/\btr-\d{4}\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Normalize a body for hashing: drop quoted history, signatures and whitespace noise. */
export function normalizeBody(body?: string | null): string {
  if (!body) return "";
  const lines = body.split(/\r?\n/);
  const kept: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith(">")) continue; // quoted reply
    if (/^on .+ wrote:$/i.test(line)) break;
    if (/^(στις|από:|from:|sent:|to:|subject:)/i.test(line)) continue;
    if (/^-{2,}\s*(original message|forwarded message)/i.test(line)) break;
    kept.push(line);
  }
  return kept
    .join("\n")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\n]+/gu, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

export function hashAttachments(
  attachments?: { name?: string | null; size?: number | null; hash?: string | null }[] | null,
): string | null {
  if (!attachments?.length) return null;
  const parts = attachments
    .map((a) => a.hash || `${(a.name ?? "").toLowerCase()}:${a.size ?? ""}`)
    .filter(Boolean)
    .sort();
  if (!parts.length) return null;
  return sha256(parts.join("|"));
}

function stableFacts(facts?: Record<string, unknown> | null): string {
  if (!facts) return "";
  return Object.keys(facts)
    .sort()
    .map((k) => {
      const v = facts[k];
      if (v === null || v === undefined || v === "") return "";
      return `${k}=${String(v).trim().toLowerCase()}`;
    })
    .filter(Boolean)
    .join(";");
}

/**
 * Stable identity of a request. Two arrivals of the same content produce the
 * same fingerprint even if the filename, casing or reply prefix differ.
 */
export function buildIdentity(input: IntakeInput): IntakeIdentity {
  const senderEmail = normalizeEmail(input.senderEmail);
  const subjectNormalized = normalizeSubject(input.subject);
  const bodyHash = sha256(normalizeBody(input.body));
  const attachmentsHash = hashAttachments(input.attachments);
  const fingerprint = sha256(
    [senderEmail, subjectNormalized, bodyHash, attachmentsHash ?? "", stableFacts(input.facts)].join("||"),
  );
  return { senderEmail, subjectRaw: input.subject ?? null, subjectNormalized, bodyHash, attachmentsHash, fingerprint };
}

// ---------------------------------------------------------------- similarity

function tokens(s: string): Set<string> {
  return new Set(s.split(/\s+/).filter((t) => t.length > 2));
}

/** Jaccard similarity of token sets, 0..1. */
export function textSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size && !tb.size) return 1;
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export interface CandidateRecord {
  intakeId?: string | null;
  orderId?: string | null;
  orderCode?: string | null;
  senderEmail: string;
  subjectNormalized: string;
  bodyHash: string;
  bodyNormalized?: string | null;
  attachmentsHash?: string | null;
  fingerprint: string;
  providerMessageId?: string | null;
  messageIdHeader?: string | null;
  receivedAt: string | Date;
}

export interface DuplicateVerdict {
  duplicateClass: DuplicateClass;
  confidence: number; // 0..100
  match: CandidateRecord | null;
  reasons: string[];
  /** true → do not create a new order at all */
  block: boolean;
  /** true → create the record but flag it for a human */
  review: boolean;
}

const NOT_DUPLICATE: DuplicateVerdict = {
  duplicateClass: "not_duplicate",
  confidence: 0,
  match: null,
  reasons: [],
  block: false,
  review: false,
};

/** Window (ms) within which a repeated request is considered the same project. */
const SAME_PROJECT_WINDOW_MS = 1000 * 60 * 60 * 24 * 21; // 21 days

/**
 * Classify an incoming request against known candidates.
 * Deterministic — the AI layer may enrich the reasons, it never overrides this.
 */
export function classifyDuplicate(
  incoming: IntakeIdentity & {
    providerMessageId?: string | null;
    messageIdHeader?: string | null;
    bodyNormalized?: string | null;
    receivedAt?: string | Date;
  },
  candidates: CandidateRecord[],
): DuplicateVerdict {
  if (!candidates.length) return NOT_DUPLICATE;
  const now = new Date(incoming.receivedAt ?? Date.now()).getTime();

  // 1. Provider / RFC message id — absolute identity.
  for (const c of candidates) {
    if (incoming.providerMessageId && c.providerMessageId && incoming.providerMessageId === c.providerMessageId) {
      return { duplicateClass: "exact", confidence: 100, match: c, reasons: ["Same provider message ID"], block: true, review: false };
    }
    if (incoming.messageIdHeader && c.messageIdHeader && incoming.messageIdHeader === c.messageIdHeader) {
      return { duplicateClass: "exact", confidence: 100, match: c, reasons: ["Same Message-ID header"], block: true, review: false };
    }
  }

  // 2. Identical content fingerprint.
  for (const c of candidates) {
    if (c.fingerprint === incoming.fingerprint) {
      return { duplicateClass: "exact", confidence: 100, match: c, reasons: ["Identical request fingerprint (sender + subject + body + files)"], block: true, review: false };
    }
  }

  // 3. Same sender — score the closest candidate.
  let best: { c: CandidateRecord; score: number; reasons: string[] } | null = null;
  for (const c of candidates) {
    if (normalizeEmail(c.senderEmail) !== incoming.senderEmail) continue;
    const age = now - new Date(c.receivedAt).getTime();
    if (age > SAME_PROJECT_WINDOW_MS) continue;

    const reasons: string[] = ["Same customer email"];
    let score = 30;

    if (c.bodyHash === incoming.bodyHash) {
      score += 45;
      reasons.push("Identical message body");
    } else if (incoming.bodyNormalized && c.bodyNormalized) {
      const sim = textSimilarity(incoming.bodyNormalized, c.bodyNormalized);
      if (sim >= 0.85) { score += 40; reasons.push(`Message body ${Math.round(sim * 100)}% identical`); }
      else if (sim >= 0.6) { score += 25; reasons.push(`Message body ${Math.round(sim * 100)}% similar`); }
      else if (sim >= 0.35) { score += 12; reasons.push(`Message body partially similar (${Math.round(sim * 100)}%)`); }
    }

    if (incoming.subjectNormalized && c.subjectNormalized) {
      if (incoming.subjectNormalized === c.subjectNormalized) { score += 20; reasons.push("Identical subject"); }
      else {
        const ss = textSimilarity(incoming.subjectNormalized, c.subjectNormalized);
        if (ss >= 0.6) { score += 12; reasons.push(`Similar subject (${Math.round(ss * 100)}%)`); }
      }
    }

    if (incoming.attachmentsHash && c.attachmentsHash && incoming.attachmentsHash === c.attachmentsHash) {
      score += 25;
      reasons.push("Identical attachments");
    }

    if (age < 1000 * 60 * 10) { score += 8; reasons.push("Received within 10 minutes of the previous request"); }

    score = Math.min(score, 99);
    if (!best || score > best.score) best = { c, score, reasons };
  }

  if (!best || best.score < 50) return NOT_DUPLICATE;

  if (best.score >= 92) {
    return { duplicateClass: "near", confidence: best.score, match: best.c, reasons: best.reasons, block: true, review: false };
  }
  if (best.score >= 70) {
    return { duplicateClass: "near", confidence: best.score, match: best.c, reasons: best.reasons, block: false, review: true };
  }
  return { duplicateClass: "same_project", confidence: best.score, match: best.c, reasons: best.reasons, block: false, review: true };
}

/** Human label for the admin UI. */
export function confidenceLabel(confidence: number): string {
  if (confidence >= 92) return "VERY HIGH CONFIDENCE";
  if (confidence >= 70) return "HIGH CONFIDENCE";
  if (confidence >= 50) return "POSSIBLE DUPLICATE";
  return "NOT DUPLICATE";
}
