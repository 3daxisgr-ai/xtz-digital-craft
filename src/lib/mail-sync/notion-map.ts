/* eslint-disable @typescript-eslint/no-explicit-any -- Notion API property JSON is dynamic; shapes are checked by validateSchema */
// Pure Notion property mapping + schema checks for the TOREO Business OS. Unit-tested.

export type PropType =
  | "title"
  | "rich_text"
  | "select"
  | "email"
  | "date"
  | "url"
  | "unique_id"
  | "phone_number"
  | "relation"
  | "people"
  | "status"
  | "checkbox";

export interface SchemaRequirement {
  props: Record<string, PropType>;
  options: Record<string, string[]>;
}

export const ORDERS_SCHEMA: SchemaRequirement = {
  props: {
    "Request / Order": "title",
    Status: "select",
    Source: "select",
    Type: "select",
    "Customer Name": "rich_text",
    "Customer Email": "email",
    "Customer Phone": "phone_number",
    "Received At": "date",
    "Last Contact": "date",
    "Email Thread": "url",
    "Website Submission": "url",
    "Next Action": "rich_text",
    "Record ID": "unique_id",
    Customer: "relation",
  },
  options: {
    Status: ["Awaiting TOREO Reply", "Replied"],
    Source: ["Email", "Website"],
    Type: ["Inquiry"],
  },
};

/** Canonical-request fields on Orders & Quotes (added once, additively, by ensureOrderFields). */
export const ORDERS_CANON_PROPS: Record<string, unknown> = {
  "Order ID": { rich_text: {} },
  "Reply State": {
    select: {
      options: [
        { name: "Needs Reply", color: "red" },
        { name: "Replied", color: "green" },
      ],
    },
  },
  "Duplicate Check": {
    select: {
      options: [
        { name: "Possible duplicate", color: "orange" },
        { name: "Not a duplicate", color: "gray" },
      ],
    },
  },
  "Possible Duplicates": { rich_text: {} },
  "Order Check": {
    select: {
      options: [
        { name: "Genuine order", color: "green" },
        { name: "Sales inquiry", color: "blue" },
        { name: "Suspected non-order", color: "gray" },
        { name: "Customer mismatch", color: "red" },
        { name: "Needs review", color: "orange" },
      ],
    },
  },
  "Check Reason": { rich_text: {} },
};
/** Evidence-based contact classification on Customers (added additively). */
export const CUSTOMERS_CANON_PROPS: Record<string, unknown> = {
  Classification: {
    select: {
      options: [
        { name: "Confirmed customer", color: "green" },
        { name: "Prospect / lead", color: "blue" },
        { name: "Supplier / partner", color: "purple" },
        { name: "Automated / system", color: "gray" },
        { name: "Spam / marketing", color: "brown" },
        { name: "Uncertain", color: "orange" },
      ],
    },
  },
  "Classification Reason": { rich_text: {} },
  "Classification Review": { checkbox: {} },
};
export const ORDERS_CANON_SCHEMA: SchemaRequirement = {
  props: {
    "Order ID": "rich_text",
    "Reply State": "select",
    "Duplicate Check": "select",
    "Possible Duplicates": "rich_text",
    "Order Check": "select",
    "Check Reason": "rich_text",
    Tasks: "relation",
  },
  options: {
    "Reply State": ["Needs Reply", "Replied"],
    "Duplicate Check": ["Possible duplicate", "Not a duplicate"],
  },
};

export const LOG_SCHEMA: SchemaRequirement = {
  props: {
    Activity: "title",
    Direction: "select",
    Channel: "select",
    Date: "date",
    "Contact Email": "email",
    "Contact Name": "rich_text",
    Summary: "rich_text",
    "Email Thread": "url",
    Status: "select",
    "Message / Submission Link": "url",
    "Related Record ID": "rich_text",
    "Order / Request": "relation",
    Customer: "relation",
    Attachments: "rich_text",
  },
  options: {
    Direction: ["Incoming", "Outgoing"],
    Channel: ["Email", "Website"],
    Status: ["Needs Reply", "Replied", "Follow-up Needed", "Closed"],
  },
};

export const CUSTOMERS_SCHEMA: SchemaRequirement = {
  props: {
    Customer: "title",
    Email: "email",
    Phone: "phone_number",
    Type: "select",
    Status: "select",
    Source: "select",
  },
  options: {
    Type: ["Lead", "Client"],
    Status: ["Prospect", "Active"],
    Source: ["Email", "Website"],
  },
};

export const TASKS_SCHEMA: SchemaRequirement = {
  props: {
    Task: "title",
    Status: "status",
    Category: "select",
    Source: "select",
    Priority: "select",
    "Related Record ID": "rich_text",
    "Order / Request": "relation",
  },
  options: {
    Status: ["Not Started"],
    Category: ["Customer Reply"],
    Source: ["Email", "Website"],
    Priority: ["Normal"],
  },
};

/** Returns human-readable problems; empty array means the database fits. */
export function validateSchema(properties: Record<string, any>, req: SchemaRequirement): string[] {
  const problems: string[] = [];
  for (const [name, type] of Object.entries(req.props)) {
    const p = properties?.[name];
    if (!p) problems.push(`Λείπει το πεδίο «${name}»`);
    else if (p.type !== type)
      problems.push(`Το πεδίο «${name}» είναι ${p.type}, αναμενόταν ${type}`);
  }
  for (const [name, opts] of Object.entries(req.options)) {
    const p = properties?.[name];
    if (!p || (p.type !== "select" && p.type !== "status")) continue;
    const have = new Set((p[p.type]?.options ?? []).map((o: any) => o.name));
    for (const o of opts)
      if (!have.has(o)) problems.push(`Το πεδίο «${name}» δεν έχει την επιλογή «${o}»`);
  }
  return problems;
}

const MAX_TEXT = 1900;
const text = (s: string | null | undefined) => [
  { type: "text", text: { content: (s ?? "").slice(0, MAX_TEXT) } },
];
const title = (s: string) => ({ title: text(s || "(χωρίς θέμα)") });
const rich = (s: string | null | undefined) => ({ rich_text: s ? text(s) : [] });
const select = (name: string) => ({ select: { name } });
const date = (iso: string) => ({ date: { start: iso } });
const url = (u: string | null | undefined) => ({ url: u || null });
const email = (e: string | null | undefined) => ({ email: e || null });
const relation = (...ids: (string | null | undefined)[]) => ({
  relation: ids.filter((x): x is string => !!x).map((id) => ({ id })),
});

export interface NewOrderInput {
  subject: string;
  source: "Email" | "Website";
  customerName: string | null;
  customerEmail: string;
  customerPhone?: string | null;
  receivedAt: string;
  threadUrl: string | null;
  websiteUrl?: string | null;
  nextAction: string;
  /** Historical import only: status computed from the whole thread (default "Awaiting TOREO Reply"). */
  status?: string;
  lastContact?: string;
  customerPageId?: string | null;
  internalNotes?: string | null;
  /** Permanent TOREO Order ID (TR-YYYY-NNNN). */
  orderId?: string | null;
  replyState?: "Needs Reply" | "Replied" | null;
  duplicates?: string[];
}

export function orderCreateProps(i: NewOrderInput): Record<string, unknown> {
  const props: Record<string, unknown> = {
    "Request / Order": title(i.subject),
    Status: select(i.status ?? "Awaiting TOREO Reply"),
    Source: select(i.source),
    Type: select("Inquiry"),
    "Customer Name": rich(i.customerName),
    "Customer Email": email(i.customerEmail),
    "Received At": date(i.receivedAt),
    "Last Contact": date(i.lastContact ?? i.receivedAt),
    "Email Thread": url(i.threadUrl),
    "Next Action": rich(i.nextAction),
  };
  if (i.customerPhone) props["Customer Phone"] = { phone_number: i.customerPhone.slice(0, 60) };
  if (i.websiteUrl) props["Website Submission"] = url(i.websiteUrl);
  if (i.customerPageId) props.Customer = relation(i.customerPageId);
  if (i.internalNotes) props["Internal Notes"] = rich(i.internalNotes);
  if (i.orderId) props["Order ID"] = rich(i.orderId);
  if (i.replyState) props["Reply State"] = select(i.replyState);
  if (i.duplicates?.length) {
    props["Duplicate Check"] = select("Possible duplicate");
    props["Possible Duplicates"] = rich(i.duplicates.join(", "));
  }
  return props;
}

/** Patch for an existing record; only the given fields change. */
export function canonPatchProps(p: {
  orderId?: string;
  replyState?: "Needs Reply" | "Replied";
  status?: string;
  lastContact?: string;
  nextAction?: string;
  threadUrl?: string;
  customerPageId?: string;
  duplicates?: string[];
}): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (p.orderId) props["Order ID"] = rich(p.orderId);
  if (p.replyState) props["Reply State"] = select(p.replyState);
  if (p.status) props.Status = select(p.status);
  if (p.lastContact) props["Last Contact"] = date(p.lastContact);
  if (p.nextAction) props["Next Action"] = rich(p.nextAction);
  if (p.threadUrl) props["Email Thread"] = url(p.threadUrl);
  if (p.customerPageId) props.Customer = relation(p.customerPageId);
  if (p.duplicates) {
    props["Duplicate Check"] = select("Possible duplicate");
    props["Possible Duplicates"] = rich(p.duplicates.join(", "));
  }
  return props;
}

const plain = (v: any) =>
  (v?.rich_text ?? v?.title ?? []).map((x: any) => x.plain_text ?? x.text?.content ?? "").join("");

/** Everything the canonical reconcile reads from an Orders & Quotes page. */
export function readCanonPage(page: any) {
  const p = page?.properties ?? {};
  return {
    ...readExistingPage(page),
    orderId: plain(p["Order ID"]).trim() || null,
    replyState: (p["Reply State"]?.select?.name ?? null) as string | null,
    duplicateCheck: (p["Duplicate Check"]?.select?.name ?? null) as string | null,
    possibleDuplicates: plain(p["Possible Duplicates"]).trim() || null,
    nextAction: plain(p["Next Action"]).trim() || null,
    receivedAt: (p["Received At"]?.date?.start ?? page?.created_time ?? null) as string | null,
    lastContact: (p["Last Contact"]?.date?.start ?? null) as string | null,
    customerIds: (p.Customer?.relation ?? []).map((r: any) => r.id as string),
    taskIds: (p.Tasks?.relation ?? []).map((r: any) => r.id as string),
    source: (p.Source?.select?.name ?? null) as string | null,
    customerName: plain(p["Customer Name"]).trim() || null,
    orderCheck: (p["Order Check"]?.select?.name ?? null) as string | null,
    checkReason: plain(p["Check Reason"]).trim() || null,
    internalNotes: plain(p["Internal Notes"]).trim() || null,
  };
}
export type CanonPage = ReturnType<typeof readCanonPage>;

export function readLogPage(page: any) {
  const p = page?.properties ?? {};
  return {
    id: page.id as string,
    link: (p["Message / Submission Link"]?.url ?? null) as string | null,
    status: (p.Status?.select?.name ?? null) as string | null,
    orderIds: (p["Order / Request"]?.relation ?? []).map((r: any) => r.id as string),
    related: plain(p["Related Record ID"]).trim() || null,
    direction: (p.Direction?.select?.name ?? null) as string | null,
    contactEmail: (p["Contact Email"]?.email ?? null) as string | null,
  };
}

export function readCustomerPage(page: any) {
  const p = page?.properties ?? {};
  return {
    id: page.id as string,
    name: plain(p.Customer).trim() || null,
    email: (p.Email?.email ?? null) as string | null,
    type: (p.Type?.select?.name ?? null) as string | null,
    classification: (p.Classification?.select?.name ?? null) as string | null,
    reason: plain(p["Classification Reason"]).trim() || null,
    review: !!p["Classification Review"]?.checkbox,
    orderIds: (p["Orders & Quotes"]?.relation ?? []).map((r: any) => r.id as string),
  };
}

export function readTaskPage(page: any) {
  const p = page?.properties ?? {};
  return {
    id: page.id as string,
    status: (p.Status?.status?.name ?? null) as string | null,
    category: (p.Category?.select?.name ?? null) as string | null,
    orderIds: (p["Order / Request"]?.relation ?? []).map((r: any) => r.id as string),
    related: plain(p["Related Record ID"]).trim() || null,
    lastEdited: (page.last_edited_time ?? page.created_time) as string,
  };
}

export function orderUpdateProps(opts: {
  status: string | null;
  lastContact: string;
  nextAction?: string | null;
}) {
  const props: Record<string, unknown> = { "Last Contact": date(opts.lastContact) };
  if (opts.status) props.Status = select(opts.status);
  if (opts.nextAction) props["Next Action"] = rich(opts.nextAction);
  return props;
}

/** Historical import: set the thread marker on an existing record only when it has none. */
export function threadMarkerProps(threadUrl: string) {
  return { "Email Thread": url(threadUrl) };
}

export interface LogInput {
  activity: string;
  direction: "Incoming" | "Outgoing";
  channel: "Email" | "Website";
  date: string;
  contactEmail: string | null;
  contactName: string | null;
  summary: string;
  threadUrl: string | null;
  messageUrl: string | null;
  status: "Needs Reply" | "Replied" | "Follow-up Needed" | "Closed";
  relatedRecord: string | null;
  orderPageId?: string | null;
  customerPageId?: string | null;
  attachments?: string[];
}

export function logCreateProps(i: LogInput): Record<string, unknown> {
  return {
    Activity: title(i.activity),
    Direction: select(i.direction),
    Channel: select(i.channel),
    Date: date(i.date),
    "Contact Email": email(i.contactEmail),
    "Contact Name": rich(i.contactName),
    Summary: rich(i.summary),
    "Email Thread": url(i.threadUrl),
    "Message / Submission Link": url(i.messageUrl),
    Status: select(i.status),
    "Related Record ID": rich(i.relatedRecord),
    ...(i.orderPageId ? { "Order / Request": relation(i.orderPageId) } : {}),
    ...(i.customerPageId ? { Customer: relation(i.customerPageId) } : {}),
    ...(i.attachments?.length ? { Attachments: rich(i.attachments.join(", ")) } : {}),
  };
}

export interface CustomerInput {
  name: string | null;
  email: string;
  phone?: string | null;
  source: "Email" | "Website";
  client: boolean;
}

/** New customer card. Company/address are left empty (never guessed). */
export function customerCreateProps(i: CustomerInput): Record<string, unknown> {
  const props: Record<string, unknown> = {
    Customer: title(i.name || i.email),
    Email: email(i.email.toLowerCase()),
    Type: select(i.client ? "Client" : "Lead"),
    Status: select(i.client ? "Active" : "Prospect"),
    Source: select(i.source),
  };
  if (i.phone) props.Phone = { phone_number: i.phone.slice(0, 60) };
  return props;
}

export interface TaskInput {
  title: string;
  source: "Email" | "Website";
  orderPageId: string;
  relatedRecord: string | null;
  notes?: string | null;
}

/** Follow-up task for TOREO. Owner and due date are left empty (never invented). */
export function taskCreateProps(i: TaskInput): Record<string, unknown> {
  return {
    Task: title(i.title),
    Status: { status: { name: "Not Started" } },
    Category: select("Customer Reply"),
    Source: select(i.source),
    Priority: select("Normal"),
    "Related Record ID": rich(i.relatedRecord),
    "Order / Request": relation(i.orderPageId),
    ...(i.notes ? { Notes: rich(i.notes) } : {}),
  };
}

export interface OrderPage {
  pageId: string;
  record: string | null;
  title: string;
  status: string | null;
  customerEmail: string | null;
}

export function readOrderPage(page: any): OrderPage {
  const p = page?.properties ?? {};
  const uid = p["Record ID"]?.unique_id;
  const record =
    uid && uid.number != null
      ? uid.prefix
        ? `${uid.prefix}-${uid.number}`
        : String(uid.number)
      : null;
  const t = (p["Request / Order"]?.title ?? [])
    .map((x: any) => x.plain_text ?? x.text?.content ?? "")
    .join("");
  return {
    pageId: page.id,
    record,
    title: t,
    status: p.Status?.select?.name ?? null,
    customerEmail: p["Customer Email"]?.email ?? null,
  };
}

/** Order page with the link fields the historical import matches on. */
export function readExistingPage(page: any) {
  const p = page?.properties ?? {};
  return {
    ...readOrderPage(page),
    threadUrl: p["Email Thread"]?.url ?? null,
    websiteUrl: p["Website Submission"]?.url ?? null,
  };
}

/** The mid: link of a Communication Log page (null when absent). */
export function readLogLink(page: any): string | null {
  return page?.properties?.["Message / Submission Link"]?.url ?? null;
}
