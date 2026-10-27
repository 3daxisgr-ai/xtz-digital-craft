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
  | "phone_number";

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
  },
  options: {
    Status: ["Awaiting TOREO Reply", "Replied"],
    Source: ["Email", "Website"],
    Type: ["Inquiry"],
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
  },
  options: {
    Direction: ["Incoming", "Outgoing"],
    Channel: ["Email", "Website"],
    Status: ["Needs Reply", "Replied", "Follow-up Needed"],
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
    if (!p || p.type !== "select") continue;
    const have = new Set((p.select?.options ?? []).map((o: any) => o.name));
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
  return props;
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
