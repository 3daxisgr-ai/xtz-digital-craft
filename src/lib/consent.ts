/**
 * Cookie / storage consent for the public site.
 *
 * Pure helpers (record creation, parsing, expiry) are unit-tested; the browser
 * helpers below only run from effects and event handlers.
 *
 * Optional categories exist only because the audit found real uses:
 * - functional: the homepage video remembers its last start point
 * - analytics: the hosting platform's visitor analytics ("session-id" cookie)
 * There is no marketing category: no ad pixels or marketing tags are installed.
 */

export const CONSENT_KEY = "toreo-consent";
export const CONSENT_VERSION = 1;
/** Bump when the cookie policy / categories change so visitors are asked again. */
export const POLICY_VERSION = "2026-11-02";
export const CONSENT_MONTHS = 6;
export const CONSENT_EVENT = "toreo:consent-change";
export const CONSENT_OPEN_EVENT = "toreo:consent-open";

/** Functional storage key used by the homepage hero video. */
export const HERO_START_KEY = "toreo:hero-start";
/** Cookie set by the hosting platform's visitor analytics script. */
export const ANALYTICS_COOKIE = "session-id";

export type OptionalCategory = "functional" | "analytics";
export type ConsentChoices = Record<OptionalCategory, boolean>;
export type ConsentMethod = "accept_all" | "reject_optional" | "custom";

export interface ConsentRecord {
  v: typeof CONSENT_VERSION;
  policy: string;
  decidedAt: string;
  expiresAt: string;
  method: ConsentMethod;
  categories: { necessary: true } & ConsentChoices;
}

export const NO_OPTIONAL: ConsentChoices = { functional: false, analytics: false };
export const ALL_OPTIONAL: ConsentChoices = { functional: true, analytics: true };

/** Calendar-month addition, clamped to the last day of the target month. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

export function makeRecord(method: ConsentMethod, choices: ConsentChoices, now: Date = new Date()): ConsentRecord {
  const picked: ConsentChoices =
    method === "accept_all" ? ALL_OPTIONAL : method === "reject_optional" ? NO_OPTIONAL : choices;
  return {
    v: CONSENT_VERSION,
    policy: POLICY_VERSION,
    decidedAt: now.toISOString(),
    expiresAt: addMonths(now, CONSENT_MONTHS).toISOString(),
    method,
    categories: { necessary: true, functional: picked.functional === true, analytics: picked.analytics === true },
  };
}

/** Returns a valid, unexpired record for the current policy, otherwise null (ask again). */
export function parseRecord(raw: string | null | undefined, now: Date = new Date()): ConsentRecord | null {
  if (!raw) return null;
  let r: unknown;
  try {
    r = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!r || typeof r !== "object") return null;
  const rec = r as Partial<ConsentRecord>;
  if (rec.v !== CONSENT_VERSION || rec.policy !== POLICY_VERSION) return null;
  const exp = Date.parse(String(rec.expiresAt));
  if (!Number.isFinite(exp) || exp <= now.getTime()) return null;
  const c = rec.categories;
  if (!c || typeof c !== "object") return null;
  return {
    v: CONSENT_VERSION,
    policy: POLICY_VERSION,
    decidedAt: String(rec.decidedAt),
    expiresAt: String(rec.expiresAt),
    method: rec.method === "accept_all" || rec.method === "reject_optional" ? rec.method : "custom",
    categories: { necessary: true, functional: c.functional === true, analytics: c.analytics === true },
  };
}

export function allows(rec: ConsentRecord | null, cat: OptionalCategory): boolean {
  return !!rec && rec.categories[cat] === true;
}

/* ---------------- browser helpers (call from effects / handlers only) ---------------- */

export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    return parseRecord(window.localStorage.getItem(CONSENT_KEY));
  } catch {
    return null;
  }
}

export function hasConsent(cat: OptionalCategory): boolean {
  return allows(readConsent(), cat);
}

/** Remove optional storage that the current choice no longer allows. */
export function cleanupOptional(rec: ConsentRecord | null): void {
  if (typeof window === "undefined") return;
  if (!allows(rec, "functional")) {
    try { window.localStorage.removeItem(HERO_START_KEY); } catch { /* storage blocked */ }
  }
  if (!allows(rec, "analytics")) {
    try {
      document.cookie = `${ANALYTICS_COOKIE}=; Max-Age=0; path=/; secure`;
      document.cookie = `${ANALYTICS_COOKIE}=; Max-Age=0; path=/`;
    } catch { /* ignore */ }
  }
}

export function saveConsent(method: ConsentMethod, choices: ConsentChoices = NO_OPTIONAL): ConsentRecord {
  const rec = makeRecord(method, choices);
  try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify(rec)); } catch { /* storage blocked: applies to this page only */ }
  cleanupOptional(rec);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: rec }));
  return rec;
}

/** Fires on changes in this tab and in other open tabs. */
export function subscribeConsent(cb: (rec: ConsentRecord | null) => void): () => void {
  const local = (e: Event) => cb((e as CustomEvent<ConsentRecord>).detail ?? readConsent());
  const other = (e: StorageEvent) => {
    if (e.key !== CONSENT_KEY && e.key !== null) return;
    const rec = readConsent();
    cleanupOptional(rec);
    cb(rec);
  };
  window.addEventListener(CONSENT_EVENT, local);
  window.addEventListener("storage", other);
  return () => {
    window.removeEventListener(CONSENT_EVENT, local);
    window.removeEventListener("storage", other);
  };
}

export function openConsentSettings(): void {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
