import { useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "./i18n";
import factoryScene from "@/assets/factory-scene.jpg";
import laserImg from "@/assets/akj-fiber-laser.jpg.asset.json";
import bambuImg from "@/assets/bambu-3d-printing.png.asset.json";
import pressBrakeImg from "@/assets/durmapress-stratza.webp.asset.json";
import weldingImg from "@/assets/laser-welding.jpg.asset.json";
import shearMachine from "@/assets/sheet-metal-shear-machine.jpg.asset.json";

type Spot = {
  id: string;
  /* hotspot box in % of image */
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  kicker: string;
  image: string;
  description: string;
  capabilities: string[];
  specs: string[];
  applications: string[];
};

function getSpots(lang: "EN" | "GR"): Spot[] {
  const gr = lang === "GR";
  return [
    {
      id: "laser",
      x: 2,
      y: 33,
      w: 21,
      h: 26,
      name: gr ? "AKJ1530F Fiber Laser" : "AKJ1530F Fiber Laser",
      kicker: gr ? "Κοπή Λαμαρίνας" : "Sheet Metal Cutting",
      image: laserImg.url,
      description: gr
        ? "Κοπή λαμαρίνας με καθαρές ακμές και σταθερή επαναληψιμότητα, για εξαρτήματα, βάσεις, καλύμματα, πάνελ και custom μεταλλικά μέρη σύμφωνα με τα σχέδια του πελάτη."
        : "Sheet metal cutting with clean edges and consistent repeatability — components, brackets, covers, panels and custom metal parts made to your drawings.",
      capabilities: gr
        ? ["Κοπή λαμαρίνας", "Μικρές & μεγάλες σειρές", "Μεμονωμένα εξαρτήματα", "Αρχεία DXF / DWG"]
        : ["Sheet metal cutting", "Small & large runs", "One-off parts", "DXF / DWG files"],
      specs: gr
        ? ["Πηγή Fiber Laser 2 kW", "Επιφάνεια εργασίας 1500 × 3000 mm", "Χάλυβας · Inox · Αλουμίνιο · Ορείχαλκος · Χαλκός"]
        : ["2 kW fiber laser source", "Working area 1500 × 3000 mm", "Steel · Stainless · Aluminium · Brass · Copper"],
      applications: gr
        ? ["Πάνελ & πλαίσια", "Βάσεις & στηρίγματα", "Κουτιά & καλύμματα", "Διακοσμητικά μέρη"]
        : ["Panels & frames", "Brackets & supports", "Boxes & enclosures", "Decorative parts"],
    },
    {
      id: "printing",
      x: 23,
      y: 34,
      w: 15,
      h: 18,
      name: "Bambu Lab H2S",
      kicker: gr ? "3D Εκτύπωση · 3 Μονάδες" : "3D Printing · 3 Units",
      image: bambuImg.url,
      description: gr
        ? "Λειτουργικά πρωτότυπα, ανταλλακτικά, βάσεις, καλύμματα και εξαρτήματα τελικής χρήσης σε μικρές σειρές. Υλικό και ρυθμίσεις επιλέγονται ανά εφαρμογή."
        : "Functional prototypes, replacement parts, brackets, covers and small-series end-use components. Material and print settings selected per application.",
      capabilities: gr
        ? ["Πολλαπλά υλικά & χρώματα", "Ταχεία πρωτοτυποποίηση", "Μικρές σειρές παραγωγής", "Ανταλλακτικά κατά παραγγελία"]
        : ["Multi-material & multi-colour", "Rapid prototyping", "Small production series", "On-demand spare parts"],
      specs: gr
        ? ["Χώρος εκτύπωσης 340 × 320 × 340 mm", "2× ακροφύσιο 0.4 mm · 1× 0.2 mm", "AMS 2 Pro"]
        : ["Build volume 340 × 320 × 340 mm", "2× 0.4 mm nozzle · 1× 0.2 mm", "AMS 2 Pro multi-material"],
      applications: gr
        ? ["Λειτουργικά πρωτότυπα", "Βοηθητικά παραγωγής", "Καλύμματα & βάσεις", "Τελικά εξαρτήματα"]
        : ["Functional prototypes", "Production aids", "Covers & brackets", "End-use parts"],
    },
    {
      id: "press-brake",
      x: 40,
      y: 23,
      w: 23,
      h: 32,
      name: gr ? "DURMAPRESS Πρέσα Στραντζαρίσματος" : "DURMAPRESS Press Brake",
      kicker: gr ? "Κάμψη · 2 Μονάδες" : "Bending · 2 Units",
      image: pressBrakeImg.url,
      description: gr
        ? "Κάμψη και διαμόρφωση μεταλλικών εξαρτημάτων σε συγκεκριμένες γωνίες και διαστάσεις, με ελεγχόμενη ακρίβεια και σταθερή επαναληψιμότητα."
        : "Bending and forming of sheet metal parts to specific angles and dimensions, with controlled accuracy and consistent repeatability.",
      capabilities: gr
        ? ["Κάμψη λαμαρίνας", "Ελεγχόμενες γωνίες", "Σειρές παραγωγής", "Custom διαμόρφωση"]
        : ["Sheet metal bending", "Controlled angles", "Production runs", "Custom forming"],
      specs: gr
        ? ["Ηλεκτροϋδραυλικό χειριστήριο Delem", "6+1 άξονες", "Σταθερή επαναληψιμότητα"]
        : ["Electro-hydraulic Delem control", "6+1 axes", "Consistent repeatability"],
      applications: gr
        ? ["Κουτιά & καλύμματα", "Στηρίγματα", "Πάνελ & πλαίσια", "Custom λαμαρίνα"]
        : ["Boxes & enclosures", "Supports", "Panels & frames", "Custom sheet metal"],
    },
    {
      id: "welding",
      x: 66,
      y: 31,
      w: 31,
      h: 21,
      name: gr ? "Σταθμοί Συγκόλλησης" : "Welding Stations",
      kicker: gr ? "MIG · TIG · Laser · RSW" : "MIG · TIG · Laser · RSW",
      image: weldingImg.url,
      description: gr
        ? "Συναρμολόγηση μεταλλικών εξαρτημάτων και ολοκλήρωση custom κατασκευών. Η μέθοδος επιλέγεται ανάλογα με υλικό, πάχος και γεωμετρία."
        : "Assembly of metal components and completion of custom fabrications. The method is selected according to material, thickness and geometry.",
      capabilities: gr
        ? ["Συγκόλληση MIG", "Συγκόλληση TIG", "Συγκόλληση Laser", "Πονταρίσματα (RSW)"]
        : ["MIG welding", "TIG welding", "Laser welding", "Spot welding (RSW)"],
      specs: gr
        ? ["2 σταθμοί εργασίας", "Χάλυβας · Inox · Αλουμίνιο", "Έλεγχος ραφών"]
        : ["2 workstations", "Steel · Stainless · Aluminium", "Seam inspection"],
      applications: gr
        ? ["Μεταλλικές κατασκευές", "Πλαίσια", "Δεξαμενές & κουτιά", "Επισκευές"]
        : ["Metal fabrications", "Frames", "Tanks & enclosures", "Repairs"],
    },
    {
      id: "shear",
      x: 52,
      y: 52,
      w: 48,
      h: 43,
      name: gr ? "Ψαλίδι Λαμαρίνας" : "Sheet Metal Shear",
      kicker: gr ? "Ευθεία Κοπή Λαμαρίνας" : "Straight Sheet Cutting",
      image: shearMachine.url,
      description: gr
        ? "Ευθεία κοπή λαμαρίνας σε λωρίδες και πλάκες, για την προετοιμασία υλικού πριν από τις επόμενες εργασίες κατεργασίας και διαμόρφωσης."
        : "Straight cutting of sheet metal into strips and blanks, preparing material before the following forming and fabrication steps.",
      capabilities: gr
        ? ["Ευθεία κοπή λαμαρίνας", "Κοπή σε λωρίδες", "Κοπή σε πλάκες", "Προετοιμασία υλικού"]
        : ["Straight sheet cutting", "Strip cutting", "Blank cutting", "Material preparation"],
      specs: gr
        ? ["Υδραυλικό ψαλίδι λαμαρίνας", "Ρυθμιζόμενος οπίσθιος οδηγός", "Καθαρή, ευθεία ακμή κοπής"]
        : ["Hydraulic guillotine shear", "Adjustable back gauge", "Clean straight cut edge"],
      applications: gr
        ? ["Λωρίδες λαμαρίνας", "Πλάκες για στράντζα", "Προετοιμασία υλικού", "Κοπή στις διαστάσεις"]
        : ["Sheet strips", "Blanks for bending", "Material preparation", "Cut to size"],
    },
  ];
}

export function FactoryScene() {
  const { lang } = useI18n();
  const spots = getSpots(lang);
  const [hovered, setHovered] = useState<string | null>(null);
  const [active, setActive] = useState<Spot | null>(null);

  const activeSpot = spots.find((s) => s.id === hovered) ?? null;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#05070d" }}
      aria-label={lang === "GR" ? "Διαδραστική περιήγηση εργοστασίου" : "Interactive factory tour"}
    >
      <div className="relative mx-auto max-w-[1800px]">
        <div className="relative w-full aspect-[16/9] min-h-[60vh] md:min-h-[80vh] overflow-hidden">
          <img
            src={factoryScene}
            alt={
              lang === "GR"
                ? "Το εργοστάσιο της TOREO με fiber laser, 3D εκτυπωτές, πρέσα στραντζαρίσματος και σταθμό συγκόλλησης"
                : "TOREO factory floor with fiber laser, 3D printers, press brake and welding station"
            }
            width={1920}
            height={1088}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out"
            style={{
              filter: hovered ? "brightness(0.55) saturate(0.85)" : "brightness(0.9)",
              transform: hovered ? "scale(1.02)" : "scale(1)",
            }}
          />

          {/* focus spotlight following the hovered machine */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: activeSpot ? 1 : 0,
              background: activeSpot
                ? `radial-gradient(ellipse ${activeSpot.w * 1.1}% ${activeSpot.h * 1.3}% at ${
                    activeSpot.x + activeSpot.w / 2
                  }% ${activeSpot.y + activeSpot.h / 2}%, rgba(255,255,255,0.30), rgba(255,255,255,0.06) 55%, transparent 78%)`
                : "none",
              mixBlendMode: "screen",
            }}
          />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(5,7,13,0.85) 0%, transparent 22%, transparent 62%, rgba(5,7,13,0.92) 100%)",
            }}
          />

          {/* hotspots */}
          {spots.map((s) => {
            const isOn = hovered === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onMouseEnter={() => setHovered(s.id)}
                onMouseLeave={() => setHovered((h) => (h === s.id ? null : h))}
                onFocus={() => setHovered(s.id)}
                onBlur={() => setHovered((h) => (h === s.id ? null : h))}
                onClick={() => setActive(s)}
                aria-label={s.name}
                className="absolute group outline-none"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: `${s.w}%`,
                  height: `${s.h}%`,
                }}
              >
                {/* glowing aura */}
                <span
                  aria-hidden
                  className="absolute inset-0 transition-all duration-500 ease-out"
                  style={{
                    boxShadow: isOn
                      ? "inset 0 0 60px oklch(0.65 0.22 245 / 0.28), 0 0 40px oklch(0.65 0.22 245 / 0.20)"
                      : "none",
                    border: isOn
                      ? "1px solid oklch(0.65 0.22 245 / 0.55)"
                      : "1px solid transparent",
                    backgroundColor: isOn ? "oklch(0.65 0.22 245 / 0.06)" : "transparent",
                  }}
                />

                {/* marker */}
                <span
                  aria-hidden
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-500"
                  style={{ opacity: isOn ? 0 : 0.9 }}
                >
                  <span className="block h-2 w-2 rounded-full bg-primary" />
                  <span className="absolute h-8 w-8 rounded-full border border-primary/40 pulse" />
                </span>

                {/* premium label */}
                <span
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-500 ease-out"
                  style={{
                    top: "50%",
                    opacity: isOn ? 1 : 0,
                    transform: `translate(-50%, ${isOn ? "-50%" : "-30%"})`,
                  }}
                >
                  <span className="block border border-primary/40 bg-black/70 backdrop-blur-md px-4 py-2.5 text-left">
                    <span className="block font-mono text-[9px] md:text-[10px] uppercase tracking-[0.35em] text-primary/80">
                      {s.kicker}
                    </span>
                    <span className="block font-display font-bold tracking-tight text-sm md:text-lg text-foreground">
                      {s.name}
                    </span>
                    <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.3em] text-foreground/50">
                      {lang === "GR" ? "Κλικ για λεπτομέρειες" : "Click for details"}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}

          {/* hint */}
          <div className="pointer-events-none absolute bottom-5 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/45">
            {lang === "GR"
              ? "Εξερευνήστε τη μονάδα — περάστε πάνω από ένα μηχάνημα"
              : "Explore the floor — hover over a machine"}
          </div>
        </div>
      </div>

      {/* detail card */}
      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={active.name}
        >
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setActive(null)}
          />
          <div className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto border border-primary/25 bg-[#0d1220] animate-scale-in">
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label={lang === "GR" ? "Κλείσιμο" : "Close"}
              className="absolute right-4 top-4 z-10 border border-primary/30 bg-black/60 p-2 text-foreground/70 hover:text-primary hover:border-primary/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="aspect-[16/9] overflow-hidden bg-black">
              <img
                src={active.image}
                alt={active.name}
                loading="lazy"
                width={1920}
                height={1080}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="p-6 md:p-10 space-y-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary mb-3">
                  {active.kicker}
                </div>
                <h3 className="font-display font-bold tracking-tight text-2xl md:text-4xl">
                  {active.name}
                </h3>
              </div>
              <p className="text-foreground/75 leading-relaxed font-light">{active.description}</p>

              <div className="grid md:grid-cols-3 gap-6 pt-2">
                {[
                  {
                    label: lang === "GR" ? "Δυνατότητες" : "Capabilities",
                    items: active.capabilities,
                  },
                  {
                    label: lang === "GR" ? "Προδιαγραφές" : "Specifications",
                    items: active.specs,
                  },
                  {
                    label: lang === "GR" ? "Εφαρμογές" : "Applications",
                    items: active.applications,
                  },
                ].map((col) => (
                  <div key={col.label}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-primary/80 mb-3">
                      {col.label}
                    </div>
                    <ul className="space-y-2 text-sm text-foreground/80 font-light">
                      {col.items.map((it) => (
                        <li key={it} className="flex gap-3">
                          <span className="mt-2 h-px w-3 shrink-0 bg-primary/50" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
