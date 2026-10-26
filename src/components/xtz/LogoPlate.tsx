import type { Client } from "./clients";

/**
 * Partner logo on a neutral white plate so original colours are preserved.
 * Without an authentic logo, a clean typographic wordmark is shown instead of a fabricated one.
 */
export function LogoPlate({ client, className = "" }: { client: Client; className?: string }) {
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
