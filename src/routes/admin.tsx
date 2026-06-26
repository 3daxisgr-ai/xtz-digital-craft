import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_FLOW,
  STATUS_LABEL,
  adminAddNote,
  adminGetOrder,
  adminListOrders,
  adminPostMessage,
  adminUpdateOrder,
  adminUploadOrderFile,
  getOrderFileUrl,
  meIsAdmin,
} from "@/lib/api/orders.functions";
import { StatusBadge } from "@/components/portal/StatusProgress";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — TOREO Orders" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(meIsAdmin);
  const list = useServerFn(adminListOrders);
  const get = useServerFn(adminGetOrder);
  const update = useServerFn(adminUpdateOrder);
  const addNote = useServerFn(adminAddNote);
  const post = useServerFn(adminPostMessage);
  const upload = useServerFn(adminUploadOrderFile);
  const sign = useServerFn(getOrderFileUrl);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState({ q: "", status: "all" });
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [draft, setDraft] = useState<any>({});
  const [savedToast, setSavedToast] = useState(false);
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState({ title: "", description: "", visibility: "customer" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      const r = await checkAdmin({} as any);
      if (!r.admin) {
        navigate({ to: "/portal" });
        return;
      }
      setAuthed(true);
    })();
  }, [navigate, checkAdmin]);

  async function refresh() {
    const rows = await list({ data: filter });
    setOrders(rows as any[]);
  }

  useEffect(() => {
    if (authed) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, filter.status]);

  async function openOrder(code: string) {
    setSelected(code);
    const d = await get({ data: { order_code: code } });
    setDetail(d);
    setDraft({
      status: d.order.status,
      quote_price: d.order.quote_price,
      courier: d.order.courier ?? "",
      tracking_number: d.order.tracking_number ?? "",
      tracking_url: d.order.tracking_url ?? "",
      estimated_delivery: d.order.estimated_delivery ?? "",
      internal_notes: d.order.internal_notes ?? "",
      customer_name: d.order.customer_name,
      customer_email: d.order.customer_email,
      customer_phone: d.order.customer_phone ?? "",
      company: d.order.company ?? "",
    });
  }

  async function save() {
    if (!selected) return;
    const patch: any = { order_code: selected };
    for (const [k, v] of Object.entries(draft)) {
      if (v === "" && ["courier", "tracking_number", "tracking_url", "estimated_delivery", "internal_notes", "customer_phone", "company"].includes(k))
        patch[k] = null;
      else patch[k] = v;
    }
    if (patch.quote_price === "") patch.quote_price = null;
    else if (patch.quote_price != null) patch.quote_price = Number(patch.quote_price);
    await update({ data: patch });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
    openOrder(selected);
    refresh();
  }

  async function send() {
    if (!selected || !msg.trim()) return;
    await post({ data: { order_code: selected, body: msg.trim() } });
    setMsg("");
    openOrder(selected);
  }

  async function saveNote() {
    if (!selected || !note.title.trim()) return;
    await addNote({
      data: {
        order_code: selected,
        title: note.title.trim(),
        description: note.description.trim() || undefined,
        visibility: note.visibility as any,
      },
    });
    setNote({ title: "", description: "", visibility: "customer" });
    openOrder(selected);
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>, visibility: "customer" | "admin") {
    if (!selected || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const buf = await file.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    await upload({
      data: {
        order_code: selected,
        file_name: file.name,
        file_base64: b64,
        file_type: file.type || file.name.split(".").pop(),
        visibility,
      },
    });
    e.target.value = "";
    openOrder(selected);
  }

  async function download(path: string) {
    const { url } = await sign({ data: { file_path: path } });
    if (url) window.open(url, "_blank");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const filtered = useMemo(() => {
    if (!filter.q) return orders;
    const q = filter.q.toLowerCase();
    return orders.filter((o) =>
      [o.order_code, o.customer_name, o.customer_email, o.company]
        .filter(Boolean)
        .some((s: string) => s.toLowerCase().includes(q)),
    );
  }, [orders, filter.q]);

  if (authed === null) return <div className="min-h-screen bg-[#070708] text-white/40 text-sm flex items-center justify-center">Checking access…</div>;

  return (
    <div className="min-h-screen bg-[#070708] text-white">
      <header className="border-b border-white/10 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 bg-[#070708]/95 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-mono text-[10px] tracking-[0.3em] text-white/60 hover:text-white uppercase">
            ← TOREO
          </Link>
          <span className="text-xs text-amber-300 font-mono uppercase tracking-wider">Admin</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link to="/portal" className="text-white/60 hover:text-white">Portal</Link>
          <button onClick={signOut} className="text-white/60 hover:text-white">Sign out</button>
        </div>
      </header>

      <main className="grid lg:grid-cols-[420px_1fr] min-h-[calc(100vh-65px)]">
        {/* Sidebar */}
        <aside className="border-r border-white/10 p-4 space-y-3 overflow-y-auto lg:max-h-[calc(100vh-65px)]">
          <div className="flex gap-2">
            <input
              value={filter.q}
              onChange={(e) => setFilter({ ...filter, q: e.target.value })}
              placeholder="Search…"
              className="flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm placeholder:text-white/30 focus:border-white/40 outline-none"
            />
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="bg-black/40 border border-white/10 rounded-md px-2 text-xs"
            >
              <option value="all">All</option>
              {STATUS_FLOW.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">
            {filtered.length} orders
          </div>
          <div className="space-y-2">
            {filtered.map((o) => (
              <button
                key={o.id}
                onClick={() => openOrder(o.order_code)}
                className={`w-full text-left border rounded-md p-3 transition ${
                  selected === o.order_code
                    ? "border-white/40 bg-white/[0.06]"
                    : "border-white/10 hover:border-white/25 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-sm font-semibold">{o.order_code}</div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="text-xs text-white/60 mt-1 truncate">{o.customer_name}</div>
                <div className="text-[10px] text-white/40 truncate">{o.customer_email}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Detail */}
        <section className="p-6 md:p-8 overflow-y-auto lg:max-h-[calc(100vh-65px)]">
          {!detail ? (
            <div className="text-white/40 text-sm">Select an order to begin.</div>
          ) : (
            <div className="space-y-6 max-w-3xl">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-mono font-semibold tracking-wider">{detail.order.order_code}</h2>
                  <StatusBadge status={detail.order.status} />
                </div>
                <div className="flex items-center gap-2">
                  {savedToast && <span className="text-xs text-emerald-300">Saved ✓</span>}
                  <button onClick={save} className="bg-white text-black rounded-md px-4 py-2 text-sm font-semibold">
                    Save changes
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Status">
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  >
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Quote price (€)">
                  <input
                    type="number"
                    step="0.01"
                    value={draft.quote_price ?? ""}
                    onChange={(e) => setDraft({ ...draft, quote_price: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Customer name">
                  <input
                    value={draft.customer_name}
                    onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={draft.customer_email}
                    onChange={(e) => setDraft({ ...draft, customer_email: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={draft.customer_phone}
                    onChange={(e) => setDraft({ ...draft, customer_phone: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Company">
                  <input
                    value={draft.company}
                    onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Courier">
                  <input
                    value={draft.courier}
                    onChange={(e) => setDraft({ ...draft, courier: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Tracking number">
                  <input
                    value={draft.tracking_number}
                    onChange={(e) => setDraft({ ...draft, tracking_number: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Tracking URL">
                  <input
                    value={draft.tracking_url}
                    onChange={(e) => setDraft({ ...draft, tracking_url: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Estimated delivery">
                  <input
                    type="date"
                    value={draft.estimated_delivery || ""}
                    onChange={(e) => setDraft({ ...draft, estimated_delivery: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                </Field>
              </div>

              <Field label="Internal notes (admin only)">
                <textarea
                  rows={3}
                  value={draft.internal_notes}
                  onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                />
              </Field>

              {/* Files */}
              <section className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">Files</div>
                  <div className="flex gap-2 text-xs">
                    <label className="cursor-pointer border border-white/15 hover:border-white/40 rounded px-2 py-1">
                      Upload (customer-visible)
                      <input type="file" hidden onChange={(e) => uploadFile(e, "customer")} />
                    </label>
                    <label className="cursor-pointer border border-amber-500/30 text-amber-300 hover:border-amber-400 rounded px-2 py-1">
                      Upload (admin only)
                      <input type="file" hidden onChange={(e) => uploadFile(e, "admin")} />
                    </label>
                  </div>
                </div>
                <ul className="divide-y divide-white/5">
                  {detail.files.length === 0 && <li className="text-xs text-white/40 py-2">No files.</li>}
                  {detail.files.map((f: any) => (
                    <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                      <span>
                        {f.file_name}
                        {f.visibility === "admin" && (
                          <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-amber-300">internal</span>
                        )}
                      </span>
                      <button onClick={() => download(f.file_path)} className="text-xs text-sky-300 hover:underline">
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Timeline */}
              <section className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-3">Timeline</div>
                <ol className="space-y-3 relative pl-5 border-l border-white/10">
                  {detail.events.map((ev: any) => (
                    <li key={ev.id} className="relative">
                      <span className={`absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full ${ev.visibility === "admin" ? "bg-amber-400 ring-amber-400/20" : "bg-emerald-400 ring-emerald-400/20"} ring-4`} />
                      <div className="text-sm">{ev.title}{ev.visibility === "admin" && <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">internal</span>}</div>
                      {ev.description && <div className="text-xs text-white/50">{ev.description}</div>}
                      <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">
                        {new Date(ev.created_at).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 grid md:grid-cols-[1fr_2fr_auto_auto] gap-2">
                  <input
                    placeholder="Title"
                    value={note.title}
                    onChange={(e) => setNote({ ...note, title: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Description (optional)"
                    value={note.description}
                    onChange={(e) => setNote({ ...note, description: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                  <select
                    value={note.visibility}
                    onChange={(e) => setNote({ ...note, visibility: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded-md px-2 text-xs"
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Internal</option>
                  </select>
                  <button onClick={saveNote} className="bg-white text-black rounded-md px-3 text-sm font-semibold">
                    Add
                  </button>
                </div>
              </section>

              {/* Messages */}
              <section className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
                <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40 mb-3">Messages</div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {detail.messages.length === 0 && <div className="text-xs text-white/40">No messages yet.</div>}
                  {detail.messages.map((m: any) => (
                    <div key={m.id} className={`flex ${m.from_role === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.from_role === "admin" ? "bg-sky-500/20 text-sky-50 border border-sky-400/30" : "bg-white/10 text-white"}`}>
                        <div className="text-[10px] uppercase tracking-wider opacity-50 mb-1">
                          {m.from_role === "admin" ? "TOREO" : "Customer"} · {new Date(m.created_at).toLocaleString()}
                        </div>
                        {m.body}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Reply to customer…"
                    className="flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm"
                  />
                  <button onClick={send} className="bg-white text-black rounded-md px-4 text-sm font-semibold">
                    Send
                  </button>
                </div>
              </section>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-1">{label}</span>
      {children}
    </label>
  );
}
