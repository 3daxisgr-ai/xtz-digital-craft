import type { Client } from "./clients";

/**
 * Partner logo on a neutral white plate so original colours are preserved.
 * Without an authentic logo, a clean typographic wordmark is shown instead of a fabricated one.
 * A partner with a `wordmark` (based on its own sign lettering) gets bold white type on a dark plate.
 */
export function LogoPlate({ client, className = "" }: { client: Client; className?: string }) {
  if (!client.logo && client.wordmark) {
    return (
      <div
        role="img"
        aria-label={`${client.name} logo`}
        className={`flex items-center justify-center rounded-md bg-neutral-950 px-5 py-3 ring-1 ring-white/10 ${className}`}
      >
        <span className="flex items-baseline gap-[0.35em] whitespace-nowrap font-display uppercase leading-none text-white">
          <span className="text-[0.62em] font-semibold tracking-[0.3em] text-white/80">{client.wordmark.lead}</span>
          <span className="text-xl md:text-2xl font-black tracking-[0.08em]">{client.wordmark.main}</span>
        </span>
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center rounded-md bg-white px-5 py-3 ${className}`}>
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
