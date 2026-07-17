import { createFileRoute, redirect } from "@tanstack/react-router";

// TOREO does not provide CNC machining. Legacy URL redirects to the closest real service.
export const Route = createFileRoute("/cnc-machining")({
  beforeLoad: () => {
    throw redirect({ to: "/custom-metal-parts", replace: true });
  },
  component: () => null,
});

