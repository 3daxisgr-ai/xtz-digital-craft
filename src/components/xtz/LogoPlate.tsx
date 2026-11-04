import type { Client } from "./clients";

/**
 * Partner logo on a neutral white plate so original colours are preserved
 * (white-on-black logos use a dark plate instead).
 * Without an authentic logo, a clean typographic wordmark is shown instead of a fabricated one.
 */
export function LogoPlate({ client, className = "" }: { client: Client; className?: string }) {
  const dark = client.plate === "dark";
  return (
    <div
      className={`flex items-center justify-center rounded-md px-5 py-3 ${
        dark ? "bg-black ring-1 ring-white/10" : "bg-white"
      } ${className}`}
    >
      {client.logo ? (
        <img
          src={client.logo}
          alt={`${client.name} logo`}
          draggable={false}
          className="h-full w-auto max-w-full object-contain"
        />
      ) : (
        <span className="font-display text-xl md:text-2xl font-bold tracking-[0.2em] text-neutral-900">
          {client.name}
        </span>
      )}
    </div>
  );
}
