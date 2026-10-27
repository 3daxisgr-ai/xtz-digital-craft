import { describe, expect, it } from "vitest";
import { checkOrder, classifyContact, isSystemSender, mayWriteLabel, namesCompatible, type ContactEvidence, type OrderEvidence } from "./classify";
import { classifyIncoming } from "./mime";
import { planCanonical, type CMsg, type CanonInput } from "./canonical";

const contact = (p: Partial<ContactEvidence> & { email: string }): ContactEvidence => ({
  type: "Lead",
  orders: [],
  inbound: [],
  outbound: [],
  website: false,
  ...p,
});
const order = (p: Partial<OrderEvidence>): OrderEvidence => ({
  status: "Awaiting TOREO Reply",
  source: "Email",
  subject: "Αίτημα προσφοράς για βάσεις",
  customerEmail: "nikos@acme.gr",
  customerName: "Νίκος Παπαδόπουλος",
  linkedCustomers: [{ email: "nikos@acme.gr", name: "Nikos Papadopoulos" }],
  submissionEmails: [],
  incomingSenders: ["nikos@acme.gr"],
  ...p,
});

describe("customers are real customers, not everyone who emailed", () => {
  it("Microsoft 365 / system notifications are not customers or orders", () => {
    const ms = "account-security-noreply@accountprotection.microsoft.com";
    expect(isSystemSender(ms)).toBe(true);
    expect(classifyIncoming({ headers: {}, from: { name: "Microsoft", email: ms }, ownAddress: "info@toreo.gr", siteSender: null })).toBe("auto");
    expect(classifyContact(contact({ email: ms, inbound: [{ cls: "auto", subject: "Microsoft account security info" }] })).value).toBe("Automated / system");
    expect(checkOrder(order({ customerEmail: ms, linkedCustomers: [], incomingSenders: [ms] })).value).toBe("Suspected non-order");
  });

  it("personal mailboxes on big providers are never treated as system senders", () => {
    expect(isSystemSender("maria@outlook.com")).toBe(false);
    expect(isSystemSender("maria@gmail.com")).toBe(false);
  });

  it("a supplier is classified separately, not as a customer order", () => {
    expect(classifyContact(contact({ email: "sales@steel-supplier.gr", outbound: ["forward", "forward"] })).value).toBe("Supplier / partner");
    expect(classifyContact(contact({ email: "a@b.gr", type: "Supplier", inbound: [{ cls: "customer", subject: "Τιμοκατάλογος" }] })).value).toBe("Supplier / partner");
  });

  it("marketing / newsletter senders are not customers", () => {
    expect(classifyContact(contact({ email: "news@shop.gr", inbound: [{ cls: "bulk", subject: "Newsletter Οκτωβρίου" }] })).value).toBe("Spam / marketing");
    expect(classifyContact(contact({ email: "x@price4parts.com", ignore: ["price4parts.com"] })).value).toBe("Spam / marketing");
  });

  it("a real new sales inquiry is a prospect, not a confirmed customer", () => {
    const v = classifyContact(contact({ email: "nikos@acme.gr", orders: [{ status: "Awaiting TOREO Reply", check: "Sales inquiry" }], inbound: [{ cls: "customer", subject: "Προσφορά" }] }));
    expect(v.value).toBe("Prospect / lead");
    expect(classifyContact(contact({ email: "nikos@acme.gr", orders: [{ status: "In Production", check: "Genuine order" }] })).value).toBe("Confirmed customer");
  });

  it("a vendor-registration confirmation is automated, flagged for review", () => {
    const v = classifyContact(contact({ email: "f.k@bigbuyer.com", inbound: [{ cls: "customer", subject: "Vendor Registration Form Successfully Submitted" }] }));
    expect(v).toMatchObject({ value: "Automated / system", review: true });
    expect(checkOrder(order({ customerEmail: "f.k@bigbuyer.com", linkedCustomers: [], incomingSenders: ["f.k@bigbuyer.com"], subject: "Vendor Registration Form Successfully Submitted" })).value).toBe("Suspected non-order");
  });

  it("Type 'Client' without a confirmed order is not trusted blindly", () => {
    const v = classifyContact(contact({ email: "a@c.gr", type: "Client", website: true }));
    expect(v).toMatchObject({ value: "Prospect / lead", review: true });
  });
});

describe("order authenticity and order ↔ customer matching", () => {
  it("a normal inquiry passes; Greek/Latin spellings of the same name match", () => {
    expect(checkOrder(order({})).value).toBe("Sales inquiry");
    expect(namesCompatible("Παναγιώτης Παπαθανασίου", "Panagiotis Papathanasiou")).toBe(true);
  });

  it("a record linked to another person's customer card is flagged", () => {
    const v = checkOrder(order({ customerEmail: "kostas@yahoo.gr", linkedCustomers: [{ email: "john@hotmail.com", name: "John" }], incomingSenders: ["kostas@yahoo.gr"] }));
    expect(v).toMatchObject({ value: "Customer mismatch", review: true });
  });

  it("an unrelated email linked to the order is flagged; colleagues at the same company are fine", () => {
    expect(checkOrder(order({ incomingSenders: ["nikos@acme.gr", "stranger@gmail.com"] })).value).toBe("Customer mismatch");
    expect(checkOrder(order({ incomingSenders: ["nikos@acme.gr", "purchasing@acme.gr"] })).value).toBe("Sales inquiry");
    // Two different gmail users are two different people.
    expect(checkOrder(order({ customerEmail: "a@gmail.com", linkedCustomers: [], incomingSenders: ["a@gmail.com", "b@gmail.com"] })).value).toBe("Customer mismatch");
  });

  it("ambiguous / different names go to review, never auto-renamed", () => {
    const v = checkOrder(order({ customerName: "Γιώργος Αλεξίου", linkedCustomers: [{ email: "nikos@acme.gr", name: "Nikos Papadopoulos" }] }));
    expect(v).toMatchObject({ value: "Needs review", review: true });
  });

  it("confirmed orders are genuine", () => {
    expect(checkOrder(order({ status: "Delivered" })).value).toBe("Genuine order");
  });

  it("a label a person changed is never overwritten", () => {
    expect(mayWriteLabel(null, null)).toBe(true);
    expect(mayWriteLabel("Sales inquiry", "Sales inquiry")).toBe(true);
    expect(mayWriteLabel("Genuine order", "Sales inquiry")).toBe(false);
  });
});

describe("one person + one real purchase = one order", () => {
  const OWN = "info@toreo.gr";
  const C = "nikos@acme.gr";
  const iso = (s: string) => new Date(s).toISOString();
  const msg = (p: Partial<CMsg> & { messageId: string }): CMsg => ({
    folder: "inbox", inReplyTo: null, refs: [], fromEmail: C, fromName: "Nikos", toEmails: [OWN], replyTo: null,
    subject: "Βάσεις οθόνης", date: iso("2026-10-01T09:00:00Z"), cls: "customer", ...p,
  });
  const base = (p: Partial<CanonInput>): CanonInput => ({
    submissions: [], messages: [], requests: [], keys: new Map(), removedKeys: new Set(), own: OWN, now: Date.parse("2026-10-27T10:00:00Z"), staleDays: 60, ...p,
  });
  const existing = {
    id: "p1", orderCode: "TR-2026-0050", customerEmail: C, subject: "Βάσεις οθόνης", status: "Quote Sent",
    receivedAt: iso("2026-10-01T09:00:00Z"), lastActivity: iso("2026-10-05T09:00:00Z"),
  };
  const keys = new Map([["msg:<a@acme>", "p1"], ["order:TR-2026-0050", "p1"]]);

  it("reply, forward and payment notice about the same purchase update the one order", () => {
    const plan = planCanonical(
      base({
        requests: [existing],
        keys,
        messages: [
          msg({ messageId: "<a@acme>" }),
          msg({ messageId: "<b@acme>", inReplyTo: "<a@acme>", refs: ["<a@acme>"], subject: "Re: Βάσεις οθόνης", date: iso("2026-10-06T09:00:00Z") }),
          msg({ messageId: "<c@acme>", fromEmail: "accounts@acme.gr", subject: "Πληρωμή για TR-2026-0050", date: iso("2026-10-08T09:00:00Z") }),
          msg({ messageId: "<d@acme>", subject: "Fwd: Βάσεις οθόνης (νέα σχέδια)", inReplyTo: "<b@acme>", refs: ["<a@acme>", "<b@acme>"], date: iso("2026-10-09T09:00:00Z") }),
        ],
      }),
    );
    expect(plan.requests).toHaveLength(1);
    expect(plan.requests[0].orderCode).toBe("TR-2026-0050");
    expect(plan.attachments.filter((a) => a.requestId === "p1")).toHaveLength(4);
    expect(plan.requests[0].status).toBeNull(); // Quote Sent kept
  });

  it("a second genuine purchase from the same customer becomes a second order", () => {
    const plan = planCanonical(
      base({
        requests: [{ ...existing, status: "Delivered" }],
        keys,
        messages: [msg({ messageId: "<n@acme>", subject: "Νέα παραγγελία: ράφια αποθήκης", date: iso("2026-10-20T09:00:00Z") })],
      }),
    );
    expect(plan.requests.filter((r) => r.isNew)).toHaveLength(1);
  });

  it("same customer, open order, unrelated new subject days later -> review, not merged", () => {
    const plan = planCanonical(
      base({ requests: [existing], keys, messages: [msg({ messageId: "<q@acme>", subject: "Ερώτηση για άλλο έργο", date: iso("2026-10-12T09:00:00Z") })] }),
    );
    expect(plan.requests.filter((r) => r.isNew)).toHaveLength(0);
    expect(plan.review[0]).toMatchObject({ key: "<q@acme>", candidates: ["TR-2026-0050"] });
  });

  it("different customers with similar names are never merged", () => {
    const plan = planCanonical(
      base({
        requests: [existing],
        keys,
        messages: [msg({ messageId: "<z@other>", fromEmail: "nikos@other.gr", fromName: "Nikos", subject: "Βάσεις οθόνης", date: iso("2026-10-02T09:00:00Z") })],
      }),
    );
    expect(plan.requests.filter((r) => r.isNew)).toHaveLength(1);
    expect(plan.attachments.find((a) => a.key === "<z@other>")?.requestId).not.toBe("p1");
  });
});
