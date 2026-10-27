// Pure helpers for reading email headers (no network, no secrets). Unit-tested.

const GREEK_8859_7_EXTRA: Record<number, number> = {
  0xa1: 0x2018,
  0xa2: 0x2019,
  0xa3: 0xa3,
  0xaf: 0x2015,
  0xb4: 0x384,
  0xb5: 0x385,
  0xb6: 0x386,
  0xb8: 0x388,
  0xb9: 0x389,
  0xba: 0x38a,
  0xbc: 0x38c,
  0xbe: 0x38e,
  0xbf: 0x38f,
};

/** Manual Greek single-byte decoding fallback (ISO-8859-7 / Windows-1253). */
function decodeGreekSingleByte(bytes: Uint8Array, win: boolean): string {
  let out = "";
  for (const b of bytes) {
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b >= 0xc0 && b <= 0xfe && b !== 0xd2) out += String.fromCharCode(b + 0x2d0);
    else if (win && b === 0xa2) out += "\u0386";
    else if (!win && GREEK_8859_7_EXTRA[b]) out += String.fromCharCode(GREEK_8859_7_EXTRA[b]);
    else if (b >= 0xa0) out += String.fromCharCode(b);
    else out += "\ufffd";
  }
  return out;
}

export function decodeBytes(bytes: Uint8Array, charset: string): string {
  const cs = charset.trim().toLowerCase().replace(/^"|"$/g, "");
  try {
    return new TextDecoder(cs || "utf-8").decode(bytes);
  } catch {
    if (cs === "iso-8859-7" || cs === "iso8859-7" || cs === "greek")
      return decodeGreekSingleByte(bytes, false);
    if (cs === "windows-1253" || cs === "cp1253") return decodeGreekSingleByte(bytes, true);
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function base64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/=]/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function qToBytes(s: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "_") out.push(0x20);
    else if (c === "=" && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
      out.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else out.push(c.charCodeAt(0) & 0xff);
  }
  return new Uint8Array(out);
}

/** RFC 2047 encoded-word decoding, e.g. =?UTF-8?B?...?= and =?iso-8859-7?Q?...?= */
export function decodeWords(input: string): string {
  if (!input) return "";
  // Whitespace between two adjacent encoded words is ignored (RFC 2047 §6.2).
  const joined = input.replace(/(=\?[^?]+\?[BbQq]\?[^?]*\?=)\s+(?==\?[^?]+\?[BbQq]\?)/g, "$1");
  return joined.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (_m, cs: string, enc: string, text: string) => {
      try {
        const charset = cs.split("*")[0];
        const bytes = enc.toUpperCase() === "B" ? base64ToBytes(text) : qToBytes(text);
        return decodeBytes(bytes, charset);
      } catch {
        return text;
      }
    },
  );
}

/** Parse a raw header block into lower-cased keys (unfolded, encoded words decoded). */
export function parseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const unfolded = raw.replace(/\r?\n[ \t]+/g, " ");
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    out[key] = out[key] ? `${out[key]}, ${value}` : value;
  }
  return out;
}

export interface Address {
  name: string | null;
  email: string;
}

const EMAIL_RE = /[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/;

/** Parse "Name <a@b.c>, other@x.y" into addresses (lower-cased emails). */
export function parseAddressList(value: string | undefined | null): Address[] {
  if (!value) return [];
  const out: Address[] = [];
  // Split on commas that are not inside quotes or angle brackets.
  const parts: string[] = [];
  let cur = "";
  let q = false;
  let angle = 0;
  for (const ch of value) {
    if (ch === '"') q = !q;
    if (!q && ch === "<") angle++;
    if (!q && ch === ">") angle = Math.max(0, angle - 1);
    if (ch === "," && !q && angle === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  for (const p of parts) {
    const m = p.match(EMAIL_RE);
    if (!m) continue;
    const email = m[0].toLowerCase();
    let name: string | null = p
      .replace(/<[^>]*>/, "")
      .replace(m[0], "")
      .replace(/["']/g, "")
      .trim();
    name = name ? decodeWords(name).trim() || null : null;
    out.push({ name, email });
  }
  return out;
}

/** Extract Message-IDs ("<id@host>") in order. */
export function parseMessageIds(value: string | undefined | null): string[] {
  if (!value) return [];
  return Array.from(value.matchAll(/<[^<>\s]+>/g)).map((m) => m[0]);
}

const SUBJECT_PREFIX =
  /^\s*(?:(?:re|fw|fwd|aw|wg|sv|vs|απ|σχετ|πρθ|προωθ)\s*(?:\[\d+\])?\s*[:：]\s*)+/i;

/** Lower-cased subject without Re:/Fwd:/ΑΠ: prefixes, for comparison only. */
export function normalizeSubject(s: string | null | undefined): string {
  let v = (s ?? "").normalize("NFC");
  let prev = "";
  while (prev !== v) {
    prev = v;
    v = v.replace(SUBJECT_PREFIX, "");
  }
  return v.replace(/\s+/g, " ").trim().toLowerCase();
}

export type Classification =
  | "customer"
  | "own"
  | "internal"
  | "site_notification"
  | "auto"
  | "bulk"
  | "ignored";

export interface ClassifyInput {
  headers: Record<string, string>;
  from: Address | null;
  ownAddress: string;
  siteSender: string | null;
  /** TOREO staff/test addresses (never customer requests). */
  internal?: string[];
  /** Domains/addresses of platforms, marketing and solicitations (never customer requests). */
  ignore?: string[];
}

/** True when the address equals an entry, or its domain equals/ends with a domain entry. */
export function matchesSenderList(email: string, list: string[] = []): boolean {
  const e = email.trim().toLowerCase();
  const domain = e.split("@")[1] ?? "";
  return list.some((raw) => {
    const x = raw.trim().toLowerCase();
    if (!x) return false;
    if (x.includes("@")) return x === e;
    return domain === x || domain.endsWith(`.${x}`);
  });
}

const lc = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** Platform / notification domains: an email from them is never a customer by itself. */
export const SYSTEM_DOMAINS = [
  "microsoft.com",
  "microsoftonline.com",
  "office365.com",
  "office.com",
  "sharepointonline.com",
  "google.com",
  "facebookmail.com",
  "instagram.com",
  "linkedin.com",
  "notion.so",
  "resend.dev",
  "resend.com",
  "github.com",
  "apple.com",
  "paypal.com",
  "stripe.com",
  "amazonses.com",
  "sendgrid.net",
  "mailchimp.com",
  "mcsv.net",
  "papaki.com",
  "papaki.gr",
];
/** Personal mailbox domains: different addresses there are different people. */
export const PERSONAL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.gr",
  "hotmail.com",
  "hotmail.gr",
  "outlook.com",
  "outlook.com.gr",
  "live.com",
  "icloud.com",
  "me.com",
  "otenet.gr",
  "windowslive.com",
  "mail.ru",
  "yandex.com",
];

const AUTOMATED_LOCAL =
  /(^|[._+-])(no-?reply|do-?not-?reply|donotreply|notifications?|notify|alerts?|mailer-daemon|mailer|postmaster|bounces?|automated|auto-?confirm|system|security|account-?security|billing)([._+-]|$)/i;
/** True for no-reply, notification and platform senders (Microsoft 365, Google, Notion, ...). */
export function isSystemSender(email: string | null | undefined): boolean {
  const e = lc(email);
  if (!e.includes("@")) return false;
  const [local, domain] = e.split("@");
  if (AUTOMATED_LOCAL.test(local)) return true;
  return matchesSenderList(e, SYSTEM_DOMAINS) && !PERSONAL_DOMAINS.includes(domain);
}

/** Bulk-mail sending subdomains (mg.example.com, updates.example.com, ...). */
const SENDING_SUBDOMAIN =
  /^(mg|mail|mail-notify|mailer|updates?|notifications?|notify|news(letter)?|email|em\d*|bounce|marketing|info-noreply)\./i;

/** Decide whether an incoming email is a real customer message. */
export function classifyIncoming({
  headers,
  from,
  ownAddress,
  siteSender,
  internal = [],
  ignore = [],
}: ClassifyInput): Classification {
  const email = (from?.email ?? "").toLowerCase();
  if (!email) return "auto";
  if (email === ownAddress.toLowerCase()) return "own";
  if (matchesSenderList(email, internal)) return "internal";
  if (siteSender && email === siteSender.toLowerCase()) return "site_notification";
  const autoSubmitted = (headers["auto-submitted"] ?? "").toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") return "auto";
  if (headers["x-autoreply"] || headers["x-autorespond"]) return "auto";
  if (/^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounce)/i.test(email)) return "auto";
  const prec = (headers["precedence"] ?? "").toLowerCase();
  if (prec === "bulk" || prec === "list" || prec === "junk") return "bulk";
  if (headers["list-id"] || headers["list-unsubscribe"]) return "bulk";
  if (matchesSenderList(email, ignore)) return "ignored";
  if (SENDING_SUBDOMAIN.test(email.split("@")[1] ?? "")) return "bulk";
  // Microsoft 365 / platform notifications and *-noreply senders are never customer requests.
  if (isSystemSender(email)) return "auto";
  return "customer";
}

/** Thread key: first Reference, else In-Reply-To, else the message itself. */
export function threadRoot(refs: string[], inReplyTo: string | null, messageId: string): string {
  return refs[0] ?? inReplyTo ?? messageId;
}

export function cleanSnippet(s: string | null | undefined, max = 400): string {
  const v = (s ?? "").replace(/\s+/g, " ").trim();
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

export function mid(messageId: string): string {
  return `mid:${messageId.replace(/^<|>$/g, "")}`;
}
