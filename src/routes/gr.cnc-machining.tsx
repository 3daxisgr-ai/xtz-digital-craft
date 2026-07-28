import { createFileRoute, redirect } from "@tanstack/react-router";

// TOREO does not provide CNC machining. This legacy Greek URL is kept only
// for old inbound links and issues a permanent (301) redirect to the closest
// real service on the same locale so the user's language selection is
// preserved. Query parameters are forwarded automatically by the router.
export const Route = createFileRoute("/gr/cnc-machining")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/gr/custom-metal-parts",
      search: search as Record<string, unknown>,
      replace: true,
      statusCode: 301,
    });
  },
  component: () => null,
});
