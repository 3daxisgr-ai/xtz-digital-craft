import { describe, expect, it } from "vitest";
import {
  duplicateCandidates,
  nextStatus,
  orderCodesIn,
  planCanonical,
  planReplyTasks,
  type CMsg,
  type CRequest,
  type CSubmission,
  type CanonInput,
  type CanonPlan,
} from "./canonical";

const NOW = Date.parse("2026-10-27T10:00:00Z");
const OWN = "info@toreo.gr";
const CUST = "maria@client.gr";
const iso = (s: string) => new Date(s).toISOString();

const sub = (p: Partial<CSubmission> = {}): CSubmission => ({
  id: "s1",
  email: CUST,
  name: "Maria",
  service: "Laser cutting",
  createdAt: iso("2026-10-20T09:00:00Z"),
  orderCode: "TR-2026-0030",
  orderStatus: "quote_received",
  contentKey: "k1",
  ...p,
});
const m = (p: Partial<CMsg> & { messageId: string }): CMsg => ({
  folder: "inbox",
  inReplyTo: null,
  refs: [],
  fromEmail: CUST,
  fromName: "Maria",
  toEmails: [OWN],
  replyTo: null,
  subject: "Ερώτηση",
  date: iso("2026-10-20T10:00:00Z"),
  cls: "customer",
  ...p,
});
const sent = (
  id: string,
  to: string[],
  parent: string | null,
  date: string,
  subject = "Re: Ερώτηση",
): CMsg =>
  m({
    messageId: id,
    folder: "sent",
    fromEmail: OWN,
    toEmails: to,
    inReplyTo: parent,
    refs: parent ? [parent] : [],
    subject,
    date: iso(date),
    cls: "outgoing",
  });
const input = (p: Partial<CanonInput>): CanonInput => ({
  submissions: [],
  messages: [],
  requests: [],
  keys: new Map(),
  removedKeys: new Set(),
  own: OWN,
  now: NOW,
  staleDays: 60,
  statusMap: { quote_received: "New", production: "In Production" },
  ...p,
});
const existing = (p: Partial<CRequest> & { id: string }): CRequest => ({
  orderCode: "TR-2026-0040",
  customerEmail: CUST,
  subject: "Βάσεις οθόνης",
  status: "Awaiting TOREO Reply",
  receivedAt: iso("2026-10-10T09:00:00Z"),
  lastActivity: iso("2026-10-10T09:00:00Z"),
  ...p,
});
/** Feed a plan's results back in, as the server does after applying it. */
function asExisting(plan: CanonPlan, codes: Record<string, string>) {
  const requests: CRequest[] = [];
  const keys = new Map<string, string>();
  for (const r of plan.requests) {
    const id = r.isNew ? `page:${r.id}` : r.id;
    requests.push({
      id,
      orderCode: r.orderCode ?? codes[r.id],
      customerEmail: r.customerEmail,
      subject: r.subject,
      status: r.status,
      receivedAt: r.receivedAt,
      lastActivity: r.lastActivity,
    });
    for (const k of r.keys) keys.set(k, id);
  }
  return { requests, keys };
}

describe("one canonical record per real request", () => {
  const notification = m({
    messageId: "<n1@site>",
    fromEmail: "noreply@toreo.gr",
    cls: "site_notification",
    replyTo: CUST,
    subject: "🚀 New Quote Request - TOREO",
    date: iso("2026-10-20T09:00:20Z"),
  });
  const toreoReply = sent(
    "<r1@toreo>",
    [CUST],
    "<n1@site>",
    "2026-10-20T12:00:00Z",
    "Re: 🚀 New Quote Request - TOREO",
  );
  const customerReply = m({
    messageId: "<c2@client>",
    inReplyTo: "<r1@toreo>",
    refs: ["<n1@site>", "<r1@toreo>"],
    subject: "Re: Re: 🚀 New Quote Request - TOREO",
    date: iso("2026-10-22T08:00:00Z"),
  });
  const separateEmail = m({
    messageId: "<c1@client>",
    subject: "Σχέδια για την παραγγελία",
    date: iso("2026-10-20T15:00:00Z"),
  });

  it("website + notification + customer emails + replies => exactly one order", () => {
    const plan = planCanonical(
      input({
        submissions: [sub()],
        messages: [notification, toreoReply, separateEmail, customerReply],
      }),
    );
    expect(plan.requests).toHaveLength(1);
    const r = plan.requests[0];
    expect(r.orderCode).toBe("TR-2026-0030");
    expect(r.source).toBe("Website");
    expect(plan.attachments.map((a) => a.role).sort()).toEqual(
      ["customer", "customer", "notification", "reply", "website"].sort(),
    );
    expect(plan.review).toHaveLength(0);
    // Customer wrote last -> needs a reply again.
    expect(r.replyState).toBe("Needs Reply");
  });

  it("the notification email attaches to the website order (by submission header too)", () => {
    const plan = planCanonical(
      input({
        submissions: [sub()],
        messages: [m({ ...notification, replyTo: null, hdrSubmissionId: "s1" })],
      }),
    );
    expect(plan.requests).toHaveLength(1);
    expect(plan.attachments.find((a) => a.key === "<n1@site>")?.role).toBe("notification");
  });

  it("a repeat run creates nothing new and keeps every Order ID", () => {
    const msgs = [
      notification,
      toreoReply,
      separateEmail,
      customerReply,
      m({ messageId: "<x1@other>", fromEmail: "nikos@other.gr" }),
    ];
    const first = planCanonical(input({ submissions: [sub()], messages: msgs }));
    expect(first.requests.filter((r) => r.isNew)).toHaveLength(2);
    const codes = { [first.requests[1].id]: "TR-2026-0031" };
    const state = asExisting(first, codes);
    const second = planCanonical(input({ submissions: [sub()], messages: msgs, ...state }));
    expect(second.requests.filter((r) => r.isNew)).toHaveLength(0);
    expect(second.requests.map((r) => r.orderCode).sort()).toEqual([
      "TR-2026-0030",
      "TR-2026-0031",
    ]);
    expect(
      second.attachments.every((a) =>
        state.keys.has(a.role === "website" ? "submission:s1" : `msg:${a.key}`),
      ),
    ).toBe(true);
  });

  it("webhook retries / double submissions of the same request become one record", () => {
    const plan = planCanonical(
      input({
        submissions: [sub(), sub({ id: "s2", createdAt: iso("2026-10-20T09:00:05Z") })],
      }),
    );
    expect(plan.requests).toHaveLength(1);
    expect(plan.requests[0].submissionIds.sort()).toEqual(["s1", "s2"]);
  });

  it("two different website Order IDs stay two orders", () => {
    const plan = planCanonical(
      input({
        submissions: [
          sub(),
          sub({ id: "s2", orderCode: "TR-2026-0031", createdAt: iso("2026-10-20T09:05:00Z") }),
        ],
      }),
    );
    expect(plan.requests.map((r) => r.orderCode).sort()).toEqual(["TR-2026-0030", "TR-2026-0031"]);
  });

  it("email-only requests get no ID from the planner (allocated once, centrally)", () => {
    const plan = planCanonical(input({ messages: [m({ messageId: "<a@c>" })] }));
    expect(plan.requests[0].isNew).toBe(true);
    expect(plan.requests[0].orderCode).toBeNull();
  });

  it("an explicit Order ID in the subject attaches to that order", () => {
    const plan = planCanonical(
      input({
        requests: [existing({ id: "p1" })],
        keys: new Map([["order:TR-2026-0040", "p1"]]),
        messages: [
          m({
            messageId: "<z@c>",
            fromEmail: "colleague@client.gr",
            subject: "Για το TR-2026-0040",
          }),
        ],
      }),
    );
    expect(plan.requests).toHaveLength(1);
    expect(plan.attachments[0]).toMatchObject({ requestId: "p1", via: "order_id" });
  });

  it("ambiguous matches go to review, never to a new record", () => {
    const plan = planCanonical(
      input({
        requests: [
          existing({ id: "p1", subject: "Α" }),
          existing({
            id: "p2",
            orderCode: "TR-2026-0041",
            subject: "Β",
            receivedAt: iso("2026-10-12T09:00:00Z"),
          }),
        ],
        messages: [
          m({ messageId: "<q@c>", subject: "Κάτι άλλο", date: iso("2026-10-15T09:00:00Z") }),
        ],
      }),
    );
    expect(plan.requests.filter((r) => r.isNew)).toHaveLength(0);
    expect(plan.review).toHaveLength(1);
    expect(plan.review[0].candidates.sort()).toEqual(["TR-2026-0040", "TR-2026-0041"]);
  });

  it("records the owner removed in Notion are never recreated", () => {
    const plan = planCanonical(
      input({
        submissions: [sub()],
        messages: [m({ messageId: "<old@c>" })],
        removedKeys: new Set(["submission:s1", "msg:<old@c>"]),
      }),
    );
    expect(plan.requests).toHaveLength(0);
  });
});

describe("reply state from INBOX + Sent", () => {
  const base = existing({ id: "p1" });
  const keys = new Map([["msg:<in1@c>", "p1"]]);
  const in1 = m({ messageId: "<in1@c>", date: iso("2026-10-10T09:00:00Z") });

  it("a sent reply to the customer clears a false 'needs reply'", () => {
    const plan = planCanonical(
      input({
        requests: [base],
        keys,
        messages: [in1, sent("<s1@t>", [CUST], "<in1@c>", "2026-10-11T09:00:00Z")],
      }),
    );
    const r = plan.requests[0];
    expect(r.replyState).toBe("Replied");
    expect(r.status).toBe("Replied");
    expect(plan.attachments.find((a) => a.key === "<in1@c>")?.logStatus).toBe("Replied");
    const tasks = planReplyTasks(
      r.replyState,
      [
        {
          id: "t1",
          status: "Not Started",
          category: "Customer Reply",
          lastEdited: iso("2026-10-10T09:01:00Z"),
        },
      ],
      r.lastCustomerAt,
    );
    expect(tasks).toEqual({ create: false, done: ["t1"], cancel: [] });
  });

  it("a forward to a supplier does not count as a reply", () => {
    const plan = planCanonical(
      input({
        requests: [base],
        keys,
        messages: [
          in1,
          sent("<f1@t>", ["sales@supplier.com"], "<in1@c>", "2026-10-11T09:00:00Z", "Fwd: Ερώτηση"),
        ],
      }),
    );
    expect(plan.requests[0].replyState).toBe("Needs Reply");
    expect(plan.requests[0].status).toBeNull(); // stays Awaiting TOREO Reply
    expect(plan.attachments.find((a) => a.key === "<f1@t>")).toMatchObject({
      role: "forward",
      logStatus: "Closed",
    });
  });

  it("an unrelated TOREO email is not a reply and is left for review", () => {
    const plan = planCanonical(
      input({
        requests: [base],
        keys,
        messages: [in1, sent("<u1@t>", [CUST], null, "2026-10-11T09:00:00Z", "Newsletter")],
      }),
    );
    expect(plan.requests[0].replyState).toBe("Needs Reply");
    expect(plan.review.map((r) => r.key)).toEqual(["<u1@t>"]);
  });

  it("the customer's latest message reopens 'needs reply', with one task only", () => {
    const plan = planCanonical(
      input({
        requests: [{ ...base, status: "Replied" }],
        keys,
        messages: [
          in1,
          sent("<s1@t>", [CUST], "<in1@c>", "2026-10-11T09:00:00Z"),
          m({
            messageId: "<in2@c>",
            inReplyTo: "<s1@t>",
            refs: ["<in1@c>", "<s1@t>"],
            date: iso("2026-10-12T09:00:00Z"),
          }),
        ],
      }),
    );
    const r = plan.requests[0];
    expect(r.replyState).toBe("Needs Reply");
    expect(r.status).toBe("Awaiting TOREO Reply");
    expect(plan.requests).toHaveLength(1);
    const two = [
      {
        id: "t1",
        status: "Not Started",
        category: "Customer Reply",
        lastEdited: iso("2026-10-12T09:01:00Z"),
      },
      {
        id: "t2",
        status: "Waiting",
        category: "Customer Reply",
        lastEdited: iso("2026-10-12T09:02:00Z"),
      },
    ];
    expect(planReplyTasks("Needs Reply", two, r.lastCustomerAt)).toEqual({
      create: false,
      done: [],
      cancel: ["t2"],
    });
    expect(planReplyTasks("Needs Reply", [], r.lastCustomerAt).create).toBe(true);
  });

  it("a reply task a person closed after the last customer message stays closed", () => {
    const closed = [
      {
        id: "t1",
        status: "Cancelled",
        category: "Customer Reply",
        lastEdited: iso("2026-10-13T09:00:00Z"),
      },
    ];
    expect(planReplyTasks("Needs Reply", closed, iso("2026-10-12T09:00:00Z")).create).toBe(false);
    expect(planReplyTasks("Needs Reply", closed, iso("2026-10-14T09:00:00Z")).create).toBe(true);
  });

  it("uses message timestamps, not processing order", () => {
    const plan = planCanonical(
      input({
        requests: [base],
        keys,
        // Sent reply listed first but is older than the customer's follow-up.
        messages: [
          sent("<s1@t>", [CUST], "<in1@c>", "2026-10-11T09:00:00Z"),
          m({ messageId: "<in2@c>", inReplyTo: "<s1@t>", date: iso("2026-10-12T09:00:00Z") }),
          in1,
        ],
      }),
    );
    expect(plan.requests[0].replyState).toBe("Needs Reply");
  });

  it("terminal and production statuses are never overwritten by mail", () => {
    for (const s of [
      "Delivered",
      "Lost / Cancelled",
      "In Production",
      "Quote Sent",
      "Confirmed Order",
      "On Hold",
    ]) {
      expect(nextStatus(s, "Needs Reply", iso("2026-10-26T09:00:00Z"), NOW, 60)).toBeNull();
      expect(nextStatus(s, "Replied", iso("2026-10-26T09:00:00Z"), NOW, 60)).toBeNull();
    }
    const plan = planCanonical(
      input({
        requests: [{ ...base, status: "In Production" }],
        keys,
        messages: [in1, sent("<s1@t>", [CUST], "<in1@c>", "2026-10-11T09:00:00Z")],
      }),
    );
    expect(plan.requests[0].status).toBeNull();
    expect(plan.requests[0].replyState).toBe("Replied");
  });

  it("a reply never creates a second order", () => {
    const plan = planCanonical(
      input({
        requests: [base],
        keys,
        messages: [
          in1,
          m({
            messageId: "<in2@c>",
            inReplyTo: "<in1@c>",
            refs: ["<in1@c>"],
            subject: "Re: Ερώτηση",
          }),
        ],
      }),
    );
    expect(plan.requests).toHaveLength(1);
  });
});

describe("ids and duplicate review", () => {
  it("finds TOREO Order IDs in subjects", () => {
    expect(orderCodesIn("Re: Quote Request Received – tr-2026-0021", null)).toEqual([
      "TR-2026-0021",
    ]);
  });

  it("flags same-customer records with the same subject or close dates, not merged", () => {
    const d = duplicateCandidates([
      {
        id: "a",
        label: "TR-2026-0001",
        customerEmail: CUST,
        subject: "RFQ – Prototype",
        receivedAt: iso("2026-09-01T00:00:00Z"),
        status: "Replied",
      },
      {
        id: "b",
        label: "TR-2026-0002",
        customerEmail: CUST,
        subject: "Re: RFQ – Prototype",
        receivedAt: iso("2026-10-20T00:00:00Z"),
        status: "Replied",
      },
      {
        id: "c",
        label: "TR-2026-0003",
        customerEmail: CUST,
        subject: "Άλλο",
        receivedAt: iso("2026-12-20T00:00:00Z"),
        status: "New",
      },
      {
        id: "d",
        label: "TR-2026-0004",
        customerEmail: CUST,
        subject: "RFQ – Prototype",
        receivedAt: iso("2026-09-02T00:00:00Z"),
        status: "Delivered",
      },
    ]);
    expect(d.get("a")).toEqual(["TR-2026-0002"]);
    expect(d.get("b")).toEqual(["TR-2026-0001"]);
    expect(d.has("c")).toBe(false);
    expect(d.has("d")).toBe(false);
  });

  it("a pair marked 'Not a duplicate' is not flagged again", () => {
    const d = duplicateCandidates([
      {
        id: "a",
        label: "A",
        customerEmail: CUST,
        subject: "X",
        receivedAt: iso("2026-09-01T00:00:00Z"),
        status: "New",
        duplicateCheck: "Not a duplicate",
      },
      {
        id: "b",
        label: "B",
        customerEmail: CUST,
        subject: "X",
        receivedAt: iso("2026-09-02T00:00:00Z"),
        status: "New",
      },
    ]);
    expect(d.size).toBe(0);
  });
});
