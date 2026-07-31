// Thin RPC wrappers for the admin Quote PDF (TR-NNNN) workflow.
// All logic lives in quote-doc.server.ts — this file must stay import-only.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const quoteDocCreate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ order_code: z.string(), replaces: z.string().nullish() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/lib/api/quote-doc.server");
    await m.requireAdmin();
    return await m.createQuoteDoc(data.order_code, data.replaces ?? null);
  });

export const quoteDocGet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ number: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/lib/api/quote-doc.server");
    await m.requireAdmin();
    return await m.getQuoteDoc(data.number);
  });

export const quoteDocList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_code: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/lib/api/quote-doc.server");
    await m.requireAdmin();
    return await m.listQuoteDocs(data.order_code);
  });

export const quoteDocUpdate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ number: z.string(), patch: z.record(z.string(), z.any()) }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/lib/api/quote-doc.server");
    await m.requireAdmin();
    return await m.updateQuoteDoc(data.number, data.patch);
  });

export const quoteDocSync = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ number: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/lib/api/quote-doc.server");
    await m.requireAdmin();
    return await m.syncQuoteDoc(data.number);
  });

export const quoteDocGenerate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ number: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/lib/api/quote-doc.server");
    await m.requireAdmin();
    return await m.generateQuotePdf(data.number);
  });

export const quoteDocDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ number: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/lib/api/quote-doc.server");
    await m.requireAdmin();
    return { url: await m.quotePdfUrl(data.number) };
  });

export const quoteDocPreview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ number: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/lib/api/quote-doc.server");
    await m.requireAdmin();
    return { base64: await m.previewQuotePdfBase64(data.number) };
  });

export const quoteDocEmailDefaults = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ number: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/lib/api/quote-doc.server");
    await m.requireAdmin();
    const { doc, order } = await m.getQuoteDoc(data.number);
    const d: any = doc;
    const terms = (d.terms ?? {}) as any;
    const fin = (d.financial_snapshot ?? {}) as any;
    const lang: "el" | "en" = terms.lang === "en" ? "en" : "el";
    const defaults = m.quoteEmailDefaults(lang, {
      quote_number: d.number,
      order_reference: (order as any)?.order_code ?? "",
      grand_total: `${Number(fin.total ?? 0).toFixed(2)} €`,
      quote_validity: terms.validity ?? "",
      delivery_time: terms.delivery_time ?? "",
    });
    return {
      ...defaults,
      recipient: d.recipient ?? d.customer_snapshot?.email ?? (order as any)?.customer_email ?? "",
    };
  });

export const quoteDocSend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        number: z.string(),
        recipient: z.string().email(),
        cc: z.string().nullish(),
        subject: z.string().min(1),
        body: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/lib/api/quote-doc.server");
    await m.requireAdmin();
    return await m.sendQuoteDoc(data);
  });

export const quoteDocSetStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ number: z.string(), status: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/lib/api/quote-doc.server");
    await m.requireAdmin();
    return await m.setQuoteDocStatus(data.number, data.status);
  });
