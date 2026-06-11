import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminCheck,
  adminDeleteQuote,
  adminListNotifications,
  adminListQuotes,
  adminLogin,
  adminLogout,
  adminMarkAllNotificationsRead,
  adminMarkNotificationRead,
  adminSignFile,
  adminUpdateQuote,
} from "@/lib/api/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Admin — Quote Requests" }],
  }),
  component: AdminPage,
});

type Status = "New" | "In Progress" | "Quoted" | "Completed";

type QuoteRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service: string | null;
  material: string | null;
  message: string | null;
  file_url: string | null;
  file_path: string | null;
  file_name: string | null;
  estimated_price: number | null;
  source: string | null;
  status: string;
  created_at: string;
};

const STATUSES: Status[] = ["New", "In Progress", "Quoted", "Completed"];

const STATUS_STYLE: Record<Status, string> = {
  "New": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "In Progress": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "Quoted": "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "Completed": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function normalizeStatus(s: string): Status {
  return (STATUSES as string[]).includes(s) ? (s as Status) : "New";
}

function AdminPage() {
  const check = useServerFn(adminCheck);
  const login = useServerFn(adminLogin);
  const logout = useServerFn(adminLogout);
  const list = useServerFn(adminListQuotes);
  const sign = useServerFn(adminSignFile);
  const update = useServerFn(adminUpdateQuote);
  const remove = useServerFn(adminDeleteQuote);
  const listNotifs = useServerFn(adminListNotifications);
  const markRead = useServerFn(adminMarkNotificationRead);
  const markAllRead = useServerFn(adminMarkAllNotificationsRead);

  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const [viewing, setViewing] = useState<QuoteRow | null>(null);
  const [editing, setEditing] = useState<QuoteRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<QuoteRow | null>(null);

  type Notif = { id: string; quote_id: string | null; title: string; body: string | null; read: boolean; created_at: string };
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    check().then((r) => {
      setAuthed(r.authed);
      setReady(true);
    });
  }, []);

  async function refresh() {
    setLoadError(null);
    const r = await list();
    if (!r.authed) {
      setAuthed(false);
      setRows([]);
      return;
    }
    setRows(r.rows as QuoteRow[]);
  }

  useEffect(() => {
    if (authed) refresh().catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load"));
  }, [authed]);

  async function refreshNotifs() {
    try {
      const r = await listNotifs();
      if (!r.authed) return;
      setNotifs(r.items);
    } catch (e) {
      console.error("notif load failed", e);
    }
  }

  useEffect(() => {
    if (!authed) return;
    refreshNotifs();
    // Realtime: server-side broadcast on every new submission
    const channel = supabase.channel("admin-notifications");
    channel.on("broadcast", { event: "new" }, () => {
      refreshNotifs();
      refresh().catch(() => {});
    });
    channel.subscribe();
    // Safety net poll
    const t = setInterval(refreshNotifs, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(t);
    };
  }, [authed]);

  // Close notif panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  async function onClickNotif(n: Notif) {
    if (!n.read) {
      try {
        await markRead({ data: { id: n.id } });
        setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch {}
    }
    setNotifOpen(false);
    if (n.quote_id) {
      const row = rows.find((r) => r.id === n.quote_id);
      if (row) {
        setViewing(row);
      } else {
        // not loaded yet — refresh then try again
        await refresh().catch(() => {});
        setRows((prev) => {
          const found = prev.find((r) => r.id === n.quote_id);
          if (found) setViewing(found);
          return prev;
        });
      }
    }
  }

  async function onMarkAllRead() {
    try {
      await markAllRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }


  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const r = await login({ data: { password } });
      if (r.ok) {
        setAuthed(true);
        setPassword("");
      } else {
        setLoginError("Incorrect password");
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoggingIn(false);
    }
  }

  async function onLogout() {
    await logout();
    setAuthed(false);
    setRows([]);
  }

  async function onDownload(row: QuoteRow) {
    try {
      let url = row.file_url;
      if (row.file_path) {
        const r = await sign({ data: { path: row.file_path } });
        if (!r.authed) {
          setAuthed(false);
          return;
        }
        url = r.url;
      }
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not get file");
    }
  }

  async function onSetStatus(row: QuoteRow, status: Status) {
    setBusy(row.id);
    try {
      const r = await update({ data: { id: row.id, patch: { status } } });
      if (!r.authed) {
        setAuthed(false);
        return;
      }
      if (r.row) setRows((prev) => prev.map((x) => (x.id === row.id ? (r.row as QuoteRow) : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSaveEdit(patch: Partial<QuoteRow>) {
    if (!editing) return;
    setBusy(editing.id);
    try {
      const r = await update({
        data: {
          id: editing.id,
          patch: {
            name: patch.name,
            email: patch.email,
            phone: patch.phone ?? null,
            service: patch.service ?? null,
            material: patch.material ?? null,
            message: patch.message ?? null,
            estimated_price:
              patch.estimated_price === null || patch.estimated_price === undefined
                ? null
                : Number(patch.estimated_price),
          },
        },
      });
      if (!r.authed) {
        setAuthed(false);
        return;
      }
      if (r.row) setRows((prev) => prev.map((x) => (x.id === editing.id ? (r.row as QuoteRow) : x)));
      setEditing(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(row: QuoteRow) {
    setBusy(row.id);
    try {
      const r = await remove({ data: { id: row.id } });
      if (!r.authed) {
        setAuthed(false);
        return;
      }
      setRows((prev) => prev.filter((x) => x.id !== row.id));
      setConfirmDelete(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  const services = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.service && s.add(r.service));
    return Array.from(s).sort();
  }, [rows]);

  const stats = useMemo(() => {
    let total = 0, n = 0, ip = 0, d = 0;
    for (const r of rows) {
      total++;
      const s = normalizeStatus(r.status);
      if (s === "new") n++;
      else if (s === "in_progress") ip++;
      else if (s === "done") d++;
    }
    return { total, new: n, in_progress: ip, done: d };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (statusFilter !== "all" && normalizeStatus(r.status) !== statusFilter) return false;
      if (serviceFilter !== "all" && (r.service ?? "") !== serviceFilter) return false;
      if (q) {
        const hay = [r.name, r.email, r.phone].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return out;
  }, [rows, query, statusFilter, serviceFilter, sort]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white grid place-items-center">
        <div className="text-sm opacity-60">Loading…</div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white grid place-items-center px-6">
        <form
          onSubmit={onLogin}
          className="w-full max-w-sm border border-white/10 rounded-lg p-8 bg-white/[0.02]"
        >
          <h1 className="text-xl font-semibold mb-1">Admin Access</h1>
          <p className="text-xs opacity-60 mb-6">Enter the admin password to continue.</p>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-black border border-white/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/40"
          />
          {loginError && <div className="mt-3 text-xs text-red-400">{loginError}</div>}
          <button
            type="submit"
            disabled={loggingIn || !password}
            className="mt-5 w-full bg-white text-black text-sm font-medium rounded py-2 disabled:opacity-50"
          >
            {loggingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-neutral-950/85 backdrop-blur z-10">
        <div>
          <h1 className="text-lg font-semibold">Quote Requests</h1>
          <p className="text-xs opacity-60">Admin dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              className="relative h-9 w-9 grid place-items-center border border-white/15 rounded hover:bg-white/5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {notifs.some((n) => !n.read) && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-semibold rounded-full bg-red-500 text-white">
                  {notifs.filter((n) => !n.read).length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-[360px] max-h-[480px] overflow-y-auto bg-neutral-900 border border-white/10 rounded-lg shadow-2xl z-20">
                <div className="flex items-center justify-between p-3 border-b border-white/10 sticky top-0 bg-neutral-900">
                  <div className="text-sm font-semibold">Notifications</div>
                  <button
                    onClick={onMarkAllRead}
                    className="text-[11px] text-white/60 hover:text-white"
                    disabled={!notifs.some((n) => !n.read)}
                  >
                    Mark all read
                  </button>
                </div>
                {notifs.length === 0 && (
                  <div className="p-6 text-center text-xs text-white/50">No notifications yet.</div>
                )}
                {notifs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onClickNotif(n)}
                    className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 flex gap-3 ${n.read ? "opacity-60" : ""}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.read ? "bg-white/20" : "bg-blue-400"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white/90 truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-white/50 truncate">{n.body}</div>}
                      <div className="text-[10px] text-white/40 mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => refresh()}
            className="text-xs border border-white/15 rounded px-3 py-2 hover:bg-white/5"
          >
            Refresh
          </button>
          <button
            onClick={onLogout}
            className="text-xs border border-white/15 rounded px-3 py-2 hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="px-6 py-6 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} accent="text-white" />
          <StatCard label="New" value={stats.new} accent="text-blue-300" />
          <StatCard label="In Progress" value={stats.in_progress} accent="text-amber-300" />
          <StatCard label="Done" value={stats.done} accent="text-emerald-300" />
        </section>

        <section className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone…"
            className="bg-black border border-white/15 rounded px-3 py-2 text-sm w-72 focus:outline-none focus:border-white/40"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | Status)}
            className="bg-black border border-white/15 rounded px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="bg-black border border-white/15 rounded px-3 py-2 text-sm"
          >
            <option value="all">All services</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            className="bg-black border border-white/15 rounded px-3 py-2 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <div className="text-xs opacity-60 ml-auto">{filtered.length} of {rows.length}</div>
        </section>

        {loadError && <div className="text-sm text-red-400">{loadError}</div>}

        <div className="overflow-x-auto border border-white/10 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/60">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Service</th>
                <th className="text-left p-3">Material</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Price</th>
                <th className="text-left p-3">File</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const status = normalizeStatus(r.status);
                return (
                  <tr key={r.id} className="border-t border-white/5 align-top">
                    <td className="p-3 whitespace-nowrap text-white/70">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 whitespace-nowrap">{r.name}</td>
                    <td className="p-3 whitespace-nowrap">
                      <a className="text-blue-400 hover:underline" href={`mailto:${r.email}`}>
                        {r.email}
                      </a>
                    </td>
                    <td className="p-3 whitespace-nowrap">{r.phone ?? "—"}</td>
                    <td className="p-3 whitespace-nowrap">{r.service ?? "—"}</td>
                    <td className="p-3 whitespace-nowrap">{r.material ?? "—"}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`inline-block text-xs border rounded px-2 py-0.5 ${STATUS_STYLE[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-right">
                      {r.estimated_price != null ? `€${Number(r.estimated_price).toFixed(2)}` : "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {r.file_path || r.file_url ? (
                        <button
                          onClick={() => onDownload(r)}
                          className="text-blue-400 hover:underline"
                        >
                          {r.file_name ?? "Download"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-right">
                      <div className="inline-flex gap-1">
                        <ActionBtn onClick={() => setViewing(r)}>View</ActionBtn>
                        <ActionBtn onClick={() => setEditing(r)}>Edit</ActionBtn>
                        {status !== "in_progress" && (
                          <ActionBtn
                            onClick={() => onSetStatus(r, "in_progress")}
                            disabled={busy === r.id}
                          >
                            Start
                          </ActionBtn>
                        )}
                        {status !== "done" && (
                          <ActionBtn
                            onClick={() => onSetStatus(r, "done")}
                            disabled={busy === r.id}
                            variant="success"
                          >
                            Done
                          </ActionBtn>
                        )}
                        <ActionBtn
                          onClick={() => setConfirmDelete(r)}
                          variant="danger"
                          disabled={busy === r.id}
                        >
                          Delete
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-white/50">
                    No quote requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <Modal onClose={() => setViewing(null)} title="Quote details">
          <DetailsView row={viewing} onDownload={() => onDownload(viewing)} />
        </Modal>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} title="Edit quote">
          <EditForm
            initial={editing}
            busy={busy === editing.id}
            onCancel={() => setEditing(null)}
            onSave={onSaveEdit}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} title="Delete quote?">
          <p className="text-sm text-white/70 mb-5">
            Permanently delete the quote from <strong>{confirmDelete.name}</strong>? This will also
            remove the uploaded file. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="text-sm border border-white/15 rounded px-3 py-2 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(confirmDelete)}
              disabled={busy === confirmDelete.id}
              className="text-sm bg-red-600 hover:bg-red-500 rounded px-3 py-2 disabled:opacity-50"
            >
              {busy === confirmDelete.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
      <div className={`text-3xl font-semibold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "success" | "danger";
}) {
  const styles =
    variant === "danger"
      ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
      : variant === "success"
      ? "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
      : "border-white/15 text-white/80 hover:bg-white/5";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs border rounded px-2 py-1 disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-white/10 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function DetailsView({ row, onDownload }: { row: QuoteRow; onDownload: () => void }) {
  const status = normalizeStatus(row.status);
  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <div className="text-xs uppercase tracking-wider text-white/40 mb-1">{label}</div>
      <div className="text-sm text-white/90 whitespace-pre-wrap break-words">{value || "—"}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Name" value={row.name} />
      <Field label="Email" value={row.email} />
      <Field label="Phone" value={row.phone} />
      <Field
        label="Status"
        value={
          <span className={`inline-block text-xs border rounded px-2 py-0.5 ${STATUS_STYLE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        }
      />
      <Field label="Service" value={row.service} />
      <Field label="Material" value={row.material} />
      <Field
        label="Estimated Price"
        value={row.estimated_price != null ? `€${Number(row.estimated_price).toFixed(2)}` : "—"}
      />
      <Field label="Source" value={row.source} />
      <Field label="Created" value={new Date(row.created_at).toLocaleString()} />
      <Field
        label="File"
        value={
          row.file_path || row.file_url ? (
            <button onClick={onDownload} className="text-blue-400 hover:underline">
              {row.file_name ?? "Download"}
            </button>
          ) : (
            "—"
          )
        }
      />
      <div className="col-span-2">
        <Field label="Message" value={row.message} />
      </div>
    </div>
  );
}

function EditForm({
  initial,
  busy,
  onCancel,
  onSave,
}: {
  initial: QuoteRow;
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: Partial<QuoteRow>) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [service, setService] = useState(initial.service ?? "");
  const [material, setMaterial] = useState(initial.material ?? "");
  const [message, setMessage] = useState(initial.message ?? "");
  const [price, setPrice] = useState(
    initial.estimated_price != null ? String(initial.estimated_price) : "",
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      service: service.trim() || null,
      material: material.trim() || null,
      message: message.trim() || null,
      estimated_price: price.trim() === "" ? null : Number(price),
    });
  }

  const input =
    "w-full bg-black border border-white/15 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/40";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Name">
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
        </Labeled>
        <Labeled label="Email">
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Labeled>
        <Labeled label="Phone">
          <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Labeled>
        <Labeled label="Estimated Price (€)">
          <input className={input} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Labeled>
        <Labeled label="Service">
          <input className={input} value={service} onChange={(e) => setService(e.target.value)} />
        </Labeled>
        <Labeled label="Material">
          <input className={input} value={material} onChange={(e) => setMaterial(e.target.value)} />
        </Labeled>
      </div>
      <Labeled label="Message">
        <textarea
          className={`${input} min-h-[120px]`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </Labeled>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm border border-white/15 rounded px-3 py-2 hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="text-sm bg-white text-black rounded px-4 py-2 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-white/50 mb-1">{label}</span>
      {children}
    </label>
  );
}
