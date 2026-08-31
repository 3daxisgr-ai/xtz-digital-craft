// AI-assisted customer request workspace for one order.
//
// Everything is human-in-the-loop: the assistant drafts, the admin reviews and
// presses SEND. Nothing here can send an email on its own.

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  aiAnalyzeOrder,
  aiSaveSummary,
  aiGetIntake,
  aiNextAction,
  aiDraftEmail,
  aiSendEmail,
} from "@/lib/api/ai-email.functions";

const box = "border border-white/10 bg-[#0f131a] rounded-sm";
const label = "text-[10px] font-mono tracking-[0.3em] uppercase text-white/40";
const btn =
  "border border-white/15 hover:border-white/40 rounded-sm px-3 py-2 text-[10px] font-mono tracking-[0.3em] uppercase disabled:opacity-40";

export function AiRequestSummary({ orderCode }: { orderCode: string }) {
  const get = useServerFn(aiGetIntake);
  const analyze = useServerFn(aiAnalyzeOrder);
  const save = useServerFn(aiSaveSummary);
  const next = useServerFn(aiNextAction);

  const [intake, setIntake] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draftSummary, setDraftSummary] = useState("");
  const [action, setAction] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await get({ data: { orderCode } });
        setIntake(r.intake);
        setDraftSummary(r.intake?.summary ?? "");
      } catch { /* not authed / no data */ }
    })();
  }, [orderCode]); // eslint-disable-line

  async function run() {
    setBusy(true); setErr(null);
    try {
      const r = await analyze({ data: { orderCode } });
      if (!r.ok) setErr(r.error);
      else { setIntake(r.data); setDraftSummary(r.data.summary ?? ""); }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function runNextAction() {
    setBusy(true); setErr(null);
    try {
      const r = await next({ data: { orderCode } });
      if (!r.ok) setErr(r.error); else setAction(r.action);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className={`${box} p-5 space-y-4`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className={label}>Customer request summary · internal</div>
        <div className="flex gap-2">
          <button onClick={run} disabled={busy} className={btn}>{intake ? "Regenerate" : "Analyze request"}</button>
          <button onClick={runNextAction} disabled={busy} className={btn}>Next action</button>
        </div>
      </div>

      {err && <div className="text-xs text-red-400 font-mono">{err}</div>}
      {action && (
        <div className="text-xs text-emerald-300 border border-emerald-400/20 bg-emerald-400/5 rounded-sm px-3 py-2">
          Recommended next action: {action}
        </div>
      )}

      {intake && (
        <>
          <textarea
            value={draftSummary}
            onChange={(e) => setDraftSummary(e.target.value)}
            rows={6}
            className="w-full bg-black/40 border border-white/10 focus:border-white/30 outline-none rounded-sm px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={async () => { await save({ data: { orderCode, summary: draftSummary } }); }}
              className={btn}
            >
              Save summary
            </button>
            {typeof intake.confidence === "number" && (
              <span className="text-[10px] font-mono text-white/40">CONFIDENCE {intake.confidence}%</span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <Facts title="Extracted" rows={[
              ["Company", intake.company], ["Contact", intake.contact_person], ["Phone", intake.phone],
              ["Project", intake.project_name], ["Product", intake.requested_product], ["Quantity", intake.quantity],
              ["Material", intake.materials], ["Dimensions", intake.dimensions], ["Process", intake.process],
              ["Deadline", intake.deadline], ["Delivery", intake.delivery_requirements], ["Urgency", intake.urgency],
            ]} />
            <div className="space-y-3">
              <List title="Technical requirements" items={intake.technical_requirements} />
              <List title="Customer questions" items={intake.customer_questions} />
              <List title="Missing information" items={intake.missing} tone="amber" />
            </div>
          </div>
        </>
      )}
      {!intake && !busy && (
        <p className="text-xs text-white/40">No analysis yet. Run it to extract structured request data.</p>
      )}
      {busy && <div className="text-[10px] font-mono tracking-[0.3em] text-white/40">WORKING…</div>}
    </div>
  );
}

function Facts({ title, rows }: { title: string; rows: [string, unknown][] }) {
  return (
    <div>
      <div className={`${label} mb-2`}>{title}</div>
      <dl className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-28 shrink-0 text-white/35">{k}</dt>
            <dd className={v ? "text-white/85" : "text-white/25"}>{v ? String(v) : "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items?: string[]; tone?: "amber" }) {
  return (
    <div>
      <div className={`${label} mb-2`}>{title}</div>
      {items?.length ? (
        <ul className={`space-y-1 ${tone === "amber" ? "text-amber-300/90" : "text-white/80"}`}>
          {items.map((i, n) => <li key={n}>· {i}</li>)}
        </ul>
      ) : <div className="text-white/25">—</div>}
    </div>
  );
}

export function AiEmailAssistant({
  orderCode,
  customerEmail,
  onSent,
}: {
  orderCode: string;
  customerEmail: string;
  onSent?: () => void;
}) {
  const draftFn = useServerFn(aiDraftEmail);
  const sendFn = useServerFn(aiSendEmail);

  const [instruction, setInstruction] = useState("");
  const [language, setLanguage] = useState<"auto" | "el" | "en">("auto");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [regens, setRegens] = useState(0);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function generate() {
    if (!instruction.trim()) return;
    setBusy(true); setErr(null); setOkMsg(null);
    try {
      const r = await draftFn({ data: { orderCode, instruction, language } });
      if (!r.ok) { setErr(r.error); return; }
      setSubject(r.subject); setBody(r.body); setAiGenerated(true);
      setRegens((n) => (subject || body ? n + 1 : n));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function send() {
    if (!subject.trim() || !body.trim()) return;
    if (!confirm(`Send this email to ${customerEmail}?`)) return;
    setBusy(true); setErr(null); setOkMsg(null);
    try {
      const r = await sendFn({
        data: {
          orderCode, to: customerEmail, subject, body,
          aiGenerated, instruction: instruction || null, regenerations: regens,
        },
      });
      if (!r.ok) setErr(r.error ?? "Send failed");
      else { setOkMsg("Email sent."); setSubject(""); setBody(""); setInstruction(""); setRegens(0); setAiGenerated(false); onSent?.(); }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className={`${box} p-5 space-y-4`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className={label}>Email assistant</div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as any)}
          className="bg-black/40 border border-white/10 rounded-sm px-2 py-1 text-[10px] font-mono tracking-[0.2em] uppercase"
        >
          <option value="auto">Auto language</option>
          <option value="el">Ελληνικά</option>
          <option value="en">English</option>
        </select>
      </div>

      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate(); }}
        rows={3}
        placeholder="Tell the customer that… / Γράψε του ότι…"
        className="w-full bg-black/40 border border-white/10 focus:border-white/30 outline-none rounded-sm px-3 py-2 text-sm"
      />
      <div className="flex gap-2 flex-wrap">
        <button onClick={generate} disabled={busy || !instruction.trim()} className={btn}>
          {busy ? "Working…" : subject ? "Regenerate" : "Generate email"}
        </button>
        {regens > 0 && <span className="text-[10px] font-mono text-white/30 self-center">REGENERATIONS {regens}</span>}
      </div>

      {err && <div className="text-xs text-red-400 font-mono break-all">{err}</div>}
      {okMsg && <div className="text-xs text-emerald-300 font-mono">{okMsg}</div>}

      {(subject || body) && (
        <div className="border border-white/10 rounded-sm">
          <div className="px-4 py-3 border-b border-white/10 space-y-1 text-xs">
            <div><span className="text-white/35">TO </span>{customerEmail}</div>
            <div><span className="text-white/35">FROM </span>TOREO</div>
            <div className="flex items-center gap-2">
              <span className="text-white/35">SUBJECT </span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 focus:border-white/30 outline-none rounded-sm px-2 py-1 text-xs"
              />
            </div>
          </div>
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setAiGenerated(false); }}
            rows={12}
            className="w-full bg-black/30 outline-none px-4 py-3 text-sm leading-relaxed"
          />
          <div className="px-4 py-3 border-t border-white/10 flex gap-2 flex-wrap">
            <button onClick={send} disabled={busy} className="bg-amber-300 text-black rounded-sm px-4 py-2 text-[10px] font-mono tracking-[0.3em] font-semibold disabled:opacity-40">
              SEND EMAIL
            </button>
            <button onClick={generate} disabled={busy} className={btn}>Regenerate</button>
            <button onClick={() => navigator.clipboard?.writeText(`${subject}\n\n${body}`)} className={btn}>Copy</button>
            <button onClick={() => { setSubject(""); setBody(""); }} className={btn}>Discard</button>
          </div>
        </div>
      )}
      <p className="text-[10px] font-mono text-white/25">Drafts are never sent automatically — sending always requires your confirmation.</p>
    </div>
  );
}
