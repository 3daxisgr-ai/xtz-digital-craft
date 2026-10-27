/* eslint-disable @typescript-eslint/no-explicit-any -- runtime socket/TLS modules are loaded dynamically and have no shared typings */
// Minimal read-only IMAP client (TLS). Server-only; the password never leaves this module.
// Hosted runtime: secure sockets API. Local dev / tests: node:tls.
import {
  ResponseFramer,
  parseExamine,
  parseFetch,
  parseList,
  parseSearch,
  type FetchRecord,
  type ListEntry,
  type Unit,
} from "./imap-parse";

export interface Transport {
  kind: string;
  write(data: Uint8Array): Promise<void>;
  read(): Promise<Uint8Array | null>;
  close(): Promise<void>;
}

function isWorkerRuntime() {
  return typeof navigator !== "undefined" && (navigator as any).userAgent === "Cloudflare-Workers";
}

async function socketsTransport(host: string, port: number): Promise<Transport> {
  const spec = "cloudflare:sockets";
  const mod: any = await import(/* @vite-ignore */ spec);
  const socket = mod.connect(
    { hostname: host, port },
    { secureTransport: "on", allowHalfOpen: false },
  );
  await socket.opened;
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  return {
    kind: "secure-socket",
    write: (d) => writer.write(d),
    read: async () => {
      const r = await reader.read();
      return r.done ? null : (r.value as Uint8Array);
    },
    close: async () => {
      try {
        await socket.close();
      } catch {
        /* ignore */
      }
    },
  };
}

async function nodeTlsTransport(host: string, port: number, timeoutMs: number): Promise<Transport> {
  const tls: any = await import("node:tls");
  const sock = tls.connect({ host, port, servername: host });
  const queue: (Uint8Array | null)[] = [];
  const waiters: ((v: Uint8Array | null) => void)[] = [];
  const deliver = (v: Uint8Array | null) => {
    const w = waiters.shift();
    if (w) w(v);
    else queue.push(v);
  };
  let failure: Error | null = null;
  sock.on("data", (d: Uint8Array) => deliver(new Uint8Array(d)));
  sock.on("end", () => deliver(null));
  sock.on("close", () => deliver(null));
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error("Λήξη χρόνου σύνδεσης στον mail server")),
      timeoutMs,
    );
    sock.once("secureConnect", () => {
      clearTimeout(t);
      resolve();
    });
    sock.once("error", (e: Error) => {
      clearTimeout(t);
      failure = e;
      reject(e);
    });
  });
  sock.on("error", (e: Error) => {
    failure = e;
    deliver(null);
  });
  return {
    kind: "node-tls",
    write: (d) =>
      new Promise((resolve, reject) =>
        sock.write(d, (e: Error | null) => (e ? reject(e) : resolve())),
      ),
    read: () => {
      if (failure) return Promise.reject(failure);
      if (queue.length) return Promise.resolve(queue.shift()!);
      return new Promise((r) => waiters.push(r));
    },
    close: async () => {
      sock.destroy();
    },
  };
}

export async function openTransport(
  host: string,
  port: number,
  timeoutMs = 10_000,
): Promise<Transport> {
  if (isWorkerRuntime()) {
    try {
      return await withTimeout(
        socketsTransport(host, port),
        timeoutMs,
        "Λήξη χρόνου σύνδεσης στον mail server",
      );
    } catch (e) {
      // Fall back to the Node-compatible TLS layer if the sockets module is unavailable.
      const msg = e instanceof Error ? e.message : String(e);
      if (/timeout|Λήξη/i.test(msg)) throw e;
      return nodeTlsTransport(host, port, timeoutMs);
    }
  }
  return nodeTlsTransport(host, port, timeoutMs);
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export class ImapError extends Error {
  constructor(
    message: string,
    public kind: "auth" | "network" | "protocol",
  ) {
    super(message);
  }
}

const enc = new TextEncoder();

export class ImapSession {
  private framer = new ResponseFramer();
  private ready: Unit[] = [];
  private tag = 0;
  private constructor(
    private t: Transport,
    private cmdTimeoutMs: number,
  ) {}

  get transportKind() {
    return this.t.kind;
  }

  static async open(host: string, port: number, cmdTimeoutMs = 15_000): Promise<ImapSession> {
    let t: Transport;
    try {
      t = await openTransport(host, port);
    } catch (e) {
      throw new ImapError(
        `Δεν ήταν δυνατή η σύνδεση στον mail server: ${(e as Error).message}`,
        "network",
      );
    }
    return ImapSession.fromTransport(t, cmdTimeoutMs);
  }

  /** Start a session over an already-open transport (also used by tests with a fake server). */
  static async fromTransport(t: Transport, cmdTimeoutMs = 15_000): Promise<ImapSession> {
    const s = new ImapSession(t, cmdTimeoutMs);
    const greet = await s.nextUnit();
    if (!/^\* (OK|PREAUTH)/i.test(greet.text)) {
      await t.close();
      throw new ImapError("Μη αναμενόμενη απάντηση από τον mail server", "protocol");
    }
    return s;
  }

  private async nextUnit(): Promise<Unit> {
    const deadline = Date.now() + this.cmdTimeoutMs;
    while (!this.ready.length) {
      const left = deadline - Date.now();
      if (left <= 0) throw new ImapError("Λήξη χρόνου απάντησης από τον mail server", "network");
      const chunk = await withTimeout(
        this.t.read(),
        left,
        "Λήξη χρόνου απάντησης από τον mail server",
      ).catch((e) => {
        throw new ImapError((e as Error).message, "network");
      });
      if (chunk === null) throw new ImapError("Ο mail server έκλεισε τη σύνδεση", "network");
      this.ready.push(...this.framer.push(chunk));
    }
    return this.ready.shift()!;
  }

  /** Run one command; `secret` hides the command from any error text. */
  async command(cmd: string, secret = false): Promise<Unit[]> {
    const tag = `T${++this.tag}`;
    await this.t.write(enc.encode(`${tag} ${cmd}\r\n`));
    const untagged: Unit[] = [];
    for (;;) {
      const u = await this.nextUnit();
      if (u.text.startsWith(`${tag} `)) {
        const status = u.text.slice(tag.length + 1, tag.length + 4).toUpperCase();
        if (status.startsWith("OK")) return untagged;
        const label = secret ? "Σύνδεση" : cmd.split(" ")[0];
        const detail = u.text.slice(tag.length + 1);
        if (/AUTHENTICATIONFAILED|AUTHORIZATIONFAILED/i.test(detail))
          throw new ImapError("Ο mail server απέρριψε το όνομα χρήστη ή τον κωδικό", "auth");
        throw new ImapError(`${label}: ${detail.slice(0, 200)}`, "protocol");
      }
      untagged.push(u);
    }
  }

  async login(user: string, password: string) {
    const b64 = btoa(String.fromCharCode(...enc.encode(`\u0000${user}\u0000${password}`)));
    await this.command(`AUTHENTICATE PLAIN ${b64}`, true);
  }

  async list(): Promise<ListEntry[]> {
    return parseList(await this.command('LIST "" "*" RETURN (SPECIAL-USE)'));
  }

  /** Read-only open: never changes flags or contents. */
  async examine(folder: string) {
    return parseExamine(await this.command(`EXAMINE ${quote(folder)}`));
  }

  async uidSearch(criteria: string): Promise<number[]> {
    return parseSearch(await this.command(`UID SEARCH ${criteria}`));
  }

  async uidFetch(uids: number[]): Promise<FetchRecord[]> {
    if (!uids.length) return [];
    const fields =
      "FROM TO CC REPLY-TO SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES AUTO-SUBMITTED X-AUTOREPLY X-AUTORESPOND PRECEDENCE LIST-ID LIST-UNSUBSCRIBE X-TOREO-ORDER-ID X-TOREO-SUBMISSION-ID";
    const base = `UID FETCH ${uids.join(",")} (UID INTERNALDATE BODYSTRUCTURE BODY.PEEK[HEADER.FIELDS (${fields})]`;
    let units: Unit[];
    try {
      units = await this.command(`${base} PREVIEW)`);
    } catch (e) {
      if (e instanceof ImapError && e.kind === "protocol") units = await this.command(`${base})`);
      else throw e;
    }
    return units.map(parseFetch).filter((r): r is FetchRecord => !!r && r.uid != null);
  }

  async logout() {
    try {
      await this.command("LOGOUT");
    } catch {
      /* ignore */
    }
    await this.t.close();
  }

  async close() {
    await this.t.close();
  }
}

function quote(s: string) {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export const PAPAKI = { host: "mail-gr.securemail.pro", port: 993, user: "info@toreo.gr" };
