import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminCheck,
  adminListQuotes,
  adminLogin,
  adminLogout,
  adminSignFile,
} from "@/lib/api/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }, { title: "Admin — Quote Requests" }],
  }),
  component: AdminPage,
});

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
  created_at: string;
};

function AdminPage() {
  const check = useServerFn(adminCheck);
  const login = useServerFn(adminLogin);
  const logout = useServerFn(adminLogout);
  const list = useServerFn(adminListQuotes);
  const sign = useServerFn(adminSignFile);

  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [query, setQuery] = useState("");
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    check().then((r) => {
      setAuthed(r.authed);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!authed) return;
    setListError(null);
    list()
      .then((r) => setRows(r.rows as QuoteRow[]))
      .catch((e) => setListError(e instanceof Error ? e.message : "Failed to load"));
  }, [authed]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
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
      setLoading(false);
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
        url = r.url;
      }
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not get file");
    }
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center">
        <div className="text-sm opacity-60">Loading…</div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center px-6">
        <form onSubmit={onLogin} className="w-full max-w-sm border border-white/10 rounded-lg p-8 bg-white/[0.02]">
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
            disabled={loading || !password}
            className="mt-5 w-full bg-white text-black text-sm font-medium rounded py-2 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) =>
        [r.name, r.email, r.phone, r.service, r.material, r.message, r.source]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    : rows;

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur z-10">
        <div>
          <h1 className="text-lg font-semibold">Quote Requests</h1>
          <p className="text-xs opacity-60">{filtered.length} of {rows.length}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, service…"
            className="bg-black border border-white/15 rounded px-3 py-2 text-sm w-72 focus:outline-none focus:border-white/40"
          />
          <button onClick={onLogout} className="text-xs border border-white/15 rounded px-3 py-2 hover:bg-white/5">
            Sign out
          </button>
        </div>
      </header>

      <div className="px-6 py-6">
        {listError && <div className="text-sm text-red-400 mb-4">{listError}</div>}
        <div className="overflow-x-auto border border-white/10 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/60">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Source</th>
                <th className="text-left p-3">Service</th>
                <th className="text-left p-3">Material</th>
                <th className="text-right p-3">Price</th>
                <th className="text-left p-3">Message</th>
                <th className="text-left p-3">File</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-white/5 align-top">
                  <td className="p-3 whitespace-nowrap text-white/70">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 whitespace-nowrap">{r.name}</td>
                  <td className="p-3 whitespace-nowrap">
                    <a className="text-blue-400 hover:underline" href={`mailto:${r.email}`}>{r.email}</a>
                  </td>
                  <td className="p-3 whitespace-nowrap">{r.phone ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap text-white/70">{r.source ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap">{r.service ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap">{r.material ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap text-right">
                    {r.estimated_price != null ? `€${Number(r.estimated_price).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 max-w-sm whitespace-pre-wrap text-white/80">
                    {r.message ?? "—"}
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
                </tr>
              ))}
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
    </main>
  );
}
