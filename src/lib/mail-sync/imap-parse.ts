// Pure IMAP response framing + tokenizing (RFC 3501 subset). No network. Unit-tested.

export interface Unit {
  /** Response text; each literal is replaced by \u0000<index>\u0000. */
  text: string;
  literals: Uint8Array[];
}

const CRLF = [13, 10];

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function indexOfCrlf(buf: Uint8Array, from: number): number {
  for (let i = from; i < buf.length - 1; i++) if (buf[i] === CRLF[0] && buf[i + 1] === CRLF[1]) return i;
  return -1;
}

const utf8 = new TextDecoder("utf-8");

/** Incrementally frames raw bytes into complete IMAP response units (handles {n} literals). */
export class ResponseFramer {
  private buf = new Uint8Array(0);
  private pending: Unit | null = null;
  private need = 0; // literal bytes still required for `pending`

  push(chunk: Uint8Array): Unit[] {
    this.buf = concat(this.buf, chunk) as Uint8Array<ArrayBuffer>;
    const out: Unit[] = [];
    for (;;) {
      if (this.pending && this.need > 0) {
        if (this.buf.length < this.need) break;
        this.pending.literals.push(this.buf.slice(0, this.need));
        this.pending.text += `\u0000${this.pending.literals.length - 1}\u0000`;
        this.buf = this.buf.slice(this.need);
        this.need = 0;
      }
      const end = indexOfCrlf(this.buf, 0);
      if (end < 0) break;
      const line = utf8.decode(this.buf.slice(0, end));
      this.buf = this.buf.slice(end + 2);
      const unit = this.pending ?? { text: "", literals: [] };
      const lit = line.match(/\{(\d+)\+?\}$/);
      if (lit) {
        unit.text += line.slice(0, line.length - lit[0].length);
        this.pending = unit;
        this.need = parseInt(lit[1], 10);
        if (this.need === 0) {
          unit.literals.push(new Uint8Array(0));
          unit.text += `\u0000${unit.literals.length - 1}\u0000`;
        }
        continue;
      }
      unit.text += line;
      this.pending = null;
      out.push(unit);
    }
    return out;
  }
}

export type Tok =
  | { t: "atom"; v: string }
  | { t: "str"; v: string }
  | { t: "lit"; v: Uint8Array }
  | { t: "nil" }
  | { t: "list"; v: Tok[] };

/** Tokenize the IMAP s-expression part of a response unit starting at `start`. */
export function tokenize(unit: Unit, start = 0): Tok[] {
  const s = unit.text;
  let i = start;
  function parseList(close: string | null): Tok[] {
    const items: Tok[] = [];
    while (i < s.length) {
      const c = s[i];
      if (c === " ") {
        i++;
        continue;
      }
      if (close && c === close) {
        i++;
        return items;
      }
      if (c === "(") {
        i++;
        items.push({ t: "list", v: parseList(")") });
        continue;
      }
      if (c === '"') {
        i++;
        let v = "";
        while (i < s.length && s[i] !== '"') {
          if (s[i] === "\\" && i + 1 < s.length) i++;
          v += s[i++];
        }
        i++;
        items.push({ t: "str", v });
        continue;
      }
      if (c === "\u0000") {
        const endIdx = s.indexOf("\u0000", i + 1);
        const idx = parseInt(s.slice(i + 1, endIdx), 10);
        items.push({ t: "lit", v: unit.literals[idx] ?? new Uint8Array(0) });
        i = endIdx + 1;
        continue;
      }
      let v = "";
      let depth = 0;
      while (i < s.length) {
        const ch = s[i];
        if (ch === "[") depth++;
        if (ch === "]") depth--;
        if (depth <= 0 && (ch === " " || ch === "(" || ch === ")" || ch === "\u0000")) {
          if (!(ch === "(" && depth > 0)) break;
        }
        v += ch;
        i++;
      }
      if (!v) {
        i++;
        continue;
      }
      items.push(v.toUpperCase() === "NIL" ? { t: "nil" } : { t: "atom", v });
    }
    return items;
  }
  return parseList(null);
}

export function tokText(t: Tok | undefined): string | null {
  if (!t) return null;
  if (t.t === "atom" || t.t === "str") return t.v;
  if (t.t === "lit") return utf8.decode(t.v);
  return null;
}

export interface FetchRecord {
  seq: number;
  uid: number | null;
  internalDate: string | null;
  preview: string | null;
  headerRaw: string | null;
  attachmentNames: string[];
}

/** Collect FILENAME / NAME parameters from a BODYSTRUCTURE token tree. */
export function attachmentNames(t: Tok | undefined): string[] {
  const out: string[] = [];
  function walk(x: Tok) {
    if (x.t !== "list") return;
    for (let k = 0; k < x.v.length; k++) {
      const key = tokText(x.v[k]);
      if (key && /^(filename|name)$/i.test(key) && k + 1 < x.v.length) {
        const val = tokText(x.v[k + 1]);
        if (val && x.v[k + 1].t !== "list") out.push(val);
      }
      walk(x.v[k]);
    }
  }
  if (t) walk(t);
  return Array.from(new Set(out));
}

/** Parse "* <seq> FETCH (...)" units. Returns null for other units. */
export function parseFetch(unit: Unit): FetchRecord | null {
  const m = unit.text.match(/^\* (\d+) FETCH /i);
  if (!m) return null;
  const toks = tokenize(unit, m[0].length);
  const list = toks[0];
  if (!list || list.t !== "list") return null;
  const rec: FetchRecord = { seq: parseInt(m[1], 10), uid: null, internalDate: null, preview: null, headerRaw: null, attachmentNames: [] };
  for (let k = 0; k + 1 < list.v.length; k += 2) {
    const key = (tokText(list.v[k]) ?? "").toUpperCase();
    const val = list.v[k + 1];
    if (key === "UID") rec.uid = parseInt(tokText(val) ?? "", 10) || null;
    else if (key === "INTERNALDATE") rec.internalDate = tokText(val);
    else if (key === "PREVIEW" || key === "SNIPPET") {
      rec.preview = val.t === "list" ? tokText(val.v[1]) : tokText(val);
    } else if (key.startsWith("BODY[HEADER")) rec.headerRaw = tokText(val);
    else if (key === "BODYSTRUCTURE") rec.attachmentNames = attachmentNames(val);
  }
  return rec;
}

/** Parse "* SEARCH 1 2 3" / "* ESEARCH ... ALL 1:3,7". */
export function parseSearch(units: Unit[]): number[] {
  const out: number[] = [];
  for (const u of units) {
    const m = u.text.match(/^\* SEARCH ?(.*)$/i);
    if (m) for (const n of m[1].trim().split(/\s+/)) if (/^\d+$/.test(n)) out.push(parseInt(n, 10));
  }
  return out;
}

export interface ListEntry {
  flags: string[];
  name: string;
}

export function parseList(units: Unit[]): ListEntry[] {
  const out: ListEntry[] = [];
  for (const u of units) {
    const m = u.text.match(/^\* LIST /i);
    if (!m) continue;
    const toks = tokenize(u, m[0].length);
    const flags = toks[0]?.t === "list" ? toks[0].v.map((x) => tokText(x) ?? "") : [];
    const name = tokText(toks[2]) ?? "";
    if (name) out.push({ flags, name });
  }
  return out;
}

export function parseExamine(units: Unit[]): { exists: number; uidvalidity: number | null; uidnext: number | null } {
  let exists = 0;
  let uidvalidity: number | null = null;
  let uidnext: number | null = null;
  for (const u of units) {
    const e = u.text.match(/^\* (\d+) EXISTS/i);
    if (e) exists = parseInt(e[1], 10);
    const v = u.text.match(/\[UIDVALIDITY (\d+)\]/i);
    if (v) uidvalidity = parseInt(v[1], 10);
    const n = u.text.match(/\[UIDNEXT (\d+)\]/i);
    if (n) uidnext = parseInt(n[1], 10);
  }
  return { exists, uidvalidity, uidnext };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** IMAP SEARCH date, e.g. 20-Oct-2026. */
export function imapDate(d: Date): string {
  return `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}
