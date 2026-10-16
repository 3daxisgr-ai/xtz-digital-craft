import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({ meta: [{ title: "Authorize access — TOREO" }, { name: "robots", content: "noindex,nofollow" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id");
    if (!authorizationId) throw new Error("Missing authorization request. Start the connection again.");
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen bg-[#070708] text-white flex items-center justify-center px-4">
      <p className="text-sm text-white/70">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as any;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an application";
  const scopes = String(details?.scope ?? details?.scopes ?? "").split(/[ ,]+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Connection failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md border border-border bg-card rounded-lg p-8">
        <p className="font-mono text-xs text-muted-foreground uppercase">TOREO</p>
        <h1 className="mt-4 text-2xl font-semibold">Connect {clientName} to TOREO</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {clientName} is requesting access to TOREO on your behalf. It will be able to use the TOREO tools as you,
          including looking up your own orders. It cannot see other customers' data.
        </p>
        {details?.user?.email && <p className="mt-3 text-sm">Account: {details.user.email}</p>}
        {(details?.redirect_uri ?? details?.client?.redirect_uri) && <p className="mt-3 text-xs break-all text-muted-foreground">Return address: {details.redirect_uri ?? details.client.redirect_uri}</p>}
        {scopes.map((scope: string) => <p key={scope} className="mt-2 text-sm">{scope === "email" ? "Share your email address" : scope === "profile" ? "Share your basic profile" : scope === "openid" ? "Confirm your account identity" : `Additional permission requested: ${scope}`}</p>)}
        <p className="mt-3 text-xs text-muted-foreground">Your existing TOREO permissions still determine which data is accessible.</p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-8 flex gap-3">
          <Button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1"
          >
            Approve
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1"
          >
            Cancel connection
          </Button>
        </div>
      </div>
    </main>
  );
}
