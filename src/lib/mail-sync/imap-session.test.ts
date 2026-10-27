import { describe, expect, it } from "vitest";
import { ImapError, ImapSession, type Transport } from "./imap.server";

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Scripted fake IMAP server: `reply(cmd, tag)` returns what the server sends back (or null to hang/close). */
function fakeServer(reply: (cmd: string, tag: string) => string | null | "close") {
  const inbox: (Uint8Array | null)[] = [enc.encode("* OK Dovecot ready.\r\n")];
  const waiters: ((v: Uint8Array | null) => void)[] = [];
  const sent: string[] = [];
  const push = (v: Uint8Array | null) => (waiters.length ? waiters.shift()!(v) : inbox.push(v));
  const t: Transport = {
    kind: "fake",
    write: async (d) => {
      const line = dec.decode(d).trimEnd();
      sent.push(line);
      const [tag, ...rest] = line.split(" ");
      const r = reply(rest.join(" "), tag);
      if (r === "close") push(null);
      else if (r !== null) push(enc.encode(r));
    },
    read: () =>
      inbox.length ? Promise.resolve(inbox.shift()!) : new Promise((res) => waiters.push(res)),
    close: async () => {},
  };
  return { t, sent };
}

describe("IMAP session failures", () => {
  it("reports a rejected password as an auth error", async () => {
    const { t } = fakeServer(
      (_c, tag) => `${tag} NO [AUTHENTICATIONFAILED] Authentication failed.\r\n`,
    );
    const s = await ImapSession.fromTransport(t, 500);
    await expect(s.login("info@toreo.gr", "wrong")).rejects.toMatchObject({ kind: "auth" });
  });
  it("reports a dropped connection as a network error", async () => {
    const { t } = fakeServer(() => "close");
    const s = await ImapSession.fromTransport(t, 500);
    await expect(s.examine("INBOX")).rejects.toBeInstanceOf(ImapError);
    await expect(
      ImapSession.fromTransport(fakeServer(() => "close").t, 500).then((x) => x.examine("INBOX")),
    ).rejects.toMatchObject({ kind: "network" });
  });
  it("times out when the server stops answering", async () => {
    const { t } = fakeServer(() => null);
    const s = await ImapSession.fromTransport(t, 200);
    await expect(s.uidSearch("ALL")).rejects.toMatchObject({ kind: "network" });
  });
  it("opens folders read-only and fetches with PEEK (never marks emails as read)", async () => {
    const { t, sent } = fakeServer((c, tag) => {
      if (c.startsWith("EXAMINE"))
        return `* 2 EXISTS\r\n* OK [UIDVALIDITY 7] x\r\n${tag} OK [READ-ONLY] done\r\n`;
      return `${tag} OK done\r\n`;
    });
    const s = await ImapSession.fromTransport(t, 500);
    expect((await s.examine("INBOX")).uidvalidity).toBe(7);
    await s.uidFetch([5]);
    expect(sent.some((l) => /\bSELECT\b|\bSTORE\b|EXPUNGE|\bMOVE\b|\bCOPY\b|APPEND/.test(l))).toBe(
      false,
    );
    expect(sent.find((l) => l.includes("UID FETCH"))).toContain("BODY.PEEK[");
  });
});
