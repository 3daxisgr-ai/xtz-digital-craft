// Pure SMTP reply framing + EHLO capability parsing (RFC 5321). No network. Unit-tested.

export interface SmtpReply {
  code: number;
  lines: string[];
}

/** Frames raw bytes into complete (possibly multi-line "250-...") SMTP replies. */
export class SmtpReplyReader {
  private buf = "";
  private lines: string[] = [];
  private dec = new TextDecoder("utf-8");

  push(chunk: Uint8Array): SmtpReply[] {
    this.buf += this.dec.decode(chunk, { stream: true });
    const out: SmtpReply[] = [];
    for (;;) {
      const i = this.buf.indexOf("\n");
      if (i < 0) break;
      const line = this.buf.slice(0, i).replace(/\r$/, "");
      this.buf = this.buf.slice(i + 1);
      const m = line.match(/^(\d{3})([ -]?)(.*)$/);
      if (!m) continue;
      this.lines.push(m[3]);
      if (m[2] !== "-") {
        out.push({ code: parseInt(m[1], 10), lines: this.lines });
        this.lines = [];
      }
    }
    return out;
  }
}

export interface EhloInfo {
  server: string;
  extensions: string[];
  auth: string[];
  maxSize: number | null;
  startTls: boolean;
  smtpUtf8: boolean;
  eightBitMime: boolean;
  pipelining: boolean;
}

export function parseEhlo(reply: SmtpReply): EhloInfo {
  const [first = "", ...rest] = reply.lines;
  const ext = rest.map((l) => l.trim()).filter(Boolean);
  const upper = ext.map((e) => e.toUpperCase());
  const auth = new Set<string>();
  for (const e of upper) {
    const m = e.match(/^AUTH[ =](.*)$/);
    if (m) for (const a of m[1].split(/\s+/)) if (a) auth.add(a);
  }
  const size = upper.find((e) => /^SIZE\b/.test(e));
  const n = size ? parseInt(size.split(/\s+/)[1] ?? "", 10) : NaN;
  return {
    server: first.split(/\s+/)[0] ?? "",
    extensions: ext,
    auth: Array.from(auth),
    maxSize: Number.isFinite(n) && n > 0 ? n : null,
    startTls: upper.includes("STARTTLS"),
    smtpUtf8: upper.includes("SMTPUTF8"),
    eightBitMime: upper.includes("8BITMIME"),
    pipelining: upper.includes("PIPELINING"),
  };
}

/** Commands the capability check may ever send. Anything that could send mail is excluded. */
export const SMTP_ALLOWED = ["EHLO", "AUTH", "QUIT"] as const;

export function assertAllowedSmtp(cmd: string) {
  const verb = cmd.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  if (!(SMTP_ALLOWED as readonly string[]).includes(verb))
    throw new Error(`SMTP command not allowed in read-only check: ${verb}`);
}
