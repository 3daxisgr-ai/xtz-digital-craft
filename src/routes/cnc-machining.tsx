import { createFileRoute, redirect } from "@tanstack/react-router";

// TOREO does not provide CNC machining in-house. This legacy URL is kept
// active only for old inbound links and now redirects to the closest real
// service — custom metal parts (laser cutting, bending, welding).
export const Route = createFileRoute("/cnc-machining")({
  beforeLoad: () => {
    throw redirect({ to: "/custom-metal-parts", replace: true });
  },
  component: () => null,
});
