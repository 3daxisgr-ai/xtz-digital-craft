import type { Client } from "./clients";

/**
 * Partner logo on a neutral white plate so original colours are preserved
 * (white-on-black logos use a dark plate instead).
 * Without an authentic logo, a clean typographic wordmark is shown instead of a fabricated one.
 * The glossy finish lives on the plate surface only — the logo artwork itself is untouched.
 */
export function LogoPlate({ client, className = "" }: { client: Client; className?: string }) {
  const dark = client.plate === "dark";
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-md px-5 py-3 ${
        dark
          ? "bg-gradient-to-br from-neutral-800 via-black to-neutral-900 ring-1 ring-white/10"
          : "bg-gradient-to-br from-white via-white to-neutral-100 ring-1 ring-neutral-900/5"
      } ${className}`}
    >
      {/* Soft top-light reflection on the card surface */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${
          dark
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent_45%)]"
            : "bg-[linear-gradient(180deg,rgba(255,255,255,0.9),transparent_50%)]"
        }`}
      />
      {/* Diagonal sheen — slightly stronger while the card is hovered */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none ${
          dark
            ? "bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.10)_48%,transparent_62%)]"
            : "bg-[linear-gradient(115deg,transparent_35%,rgba(148,163,184,0.10)_48%,transparent_62%)]"
        }`}
      />
      {client.logo ? (
        <img
          src={client.logo}
          alt={`${client.name} logo`}
          draggable={false}
          className="relative h-full w-auto max-w-full object-contain"
        />
      ) : (
        <span className="relative font-display text-xl md:text-2xl font-bold tracking-[0.2em] text-neutral-900">
          {client.name}
        </span>
      )}
    </div>
  );
}
