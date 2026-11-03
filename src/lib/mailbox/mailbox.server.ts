// Read-only mailbox access for the admin email assistant (server-only).
// IMAP: EXAMINE + BODY.PEEK only — never STORE/MOVE/COPY/EXPUNGE/APPEND, so flags and
// messages are never changed. SMTP: EHLO (+ optional AUTH) then QUIT — never MAIL/RCPT/DATA.
// The password is read from the encrypted project secret inside each call and never returned or logged.
import { ImapError, ImapSession, PAPAKI, openTransport } from "../mail-sync/imap.server";
import { parseFetch, tokText, tokenize } from "../mail-sync/imap-parse";
import { cleanSnippet, decodeWords, parseAddressList, parseHeaders } from "../mail-sync/mime";
import { parseMessage, type MailMessage } from "./message";
import { SmtpReplyReader, assertAllowedSmtp, parseEhlo, type EhloInfo, type SmtpReply } from "./smtp";

export const SMTP = { host: PAPAKI.host, port: 465 };
const MAX_MESSAGE_BYTES = 512 * 1024;

export class MailboxError extends Error {
  constructor(
    message: string,
    public kind: "not_configured" | "auth" | "network" | "protocol" | "input",
  ) {
    super(message);
  }
}

function password(): string {
  const p = process.env.PAPAKI_EMAIL_PASSWORD;
  if (!p) throw new MailboxError("Δεν έχει οριστεί ο κωδικός του mailbox (PAPAKI_EMAIL_PASSWORD).", "not_configured");
  return p;
}

function wrap(e: unknown): MailboxError {
  if (e instanceof MailboxError) return e;
  if (e instanceof ImapError) return new MailboxError(e.message, e.kind);
  return new MailboxError(e instanceof Error ? e.message : String(e), "protocol");
}

async function withSession<T>(fn: (s: ImapSession) => Promise<T>): Promise<T> {
  const pw = password();
  let s: ImapSession | null = null;
  try {
    s = await ImapSession.open(PAPAKI.host, PAPAKI.port);
    await s.login(PAPAKI.user, pw);
    return await fn(s);
  } catch (e) {
    throw wrap(e);
  } finally {
    if (s) await s.logout().catch(() => undefined);
  }
}

export interface FolderInfo {
  name: string;
  flags: string[];
  role: "inbox" | "sent" | "drafts" | "trash" | "junk" | "archive" | null;
}

function roleOf(name: string, flags: string[]): FolderInfo["role"] {
  const f = flags.map((x) => x.toLowerCase());
  if (name.toUpperCase() === "INBOX") return "inbox";
  if (f.includes("\\sent") || /^(inbox[./])?sent( items| messages)?$/i.test(name)) return "sent";
  if (f.includes("\\drafts") || /drafts?$/i.test(name)) return "drafts";
  if (f.includes("\\trash") || /(trash|deleted)/i.test(name)) return "trash";
  if (f.includes("\\junk") || /(junk|spam)/i.test(name)) return "junk";
  if (f.includes("\\archive") || /archive/i.test(name)) return "archive";
  return null;
}

async function folders(s: ImapSession): Promise<FolderInfo[]> {
  return (await s.list())
    .filter((f) => !f.flags.some((x) => /\\noselect|\\nonexistent/i.test(x)))
    .map((f) => ({ name: f.name, flags: f.flags, role: roleOf(f.name, f.flags) }));
}

async function requireFolder(s: ImapSession, name: string): Promise<FolderInfo> {
  const found = (await folders(s)).find((f) => f.name === name);
  if (!found) throw new MailboxError("Ο φάκελος δεν υπάρχει στο mailbox.", "input");
  return found;
}

export interface ConnectionReport {
  ok: true;
  account: string;
  server: string;
  transport: string;
  ms: number;
  capabilities: string[];
  readOnlyCapable: boolean;
  folders: (FolderInfo & { exists?: number })[];
  inbox: { exists: number; uidvalidity: number | null; uidnext: number | null };
}

/** LOGIN + CAPABILITY + LIST + EXAMINE INBOX (+ counts for Sent). Changes nothing. */
export async function testConnection(): Promise<ConnectionReport> {
  const t0 = Date.now();
  return withSession(async (s) => {
    const caps = await s.capability();
    const fs = await folders(s);
    const inbox = await s.examine("INBOX");
    const out: ConnectionReport["folders"] = [];
    for (const f of fs) {
      if (f.role === "inbox") out.push({ ...f, exists: inbox.exists });
      else if (f.role === "sent") out.push({ ...f, exists: (await s.examine(f.name)).exists });
      else out.push(f);
    }
    return {
      ok: true,
      account: PAPAKI.user,
      server: `${PAPAKI.host}:${PAPAKI.port} (TLS)`,
      transport: s.transportKind,
      ms: Date.now() - t0,
      capabilities: caps,
      readOnlyCapable: true, // EXAMINE is core IMAP4rev1
      folders: out,
      inbox,
    };
  });
}

export interface MessageRow {
  uid: number;
  date: string | null;
  from: { name: string | null; email: string } | null;
  to: string[];
  subject: string;
  preview: string;
  attachments: string[];
}

/** Newest-first header list for one folder. `beforeUid` pages further back. */
export async function listMessages(opts: {
  folder: string;
  limit: number;
  beforeUid?: number;
}): Promise<{ folder: string; total: number; rows: MessageRow[]; nextBeforeUid: number | null }> {
  return withSession(async (s) => {
    await requireFolder(s, opts.folder);
    const box = await s.examine(opts.folder);
    if (!box.exists) return { folder: opts.folder, total: 0, rows: [], nextBeforeUid: null };
    const range = opts.beforeUid ? `1:${Math.max(1, opts.beforeUid - 1)}` : "1:*";
    let uids = (await s.uidSearch(`UID ${range}`)).sort((a, b) => a - b);
    if (opts.beforeUid) uids = uids.filter((u) => u < opts.beforeUid!);
    const page = uids.slice(-opts.limit);
    const recs = await s.uidFetch(page);
    const rows: MessageRow[] = recs
      .map((r) => {
        const h = parseHeaders(r.headerRaw ?? "");
        const from = parseAddressList(h["from"])[0] ?? null;
        const dateRaw = h["date"] ?? r.internalDate;
        const t = dateRaw ? Date.parse(dateRaw) : NaN;
        return {
          uid: r.uid!,
          date: Number.isFinite(t) ? new Date(t).toISOString() : null,
          from,
          to: parseAddressList(h["to"]).map((a) => a.email),
          subject: decodeWords(h["subject"] ?? "").trim(),
          preview: cleanSnippet(r.preview, 160),
          attachments: r.attachmentNames.map((n) => decodeWords(n)),
        };
      })
      .sort((a, b) => b.uid - a.uid);
    const oldest = page[0];
    return {
      folder: opts.folder,
      total: box.exists,
      rows,
      nextBeforeUid: oldest && uids.indexOf(oldest) > 0 ? oldest : null,
    };
  });
}

export type MessageView = MailMessage & { uid: number; folder: string; sizeBytes: number | null };

/** One message, read with BODY.PEEK (the \Seen flag is never set). Not stored anywhere. */
export async function getMessage(opts: { folder: string; uid: number }): Promise<MessageView> {
  return withSession(async (s) => {
    await requireFolder(s, opts.folder);
    await s.examine(opts.folder);
    const units = await s.command(
      `UID FETCH ${opts.uid} (UID RFC822.SIZE BODY.PEEK[]<0.${MAX_MESSAGE_BYTES}>)`,
    );
    for (const u of units) {
      if (!parseFetch(u)) continue;
      const list = tokenize(u, (u.text.match(/^\* \d+ FETCH /i) ?? [""])[0].length)[0];
      if (!list || list.t !== "list") continue;
      let raw: Uint8Array | null = null;
      let size: number | null = null;
      let uid: number | null = null;
      for (let k = 0; k + 1 < list.v.length; k += 2) {
        const key = (tokText(list.v[k]) ?? "").toUpperCase();
        const val = list.v[k + 1];
        if (key === "UID") uid = parseInt(tokText(val) ?? "", 10) || null;
        else if (key === "RFC822.SIZE") size = parseInt(tokText(val) ?? "", 10) || null;
        else if (key.startsWith("BODY[]")) raw = val.t === "lit" ? val.v : new TextEncoder().encode(tokText(val) ?? "");
      }
      if (uid !== opts.uid || !raw) continue;
      const msg = parseMessage(raw, { truncated: size != null && size > raw.length });
      return { ...msg, uid: opts.uid, folder: opts.folder, sizeBytes: size };
    }
    throw new MailboxError("Το μήνυμα δεν βρέθηκε.", "input");
  });
}

export interface SmtpReport {
  host: string;
  port: number;
  security: "implicit TLS";
  reachable: boolean;
  transport: string | null;
  ms: number;
  greeting: string | null;
  ehlo: EhloInfo | null;
  login: "ok" | "rejected" | "skipped" | "unsupported" | "not_reached";
  sent: false;
  error: string | null;
}

/** SMTP capability check: connect, EHLO, optional AUTH, QUIT. Never sends mail. */
export async function assessSmtp(opts: { verifyLogin: boolean }): Promise<SmtpReport> {
  const t0 = Date.now();
  const rep: SmtpReport = {
    host: SMTP.host,
    port: SMTP.port,
    security: "implicit TLS",
    reachable: false,
    transport: null,
    ms: 0,
    greeting: null,
    ehlo: null,
    login: "not_reached",
    sent: false,
    error: null,
  };
  const pw = opts.verifyLogin ? password() : null;
  let t: Awaited<ReturnType<typeof openTransport>> | null = null;
  try {
    t = await openTransport(SMTP.host, SMTP.port, 10_000);
    rep.reachable = true;
    rep.transport = t.kind;
    const reader = new SmtpReplyReader();
    const queue: SmtpReply[] = [];
    const tr = t;
    const next = async (): Promise<SmtpReply> => {
      const deadline = Date.now() + 15_000;
      while (!queue.length) {
        const left = deadline - Date.now();
        if (left <= 0) throw new Error("Λήξη χρόνου απάντησης SMTP");
        const chunk = await Promise.race([
          tr.read(),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Λήξη χρόνου απάντησης SMTP")), left)),
        ]);
        if (chunk === null) throw new Error("Ο SMTP server έκλεισε τη σύνδεση");
        queue.push(...reader.push(chunk));
      }
      return queue.shift()!;
    };
    const send = async (cmd: string) => {
      assertAllowedSmtp(cmd);
      await tr.write(new TextEncoder().encode(`${cmd}\r\n`));
      return next();
    };
    const greet = await next();
    rep.greeting = `${greet.code} ${greet.lines[0] ?? ""}`.slice(0, 160);
    if (greet.code !== 220) throw new Error(`Απρόσμενος χαιρετισμός SMTP (${greet.code})`);
    const ehlo = await send("EHLO toreo.gr");
    if (ehlo.code !== 250) throw new Error(`Το EHLO απορρίφθηκε (${ehlo.code})`);
    rep.ehlo = parseEhlo(ehlo);
    if (!pw) rep.login = "skipped";
    else if (!rep.ehlo.auth.includes("PLAIN")) rep.login = "unsupported";
    else {
      const enc = new TextEncoder().encode(`\u0000${PAPAKI.user}\u0000${pw}`);
      const r = await send(`AUTH PLAIN ${btoa(String.fromCharCode(...enc))}`);
      rep.login = r.code === 235 ? "ok" : "rejected";
    }
    await send("QUIT").catch(() => undefined);
  } catch (e) {
    rep.error = (e instanceof Error ? e.message : String(e)).slice(0, 200);
  } finally {
    if (t) await t.close().catch(() => undefined);
    rep.ms = Date.now() - t0;
  }
  return rep;
}
