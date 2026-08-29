/**
 * AI service abstraction.
 *
 * The application never talks to a model vendor directly — it calls the
 * feature functions at the bottom of this file. Provider, model, temperature,
 * token ceiling, fallback model and usage limits all come from the
 * `ai_settings` row (admin-editable) with environment overrides.
 *
 * Server-only. API keys are read from process.env inside the call, never at
 * module scope and never shipped to the browser.
 */

export type AiFeature =
  | "analyze_email"
  | "extract_order_data"
  | "detect_duplicate"
  | "summarize_conversation"
  | "generate_email"
  | "suggest_next_action";

export interface AiSettings {
  provider: string;
  model: string;
  fallback_model: string | null;
  temperature: number;
  max_output_tokens: number;
  daily_call_limit: number;
  monthly_call_limit: number;
  enabled: boolean;
}

const DEFAULTS: AiSettings = {
  provider: process.env.AI_PROVIDER || "lovable",
  model: process.env.AI_MODEL || "google/gemini-2.5-flash",
  fallback_model: "google/gemini-2.5-flash-lite",
  temperature: 0.3,
  max_output_tokens: 1200,
  daily_call_limit: 2000,
  monthly_call_limit: 40000,
  enabled: true,
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function getAiSettings(): Promise<AiSettings> {
  try {
    const supabase = await db();
    const { data } = await supabase.from("ai_settings").select("*").eq("id", 1).maybeSingle();
    if (!data) return DEFAULTS;
    return {
      provider: process.env.AI_PROVIDER || data.provider || DEFAULTS.provider,
      model: process.env.AI_MODEL || data.model || DEFAULTS.model,
      fallback_model: data.fallback_model ?? DEFAULTS.fallback_model,
      temperature: Number(data.temperature ?? DEFAULTS.temperature),
      max_output_tokens: Number(data.max_output_tokens ?? DEFAULTS.max_output_tokens),
      daily_call_limit: Number(data.daily_call_limit ?? DEFAULTS.daily_call_limit),
      monthly_call_limit: Number(data.monthly_call_limit ?? DEFAULTS.monthly_call_limit),
      enabled: data.enabled !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function getAiUsage(): Promise<{ today: number; month: number }> {
  try {
    const supabase = await db();
    const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfMonth = new Date(); startOfMonth.setUTCDate(1); startOfMonth.setUTCHours(0, 0, 0, 0);
    const [d, m] = await Promise.all([
      supabase.from("ai_usage_log").select("id", { count: "exact", head: true }).gte("created_at", startOfDay.toISOString()),
      supabase.from("ai_usage_log").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
    ]);
    return { today: d.count ?? 0, month: m.count ?? 0 };
  } catch {
    return { today: 0, month: 0 };
  }
}

async function logUsage(entry: {
  feature: AiFeature; provider: string; model: string; ok: boolean;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  latency_ms?: number; error?: string; context?: Record<string, unknown>;
}) {
  try {
    const supabase = await db();
    await supabase.from("ai_usage_log").insert({
      feature: entry.feature,
      provider: entry.provider,
      model: entry.model,
      ok: entry.ok,
      prompt_tokens: entry.usage?.prompt_tokens ?? null,
      completion_tokens: entry.usage?.completion_tokens ?? null,
      total_tokens: entry.usage?.total_tokens ?? null,
      latency_ms: entry.latency_ms ?? null,
      error_message: entry.error?.slice(0, 2000) ?? null,
      context: entry.context ?? {},
    });
  } catch (e) {
    console.error("[ai] usage log failed", e);
  }
}

// ------------------------------------------------------------------ transport

interface ChatMessage { role: "system" | "user"; content: string }

async function callProvider(
  provider: string,
  model: string,
  messages: ChatMessage[],
  settings: AiSettings,
): Promise<{ text: string; usage?: Record<string, number> }> {
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not configured");
    return httpChat("https://api.openai.com/v1/chat/completions", key, model, messages, settings);
  }
  // Default: Lovable AI gateway (no vendor key required).
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return httpChat("https://ai.gateway.lovable.dev/v1/chat/completions", key, model, messages, settings);
}

async function httpChat(
  url: string, key: string, model: string, messages: ChatMessage[], settings: AiSettings,
): Promise<{ text: string; usage?: Record<string, number> }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature: settings.temperature,
      max_tokens: settings.max_output_tokens,
    }),
  });
  const bodyText = await res.text();
  if (!res.ok) throw new Error(`AI provider ${res.status}: ${bodyText.slice(0, 500)}`);
  let json: any;
  try { json = JSON.parse(bodyText); } catch { throw new Error(`AI provider returned non-JSON: ${bodyText.slice(0, 300)}`); }
  const text = json?.choices?.[0]?.message?.content ?? "";
  return { text: String(text), usage: json?.usage };
}

/** Single entry point: applies settings, limits, fallback model and usage logging. */
export async function aiComplete(
  feature: AiFeature,
  system: string,
  user: string,
  context: Record<string, unknown> = {},
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const settings = await getAiSettings();
  if (!settings.enabled) return { ok: false, error: "AI is disabled in settings" };

  const usage = await getAiUsage();
  if (settings.daily_call_limit > 0 && usage.today >= settings.daily_call_limit)
    return { ok: false, error: `Daily AI call limit reached (${settings.daily_call_limit})` };
  if (settings.monthly_call_limit > 0 && usage.month >= settings.monthly_call_limit)
    return { ok: false, error: `Monthly AI call limit reached (${settings.monthly_call_limit})` };

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const models = [settings.model, settings.fallback_model].filter(Boolean) as string[];
  let lastError = "";
  for (const model of models) {
    const t0 = Date.now();
    try {
      const r = await callProvider(settings.provider, model, messages, settings);
      await logUsage({ feature, provider: settings.provider, model, ok: true, usage: r.usage as any, latency_ms: Date.now() - t0, context });
      return { ok: true, text: r.text };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      await logUsage({ feature, provider: settings.provider, model, ok: false, latency_ms: Date.now() - t0, error: lastError, context });
      console.error(`[ai] ${feature} failed on ${model}: ${lastError}`);
    }
  }
  return { ok: false, error: lastError || "AI call failed" };
}

function parseJson<T>(text: string): T | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)) as T; } catch { return null; }
}

// ------------------------------------------------------------------ features

const NO_INVENTION =
  "You are the engineering assistant of TOREO, a Greek manufacturing company (3D printing, fiber laser cutting, " +
  "sheet metal bending, welding, product design). NEVER invent technical information. If a value is not stated by " +
  "the customer, leave it null and list it under \"missing\". Be precise and factual.";

export interface ExtractedRequest {
  company: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  project_name: string | null;
  requested_product: string | null;
  quantity: string | null;
  materials: string | null;
  dimensions: string | null;
  process: string | null;
  files: string[];
  deadline: string | null;
  delivery_requirements: string | null;
  technical_requirements: string[];
  customer_questions: string[];
  missing: string[];
  urgency: "low" | "normal" | "high" | "urgent" | null;
  suggested_category: string | null;
  summary: string;
  next_action: string | null;
  confidence: number;
}

/** Structured extraction + editable customer-request summary + next action. */
export async function analyzeEmail(input: {
  senderEmail: string; senderName?: string | null; subject?: string | null; body?: string | null;
  attachments?: string[]; facts?: Record<string, unknown>;
}): Promise<{ ok: true; data: ExtractedRequest } | { ok: false; error: string }> {
  const user = [
    `From: ${input.senderName ?? ""} <${input.senderEmail}>`,
    `Subject: ${input.subject ?? "(none)"}`,
    `Attachments: ${input.attachments?.length ? input.attachments.join(", ") : "(none)"}`,
    `Structured form fields: ${JSON.stringify(input.facts ?? {})}`,
    "",
    "Message:",
    input.body ?? "(empty)",
  ].join("\n");

  const system =
    NO_INVENTION +
    "\nReturn ONLY JSON with exactly these keys: company, contact_person, email, phone, project_name, " +
    "requested_product, quantity, materials, dimensions, process, files (array), deadline, delivery_requirements, " +
    "technical_requirements (array), customer_questions (array), missing (array of MISSING INFORMATION labels), " +
    "urgency (low|normal|high|urgent), suggested_category, summary (a short plain-language CUSTOMER REQUEST SUMMARY), " +
    "next_action (one short recommended action for the TOREO team), confidence (0-100 integer). " +
    "Use null for unknown scalars and [] for unknown arrays.";

  const r = await aiComplete("analyze_email", system, user, { sender: input.senderEmail });
  if (!r.ok) return r;
  const parsed = parseJson<ExtractedRequest>(r.text);
  if (!parsed) return { ok: false, error: "AI returned an unparseable response" };
  return {
    ok: true,
    data: {
      ...parsed,
      files: parsed.files ?? [],
      technical_requirements: parsed.technical_requirements ?? [],
      customer_questions: parsed.customer_questions ?? [],
      missing: parsed.missing ?? [],
      confidence: Number(parsed.confidence ?? 0),
      summary: parsed.summary ?? "",
    },
  };
}

export const extractOrderData = analyzeEmail;

/** Optional second opinion on a duplicate — the deterministic classifier decides. */
export async function detectDuplicate(input: {
  incoming: { subject?: string | null; body?: string | null };
  existing: { orderCode?: string | null; subject?: string | null; body?: string | null };
}): Promise<{ ok: true; sameProject: boolean; confidence: number; reason: string } | { ok: false; error: string }> {
  const system =
    NO_INVENTION +
    "\nDecide whether two customer requests concern the SAME project. Return ONLY JSON: " +
    '{"same_project": boolean, "confidence": 0-100, "reason": "short explanation"}';
  const user = JSON.stringify(input);
  const r = await aiComplete("detect_duplicate", system, user);
  if (!r.ok) return r;
  const parsed = parseJson<{ same_project: boolean; confidence: number; reason: string }>(r.text);
  if (!parsed) return { ok: false, error: "AI returned an unparseable response" };
  return { ok: true, sameProject: !!parsed.same_project, confidence: Number(parsed.confidence ?? 0), reason: parsed.reason ?? "" };
}

export async function suggestNextAction(context: string): Promise<{ ok: true; action: string } | { ok: false; error: string }> {
  const system =
    NO_INVENTION +
    "\nRecommend the single most useful next action for the TOREO team, based ONLY on the information given. " +
    "Answer with a short imperative sentence, max 60 characters. No explanation.";
  const r = await aiComplete("suggest_next_action", system, context);
  if (!r.ok) return r;
  return { ok: true, action: r.text.trim().replace(/^["']|["']$/g, "").slice(0, 120) };
}

export async function summarizeConversation(thread: string): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const system = NO_INVENTION + "\nSummarise the email conversation in max 6 short bullet lines. Plain text only.";
  const r = await aiComplete("summarize_conversation", system, thread);
  if (!r.ok) return r;
  return { ok: true, summary: r.text.trim() };
}

/** Draft a customer email from a free-form Greek or English instruction. */
export async function generateEmail(input: {
  instruction: string;
  orderContext: Record<string, unknown>;
  threadContext?: string;
  language?: "auto" | "el" | "en";
}): Promise<{ ok: true; subject: string; body: string; language: string } | { ok: false; error: string }> {
  const system =
    NO_INVENTION +
    "\nYou write customer emails on behalf of TOREO. Rules: " +
    "(1) Reply in the SAME language as the admin instruction unless a language is forced — Greek instruction → Greek email, " +
    "English instruction → English email. (2) Professional, warm, concise B2B tone. (3) Use the order context provided; " +
    "never ask the admin for information you already have. (4) Never promise prices, delivery dates or technical " +
    "specifications that are not in the context. (5) Sign as the TOREO team. (6) Plain text body with line breaks, no markdown. " +
    'Return ONLY JSON: {"subject": "...", "body": "...", "language": "el|en"}';

  const user = [
    `Admin instruction: ${input.instruction}`,
    input.language && input.language !== "auto" ? `Forced language: ${input.language}` : "",
    `Order context: ${JSON.stringify(input.orderContext)}`,
    input.threadContext ? `Previous conversation:\n${input.threadContext}` : "",
  ].filter(Boolean).join("\n\n");

  const r = await aiComplete("generate_email", system, user, { instruction: input.instruction.slice(0, 200) });
  if (!r.ok) return r;
  const parsed = parseJson<{ subject: string; body: string; language: string }>(r.text);
  if (!parsed?.body) return { ok: false, error: "AI returned an unparseable response" };
  return { ok: true, subject: parsed.subject ?? "TOREO", body: parsed.body, language: parsed.language ?? "en" };
}
