import { createFileRoute, redirect } from "@tanstack/react-router";

// TOREO does not provide CNC machining. This legacy English URL is kept
// only for old inbound links and issues a permanent (301) redirect to the
// closest real service. Query parameters are forwarded automatically.
export const Route = createFileRoute("/cnc-machining")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/custom-metal-parts",
      search: search as Record<string, unknown>,
      replace: true,
      statusCode: 301,
    });
  },
  component: () => null,
});
