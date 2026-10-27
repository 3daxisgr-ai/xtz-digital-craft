/* eslint-disable @typescript-eslint/no-explicit-any -- Notion API responses are dynamic JSON, read through notion-map.ts */
// Server-only Notion access for the mail sync (through the Lovable connector gateway).
import { readOrderPage, type OrderPage } from "./notion-map";

const GATEWAY = "https://connector-gateway.lovable.dev/notion/v1";

/** TOREO Business OS data sources (shared with the integration by the owner). */
export const DATA_SOURCES = {
  orders: "8e924d4d-3b87-4ca2-b42c-63887bd8f285",
  log: "9e5aa660-6e30-42df-b52e-fbfe08153f55",
  customers: "428d2a4b-8436-4eff-b1e7-991e44149294",
  tasks: "4157d5f5-9f01-408f-9661-f8acec89e3e5",
};

/** Customer card id for an email (exact match), or null. */
export async function findCustomerByEmail(email: string): Promise<string | null> {
  const r = await notionFetch(`/data_sources/${DATA_SOURCES.customers}/query`, {
    method: "POST",
    body: { filter: { property: "Email", email: { equals: email.toLowerCase() } }, page_size: 1 },
  });
  return r.results?.[0]?.id ?? null;
}

export class NotionError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function keys() {
  const lovable = process.env.LOVABLE_API_KEY;
  const notion = process.env.NOTION_API_KEY;
  if (!lovable || !notion) throw new NotionError("Η σύνδεση Notion δεν είναι ρυθμισμένη", 0);
  return { lovable, notion };
}

export async function notionFetch(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<any> {
  const { lovable, notion } = keys();
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${GATEWAY}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${lovable}`,
        "X-Connection-Api-Key": notion,
        "Notion-Version": "2025-09-03",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (res.status === 429 && attempt === 0) {
      const wait = Math.min(2000, Number(res.headers.get("retry-after") ?? "1") * 1000);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) {
      // Redacted: keep only Notion's error code. The raw body/message can echo property values.
      const code = notionErrorCode(await res.text().catch(() => ""));
      console.error(`[mail-sync] Notion ${init.method ?? "GET"} failed [${res.status}] ${code}`);
      throw new NotionError(`Notion [${res.status}] ${code}`, res.status);
    }
    return res.json();
  }
  throw new NotionError("Notion: πολλά αιτήματα, δοκιμάστε ξανά", 429);
}

export async function getDataSourceProperties(id: string): Promise<Record<string, any>> {
  const ds = await notionFetch(`/data_sources/${id}`);
  return ds.properties ?? {};
}

async function queryOrders(filter: unknown, pageSize = 20): Promise<OrderPage[]> {
  const r = await notionFetch(`/data_sources/${DATA_SOURCES.orders}/query`, {
    method: "POST",
    body: {
      filter,
      page_size: pageSize,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    },
  });
  return (r.results ?? []).map(readOrderPage);
}

/** Orders whose "Email Thread" equals one of the given mid: URLs. */
export async function findOrdersByThread(threadUrls: string[]): Promise<OrderPage[]> {
  const urls = Array.from(new Set(threadUrls)).slice(0, 10);
  if (!urls.length) return [];
  return queryOrders(
    { or: urls.map((u) => ({ property: "Email Thread", url: { equals: u } })) },
    5,
  );
}

export async function findOrdersByEmail(email: string): Promise<OrderPage[]> {
  return queryOrders({ property: "Customer Email", email: { equals: email } }, 20);
}

export async function getOrder(pageId: string): Promise<OrderPage> {
  return readOrderPage(await notionFetch(`/pages/${pageId}`));
}

/** Every page of a data source (read-only, paginated, capped). */
export async function listAllPages(dataSourceId: string, cap = 2000): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const r = await notionFetch(`/data_sources/${dataSourceId}/query`, {
      method: "POST",
      body: { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) },
    });
    out.push(...(r.results ?? []));
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor && out.length < cap);
  return out;
}

export async function createPage(
  dataSourceId: string,
  properties: Record<string, unknown>,
): Promise<any> {
  return notionFetch(`/pages`, {
    method: "POST",
    body: { parent: { type: "data_source_id", data_source_id: dataSourceId }, properties },
  });
}

export async function updatePage(
  pageId: string,
  properties: Record<string, unknown>,
): Promise<any> {
  return notionFetch(`/pages/${pageId}`, { method: "PATCH", body: { properties } });
}

/** Add the canonical-request fields to Orders & Quotes when missing (additive; never removes). */
export async function ensureOrderFields(
  wanted: Record<string, unknown>,
  current: Record<string, any>,
): Promise<string[]> {
  const missing = Object.keys(wanted).filter((k) => !current?.[k]);
  if (!missing.length) return [];
  await notionFetch(`/data_sources/${DATA_SOURCES.orders}`, {
    method: "PATCH",
    body: { properties: Object.fromEntries(missing.map((k) => [k, wanted[k]])) },
  });
  return missing;
}

/** Orders page carrying this permanent Order ID, if one exists (crash-safe re-runs). */
export async function findOrderByOrderId(code: string): Promise<any | null> {
  const r = await notionFetch(`/data_sources/${DATA_SOURCES.orders}/query`, {
    method: "POST",
    body: { filter: { property: "Order ID", rich_text: { equals: code } }, page_size: 2 },
  });
  return r.results?.[0] ?? null;
}

/** Extract only Notion's machine error code (e.g. "validation_error"); never the message. */
export function notionErrorCode(body: string): string {
  try {
    const code = (JSON.parse(body) as { code?: unknown }).code;
    return typeof code === "string" && /^[a-z_]{1,64}$/.test(code) ? code : "unknown_error";
  } catch {
    return "unknown_error";
  }
}
