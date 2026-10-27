import { describe, expect, it } from "vitest";
import {
  ORDER_STATUS_TO_NOTION,
  finalThreadStatus,
  importable,
  planHistory,
  type ExistingPage,
  type HMsg,
  type HSubmission,
  type PlanInput,
} from "./history";
import { mid } from "./mime";

const NOW = Date.parse("2026-10-27T10:00:00Z");
const OWN = "info@toreo.gr";
const d = (s: string) => new Date(s).toISOString();

function msg(p: Partial<HMsg> & { messageId: string }): HMsg {
  return {
    folder: "inbox",
    inReplyTo: null,
    refs: [],
    root: p.messageId,
    fromEmail: "c@client.gr",
    fromName: "Client",
    toEmails: [OWN],
    subject: "Ζήτηση προσφοράς",
    date: d("2026-10-20T09:00:00Z"),
    cls: "customer",
    ...p,
  };
}
const reply = (id: string, to: string, parent: string, date: string): HMsg =>
  msg({
    messageId: id,
    folder: "sent",
    inReplyTo: parent,
    refs: [parent],
    root: parent,
    fromEmail: OWN,
    toEmails: [to],
    date: d(date),
    cls: "outgoing",
  });

function input(p: Partial<PlanInput>): PlanInput {
  return {
    messages: [],
    submissions: [],
    pages: [],
    loggedLinks: new Set(),
    done: new Set(),
    own: OWN,
    now: NOW,
    staleDays: 60,
    ...p,
  };
}

describe("historical import plan", () => {
  it("answered thread becomes one record with final status Replied, not Awaiting", () => {
    const u = planHistory(
      input({ messages: [msg({ messageId: "<a@x>" }), reply("<b@t>", "c@client.gr", "<a@x>", "2026-10-21T09:00:00Z")] }),
    );
    expect(u).toHaveLength(1);
    expect(u[0].action).toBe("new_record");
    expect(u[0].status).toBe("Replied");
    expect(u[0].messages.map((m) => m.logStatus)).toEqual(["Replied", "Replied"]);
  });

  it("unanswered recent thread is Awaiting TOREO Reply", () => {
    const u = planHistory(input({ messages: [msg({ messageId: "<a@x>" })] }));
    expect(u[0].status).toBe("Awaiting TOREO Reply");
    expect(u[0].messages[0].logStatus).toBe("Needs Reply");
  });

  it("thread older than the stale threshold becomes Needs Review, never closed", () => {
    expect(
      finalThreadStatus([{ direction: "incoming", date: d("2026-07-01T00:00:00Z") }], NOW, 60),
    ).toBe("Needs Review");
  });

  it("forward to a supplier does not count as a reply to the customer", () => {
    const u = planHistory(
      input({ messages: [msg({ messageId: "<a@x>" }), reply("<f@t>", "supplier@steel.gr", "<a@x>", "2026-10-21T09:00:00Z")] }),
    );
    expect(u[0].status).toBe("Replied"); // last relevant message is outgoing
    expect(u[0].messages[0].logStatus).toBe("Needs Reply");
    expect(u[0].messages[1].logStatus).toBe("Closed");
  });

  it("existing Notion record found by thread marker is attached without a status change", () => {
    const page: ExistingPage = {
      pageId: "p1",
      record: "ORD-7",
      title: "x",
      status: "In Production",
      customerEmail: "c@client.gr",
      threadUrl: mid("<a@x>"),
      websiteUrl: null,
    };
    const u = planHistory(input({ messages: [msg({ messageId: "<a@x>" })], pages: [page] }));
    expect(u[0].action).toBe("attach");
    expect(u[0].status).toBeNull();
    expect(u[0].target?.pageId).toBe("p1");
  });

  it("already-logged messages are duplicates and a re-run creates nothing", () => {
    const u = planHistory(input({ messages: [msg({ messageId: "<a@x>" })], done: new Set(["<a@x>"]) }));
    expect(u[0].action).toBe("duplicate");
    expect(importable(u, new Map([[u[0].key, u[0].fingerprint]])).go).toHaveLength(0);
  });

  it("website submission plus its later customer email form ONE record", () => {
    const sub: HSubmission = {
      id: "s1",
      email: "c@client.gr",
      name: "Client",
      service: "Laser",
      createdAt: d("2026-10-20T08:30:00Z"),
      orderCode: "TR-0042",
      orderStatus: "quote_sent",
    };
    const u = planHistory(input({ messages: [msg({ messageId: "<a@x>", subject: "Re: TR-0042" })], submissions: [sub] }));
    expect(u).toHaveLength(1);
    expect(u[0].kind).toBe("website");
    expect(u[0].status).toBe("Quote Sent");
    expect(u[0].messages).toHaveLength(1);
  });

  it("site notifications and newsletters are skipped", () => {
    const u = planHistory(input({ messages: [msg({ messageId: "<n@x>", cls: "site_notification" })] }));
    expect(u[0].action).toBe("skip");
  });

  it("two open records for the same customer go to manual review", () => {
    const p = (id: string): ExistingPage => ({
      pageId: id, record: id, title: id, status: "Replied", customerEmail: "c@client.gr", threadUrl: null, websiteUrl: null,
    });
    const u = planHistory(input({ messages: [msg({ messageId: "<a@x>" })], pages: [p("1"), p("2")] }));
    expect(u[0].action).toBe("manual_review");
  });

  it("a unit whose plan changed after the preview is not imported", () => {
    const u = planHistory(input({ messages: [msg({ messageId: "<a@x>" })] }));
    const r = importable(u, new Map([[u[0].key, "stale"]]));
    expect(r.go).toHaveLength(0);
    expect(r.changed).toHaveLength(1);
  });

  it("order status mapping uses Notion options", () => {
    expect(ORDER_STATUS_TO_NOTION.delivered).toBe("Delivered");
    expect(ORDER_STATUS_TO_NOTION.cancelled).toBe("Lost / Cancelled");
    expect(ORDER_STATUS_TO_NOTION.production).toBe("In Production");
  });
});
