export function Finale() {
  return (
    <section id="finale" className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-black">
      <div className="absolute inset-0">
        <div className="absolute inset-0 brushed-metal opacity-30" />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, oklch(0.4 0.2 245 / 0.5), transparent 65%)" }} />
        <div className="absolute bottom-0 inset-x-0 h-1/2"
          style={{ background: "linear-gradient(to top, oklch(0.55 0.22 245 / 0.3), transparent)" }} />
      </div>

      <div className="relative z-10 text-center px-6 max-w-5xl">
        <div className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary mb-10 animate-pulse-glow">
          End of Reel
        </div>
        <h2 className="font-display font-bold leading-[0.85] text-[clamp(3rem,11vw,12rem)] tracking-tighter text-glow">
          XTZ
        </h2>
        <p className="mt-12 text-2xl md:text-4xl font-display font-light text-foreground/90 max-w-3xl mx-auto leading-tight">
          Ready to build something extraordinary?
        </p>
        <div className="mt-16 flex justify-center">
          <a
            href="#quote"
            className="group relative inline-flex items-center gap-4 px-10 py-5 border border-primary bg-primary/10 backdrop-blur-sm blue-glow hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <span className="font-mono text-sm uppercase tracking-[0.4em]">Request a Quote</span>
            <span className="text-lg group-hover:translate-x-2 transition-transform">→</span>
          </a>
        </div>
        <div className="mt-32 flex flex-wrap justify-center gap-x-12 gap-y-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span>© XTZ Fabrication</span>
          <span>+ Precision Beyond Limits</span>
          <span>+ Worldwide Delivery</span>
        </div>
      </div>
    </section>
  );
}
