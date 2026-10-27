/* eslint-disable @typescript-eslint/no-explicit-any -- test fixtures build loose Notion JSON */
import { describe, expect, it } from "vitest";
import {
  classifyIncoming,
  decodeWords,
  normalizeSubject,
  parseAddressList,
  parseHeaders,
  parseMessageIds,
  threadRoot,
  mid,
} from "./mime";
import { ResponseFramer, parseFetch, parseList, parseExamine, parseSearch } from "./imap-parse";
import {
  decideIncoming,
  decideOutgoing,
  nextCheckpoint,
  pickEmailSubjectMatch,
  type Target,
} from "./plan";
import {
  LOG_SCHEMA,
  ORDERS_SCHEMA,
  orderCreateProps,
  readOrderPage,
  validateSchema,
} from "./notion-map";

const enc = new TextEncoder();
const target = (status: string | null, via: Target["via"] = "thread_db"): Target => ({
  pageId: "p1",
  record: "ORD-7",
  title: "Βάσεις",
  status,
  customerEmail: "c@x.gr",
  via,
});

describe("headers", () => {
  it("decodes Greek UTF-8 base64 subjects", () => {
    expect(decodeWords("=?UTF-8?B?zqDPgc6/z4PPhs6/z4HOrA==?=")).toBe("Προσφορά");
  });
  it("decodes Greek ISO-8859-7 quoted-printable and joins adjacent words", () => {
    expect(decodeWords("=?iso-8859-7?Q?=D0=F1=EF=F3?= =?iso-8859-7?Q?=F6=EF=F1=DC?=")).toBe(
      "Προσφορά",
    );
  });
  it("parses folded headers, addresses and message ids", () => {
    const h = parseHeaders(
      'From: "Νίκος Π." <Nikos@Example.GR>\r\nReferences: <a@x>\r\n <b@x>\r\nSubject: Re: test\r\n',
    );
    expect(parseAddressList(h.from)).toEqual([{ name: "Νίκος Π.", email: "nikos@example.gr" }]);
    expect(parseMessageIds(h.references)).toEqual(["<a@x>", "<b@x>"]);
    expect(threadRoot(["<a@x>", "<b@x>"], "<b@x>", "<c@x>")).toBe("<a@x>");
    expect(threadRoot([], null, "<c@x>")).toBe("<c@x>");
    expect(mid("<a@x>")).toBe("mid:a@x");
  });
  it("normalizes Re/Fwd/ΑΠ prefixes", () => {
    expect(normalizeSubject("RE: Fwd: ΑΠ:  Βάσεις  TV")).toBe("βάσεις tv");
  });
});

describe("classification", () => {
  const base = { ownAddress: "info@toreo.gr", siteSender: "noreply@toreo.gr" };
  it("keeps real customer mail", () => {
    expect(classifyIncoming({ ...base, headers: {}, from: { name: null, email: "c@x.gr" } })).toBe(
      "customer",
    );
  });
  it("skips own, site notifications, auto-replies and newsletters", () => {
    expect(
      classifyIncoming({ ...base, headers: {}, from: { name: null, email: "info@toreo.gr" } }),
    ).toBe("own");
    expect(
      classifyIncoming({ ...base, headers: {}, from: { name: null, email: "noreply@toreo.gr" } }),
    ).toBe("site_notification");
    expect(
      classifyIncoming({
        ...base,
        headers: { "auto-submitted": "auto-replied" },
        from: { name: null, email: "c@x.gr" },
      }),
    ).toBe("auto");
    expect(
      classifyIncoming({
        ...base,
        headers: { "list-unsubscribe": "<x>" },
        from: { name: null, email: "news@x.gr" },
      }),
    ).toBe("bulk");
    expect(
      classifyIncoming({ ...base, headers: {}, from: { name: null, email: "mailer-daemon@x.gr" } }),
    ).toBe("auto");
  });
});

describe("IMAP framing", () => {
  it("frames literals split across chunks and parses FETCH", () => {
    const header = "From: a@b.gr\r\nMessage-ID: <m1@b>\r\n\r\n";
    const n = enc.encode(header).length;
    const raw = `* 3 FETCH (UID 42 INTERNALDATE "27-Oct-2026 10:00:00 +0200" PREVIEW "Γεια σας" BODYSTRUCTURE (("text" "plain" ("charset" "utf-8") NIL NIL "7bit" 10 1 NIL NIL NIL NIL)("application" "pdf" ("name" "plan.pdf") NIL NIL "base64" 100 NIL ("attachment" ("filename" "plan.pdf")) NIL NIL) "mixed") BODY[HEADER.FIELDS (FROM MESSAGE-ID)] {${n}}\r\n${header})\r\nT1 OK done\r\n`;
    const bytes = enc.encode(raw);
    const f = new ResponseFramer();
    const units = [
      ...f.push(bytes.slice(0, 50)),
      ...f.push(bytes.slice(50, 140)),
      ...f.push(bytes.slice(140)),
    ];
    expect(units).toHaveLength(2);
    const rec = parseFetch(units[0])!;
    expect(rec.uid).toBe(42);
    expect(rec.preview).toBe("Γεια σας");
    expect(rec.attachmentNames).toEqual(["plan.pdf"]);
    expect(parseHeaders(rec.headerRaw!)["message-id"]).toBe("<m1@b>");
  });
  it("parses LIST, EXAMINE and SEARCH", () => {
    const f = new ResponseFramer();
    const u = f.push(
      enc.encode(
        '* LIST (\\UnMarked \\Sent) "." INBOX.Sent\r\n* 109 EXISTS\r\n* OK [UIDVALIDITY 1781611301] x\r\n* OK [UIDNEXT 185] y\r\n* SEARCH 180 181 184\r\n',
      ),
    );
    expect(parseList(u)).toEqual([{ flags: ["\\UnMarked", "\\Sent"], name: "INBOX.Sent" }]);
    expect(parseExamine(u)).toEqual({ exists: 109, uidvalidity: 1781611301, uidnext: 185 });
    expect(parseSearch(u)).toEqual([180, 181, 184]);
  });
});

describe("incoming decisions", () => {
  it("creates a record with Awaiting TOREO Reply when nothing matches", () => {
    const d = decideIncoming(null);
    expect(d.action).toBe("create_order");
    expect(d.setStatus).toBe("Awaiting TOREO Reply");
  });
  it("moves a quoted record back to Awaiting TOREO Reply", () => {
    expect(decideIncoming(target("Quote Sent")).setStatus).toBe("Awaiting TOREO Reply");
  });
  it("keeps production statuses untouched", () => {
    const d = decideIncoming(target("In Production"));
    expect(d.action).toBe("update_order");
    expect(d.setStatus).toBeNull();
  });
  it("matches by sender+subject only when exactly one open record fits", () => {
    const p = (title: string, status: string) => ({
      pageId: title + status,
      record: null,
      title,
      status,
      customerEmail: "c@x.gr",
    });
    expect(pickEmailSubjectMatch([p("Βάσεις TV", "Quote Sent")], "Re: Βάσεις TV")?.status).toBe(
      "Quote Sent",
    );
    expect(pickEmailSubjectMatch([p("Βάσεις TV", "Delivered")], "Re: Βάσεις TV")).toBeNull();
    expect(
      pickEmailSubjectMatch([p("Βάσεις TV", "New"), p("Βάσεις TV", "Replied")], "Βάσεις TV"),
    ).toBeNull();
  });
});

describe("outgoing decisions", () => {
  it("marks Replied only through a known thread and to the record's customer", () => {
    expect(decideOutgoing(target("Awaiting TOREO Reply"), true, null, ["C@x.gr"])).toMatchObject({
      action: "mark_replied",
      setStatus: "Replied",
    });
  });
  it("logs without changing a later status", () => {
    expect(decideOutgoing(target("In Production"), true, null, ["c@x.gr"])).toMatchObject({
      action: "log_only",
      setStatus: null,
    });
  });
  it("treats a forward to a third party (e.g. a supplier) as not a reply", () => {
    expect(
      decideOutgoing(target("Awaiting TOREO Reply"), true, null, ["info@saridis.gr"]),
    ).toMatchObject({ action: "forward_logged", setStatus: null });
  });
  it("sends a reply to manual review when the record has no customer email", () => {
    expect(
      decideOutgoing({ ...target("Awaiting TOREO Reply"), customerEmail: null }, true, null, [
        "c@x.gr",
      ]).action,
    ).toBe("manual_review");
  });
  it("sends unsafe matches to manual review, even with a likely record", () => {
    const hint = {
      pageId: "h",
      record: "ORD-9",
      title: "x",
      status: "Awaiting TOREO Reply",
      customerEmail: "c@x.gr",
    };
    const d = decideOutgoing(null, true, hint);
    expect(d.action).toBe("manual_review");
    expect(d.setStatus).toBeNull();
    expect(d.reason).toContain("ORD-9");
    expect(decideOutgoing(null, false).action).toBe("manual_review");
  });
});

describe("checkpoint", () => {
  it("never moves past a failed message", () => {
    expect(
      nextCheckpoint(10, [
        { uid: 11, ok: true },
        { uid: 12, ok: false },
        { uid: 13, ok: true },
      ]),
    ).toBe(11);
    expect(nextCheckpoint(10, [{ uid: 12, ok: false }])).toBe(10);
    expect(
      nextCheckpoint(10, [
        { uid: 13, ok: true },
        { uid: 11, ok: true },
      ]),
    ).toBe(13);
  });
});

describe("Notion mapping", () => {
  it("accepts the real TOREO schema shape and reports missing options", () => {
    const props: Record<string, any> = {};
    for (const [k, t] of Object.entries(ORDERS_SCHEMA.props)) props[k] = { type: t, [t]: {} };
    props.Status.select = { options: [{ name: "Awaiting TOREO Reply" }, { name: "Replied" }] };
    props.Source.select = { options: [{ name: "Email" }, { name: "Website" }] };
    props.Type.select = { options: [{ name: "Inquiry" }] };
    expect(validateSchema(props, ORDERS_SCHEMA)).toEqual([]);
    props.Status.select = { options: [{ name: "Replied" }] };
    expect(validateSchema(props, ORDERS_SCHEMA)).toEqual([
      "Το πεδίο «Status» δεν έχει την επιλογή «Awaiting TOREO Reply»",
    ]);
    expect(validateSchema({}, LOG_SCHEMA).length).toBe(Object.keys(LOG_SCHEMA.props).length);
  });
  it("builds a new record with Awaiting TOREO Reply and reads the Record ID", () => {
    const p = orderCreateProps({
      subject: "Βάσεις",
      source: "Email",
      customerName: "Ν",
      customerEmail: "c@x.gr",
      receivedAt: "2026-10-27T10:00:00.000Z",
      threadUrl: "mid:a@x",
      nextAction: "Απάντηση",
    }) as any;
    expect(p.Status).toEqual({ select: { name: "Awaiting TOREO Reply" } });
    expect(p["Email Thread"]).toEqual({ url: "mid:a@x" });
    const page = readOrderPage({
      id: "x",
      properties: {
        "Record ID": { unique_id: { prefix: "ORD", number: 7 } },
        Status: { select: { name: "New" } },
        "Request / Order": { title: [{ plain_text: "T" }] },
      },
    });
    expect(page).toMatchObject({ record: "ORD-7", status: "New", title: "T" });
  });
});

describe("Notion error redaction", async () => {
  const { notionErrorCode } = await import("./notion.server");
  it("keeps only the error code, never the message with values", () => {
    expect(
      notionErrorCode(
        '{"object":"error","code":"validation_error","message":"Customer Email c@x.gr invalid"}',
      ),
    ).toBe("validation_error");
    expect(notionErrorCode("<html>secret c@x.gr</html>")).toBe("unknown_error");
    expect(notionErrorCode('{"code":"c@x.gr leaked"}')).toBe("unknown_error");
  });
});

describe("sender classification", async () => {
  const { classifyIncoming } = await import("./mime");
  const c = (email: string, extra: Record<string, unknown> = {}) =>
    classifyIncoming({
      headers: {},
      from: { email, name: null },
      ownAddress: "info@toreo.gr",
      siteSender: null,
      internal: ["owner@gmail.com"],
      ignore: ["xometry.de", "price4parts.com"],
      ...extra,
    });
  it("skips platforms, bulk sending subdomains and internal senders", () => {
    expect(c("oms@mg.xometry.de")).toBe("ignored");
    expect(c("c.sales@price4parts.com")).toBe("ignored");
    expect(c("notify@updates.notion.com")).toBe("bulk");
    expect(c("owner@gmail.com")).toBe("internal");
  });
  it("keeps real customers", () => {
    expect(c("panos@gmail.com")).toBe("customer");
    expect(c("buyer@metlen.com")).toBe("customer");
  });
});
