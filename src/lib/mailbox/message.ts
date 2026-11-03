// Pure RFC 5322 / MIME reader for one raw message (no network, no secrets). Unit-tested.
// Works on a possibly truncated byte prefix: whatever is readable is returned, never invented.
import {
  decodeBytes,
  decodeWords,
  parseAddressList,
  parseHeaders,
  parseMessageIds,
  type Address,
} from "../mail-sync/mime";

export interface AttachmentInfo {
  filename: string;
  contentType: string;
  /** Approximate decoded size in bytes (from the part present in the fetched data). */
  bytes: number;
}

export interface MailMessage {
  subject: string;
  from: Address[];
  to: Address[];
  cc: Address[];
  replyTo: Address[];
  date: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  text: string;
  textSource: "plain" | "html" | "none";
  attachments: AttachmentInfo[];
  truncated: boolean;
}

interface Leaf {
  contentType: string;
  charset: string;
  encoding: string;
  filename: string | null;
  disposition: string;
  body: string; // binary string (one char per byte)
}

function bytesToBinary(b: Uint8Array): string {
  let s = "";
  const CH = 0x8000;
  for (let i = 0; i < b.length; i += CH)
    s += String.fromCharCode(...b.subarray(i, Math.min(i + CH, b.length)));
  return s;
}

function binaryToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function splitHeadBody(bin: string): [string, string] {
  const m = bin.match(/\r?\n\r?\n/);
  if (!m || m.index === undefined) return [bin, ""];
  return [bin.slice(0, m.index), bin.slice(m.index + m[0].length)];
}

/** Parse `type/sub; a=b; c="d"` (also RFC 2231 `name*=UTF-8''...`). */
export function parseParams(value: string | undefined): {
  value: string;
  params: Record<string, string>;
} {
  const v = value ?? "";
  const parts: string[] = [];
  let cur = "";
  let q = false;
  for (const ch of v) {
    if (ch === '"') q = !q;
    if (ch === ";" && !q) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  const params: Record<string, string> = {};
  const continued: Record<string, string[]> = {};
  for (const p of parts.slice(1)) {
    const i = p.indexOf("=");
    if (i <= 0) continue;
    const key = p.slice(0, i).trim().toLowerCase();
    let val = p
      .slice(i + 1)
      .trim()
      .replace(/^"|"$/g, "");
    const c = key.match(/^([^*]+)\*(\d+)\*?$/);
    if (c) {
      (continued[c[1]] ??= [])[parseInt(c[2], 10)] = val;
      continue;
    }
    if (key.endsWith("*")) {
      const m = val.match(/^([^']*)'[^']*'(.*)$/);
      if (m) val = rfc2231(m[2], m[1]);
      params[key.slice(0, -1)] = val;
    } else params[key] = val;
  }
  for (const [k, segs] of Object.entries(continued)) {
    const joined = segs.join("");
    const m = joined.match(/^([^']*)'[^']*'(.*)$/);
    params[k] ??= m ? rfc2231(m[2], m[1]) : joined;
  }
  return { value: parts[0].trim().toLowerCase(), params };
}

function rfc2231(pct: string, charset: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < pct.length; i++) {
    if (pct[i] === "%" && /^[0-9A-Fa-f]{2}$/.test(pct.slice(i + 1, i + 3))) {
      bytes.push(parseInt(pct.slice(i + 1, i + 3), 16));
      i += 2;
    } else bytes.push(pct.charCodeAt(i) & 0xff);
  }
  return decodeBytes(new Uint8Array(bytes), charset || "utf-8");
}

function decodeTransfer(body: string, encoding: string): Uint8Array {
  const enc = encoding.trim().toLowerCase();
  if (enc === "base64") {
    const clean = body.replace(/[^A-Za-z0-9+/]/g, "");
    const usable = clean.slice(0, clean.length - (clean.length % 4));
    try {
      return binaryToBytes(atob(usable));
    } catch {
      return new Uint8Array(0);
    }
  }
  if (enc === "quoted-printable") {
    const s = body.replace(/=\r?\n/g, "");
    const out: number[] = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
        out.push(parseInt(s.slice(i + 1, i + 3), 16));
        i += 2;
      } else out.push(s.charCodeAt(i) & 0xff);
    }
    return new Uint8Array(out);
  }
  return binaryToBytes(body);
}

function walk(bin: string, depth: number, out: Leaf[]) {
  const [headRaw, body] = splitHeadBody(bin);
  const h = parseHeaders(decodeBytes(binaryToBytes(headRaw), "utf-8"));
  const ct = parseParams(h["content-type"] || "text/plain");
  const cd = parseParams(h["content-disposition"]);
  const type = ct.value || "text/plain";
  if (type.startsWith("multipart/") && ct.params.boundary && depth < 8) {
    const delim = `--${ct.params.boundary}`;
    const lines = body.split(/\r?\n/);
    let cur: string[] | null = null;
    for (const line of lines) {
      if (line.startsWith(delim)) {
        if (cur) walk(cur.join("\r\n"), depth + 1, out);
        if (line.startsWith(`${delim}--`)) {
          cur = null;
          break;
        }
        cur = [];
      } else if (cur) cur.push(line);
    }
    if (cur && cur.length) walk(cur.join("\r\n"), depth + 1, out); // truncated last part
    return;
  }
  if (type === "message/rfc822" && depth < 8) {
    out.push({
      contentType: type,
      charset: "utf-8",
      encoding: "7bit",
      filename: decodeWords(cd.params.filename || ct.params.name || "") || "message.eml",
      disposition: "attachment",
      body,
    });
    return;
  }
  const filename = cd.params.filename || ct.params.name || null;
  out.push({
    contentType: type,
    charset: ct.params.charset || "utf-8",
    encoding: h["content-transfer-encoding"] || "7bit",
    filename: filename ? decodeWords(filename) : null,
    disposition: cd.value || "inline",
    body,
  });
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Plain-text rendering of HTML for reading only (no markup is ever rendered). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseMessage(
  raw: Uint8Array,
  opts: { truncated?: boolean; maxText?: number } = {},
): MailMessage {
  const maxText = opts.maxText ?? 50_000;
  const bin = bytesToBinary(raw);
  const [headRaw] = splitHeadBody(bin);
  const h = parseHeaders(decodeBytes(binaryToBytes(headRaw), "utf-8"));
  const leaves: Leaf[] = [];
  walk(bin, 0, leaves);

  const isAttachment = (l: Leaf) =>
    l.disposition === "attachment" ||
    (!!l.filename && !l.contentType.startsWith("text/")) ||
    (!l.contentType.startsWith("text/") && !l.contentType.startsWith("multipart/"));
  const bodyLeaves = leaves.filter((l) => !isAttachment(l));
  const plain = bodyLeaves.find((l) => l.contentType === "text/plain");
  const html = bodyLeaves.find((l) => l.contentType === "text/html");
  let text = "";
  let textSource: MailMessage["textSource"] = "none";
  if (plain) {
    text = decodeBytes(decodeTransfer(plain.body, plain.encoding), plain.charset);
    textSource = "plain";
  } else if (html) {
    text = htmlToText(decodeBytes(decodeTransfer(html.body, html.encoding), html.charset));
    textSource = "html";
  }
  text = text.replace(/\r\n/g, "\n").trim();
  let truncated = !!opts.truncated;
  if (text.length > maxText) {
    text = text.slice(0, maxText);
    truncated = true;
  }

  const attachments: AttachmentInfo[] = leaves.filter(isAttachment).map((l) => ({
    filename: l.filename || "(χωρίς όνομα)",
    contentType: l.contentType,
    bytes: decodeTransfer(l.body, l.encoding).length,
  }));

  const ids = (k: string) => parseMessageIds(h[k]);
  return {
    subject: decodeWords(h["subject"] ?? "").trim(),
    from: parseAddressList(h["from"]),
    to: parseAddressList(h["to"]),
    cc: parseAddressList(h["cc"]),
    replyTo: parseAddressList(h["reply-to"]),
    date: h["date"] ? safeIso(h["date"]) : null,
    messageId: ids("message-id")[0] ?? null,
    inReplyTo: ids("in-reply-to")[0] ?? null,
    references: ids("references"),
    text,
    textSource,
    attachments,
    truncated,
  };
}

function safeIso(d: string): string | null {
  const t = Date.parse(d);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
