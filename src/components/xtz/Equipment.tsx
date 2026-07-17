import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useI18n } from "./i18n";
import bambu from "@/assets/bambu-3d-printing.png.asset.json";
import laserMachine from "@/assets/akj-fiber-laser.jpg.asset.json";
import laserWorkshop from "@/assets/fiber-laser-workshop.jpg.asset.json";
import pressBrake from "@/assets/durmapress-stratza.webp.asset.json";
import shear from "@/assets/sheet-shear.jpg.asset.json";
import welding from "@/assets/laser-welding.jpg.asset.json";

gsap.registerPlugin(ScrollTrigger);

type Group = { label: string; items: string[] };
type Item = {
  id: string;
  title: string;
  quantity: string;
  image: string;
  alt: string;
  description: string;
  specs?: string[];
  groups?: Group[];
};

function getItems(lang: "EN" | "GR"): Item[] {
  if (lang === "GR") {
    return [
      {
        id: "bambu",
        title: "Bambu Lab H2S",
        quantity: "4 ΜΟΝΆΔΕΣ",
        image: bambu.url,
        alt: "Bambu Lab H2S 3D printer",
        description:
          "Επαγγελματική 3D εκτύπωση υψηλής ταχύτητας για πρωτότυπα, λειτουργικά εξαρτήματα και μικρή παραγωγή.",
        specs: [
          "Μέγιστη εκτύπωση: 340× 320 × 340 mm",
          "Ακρίβεια: ±0.1 mm",
          "Πολλαπλά υλικά & χρώματα (AMS 2 Pro)",
        ],
        groups: [
          {
            label: "Δυνατότητες",
            items: [
              "πολύχρωμη εκτύπωση",
              "Υψηλή ταχύτητα",
              "Πρωτότυπα μηχανικής",
              "Έτοιμα για παραγωγή εξαρτήματα",
            ],
          },
        ],
      },
      {
        id: "akj1530f",
        title: "AKJ1530F Fiber Laser",
        quantity: "1 Σύστημα",
        image: laserMachine.url,
        alt: "AKJ1530F fiber laser cutter",
        description:
          "Κοπή μετάλλων υψηλής ακρίβειας για πρωτότυπα, custom εξαρτήματα και παραγωγή.",
        specs: [
          "Πηγή Fiber Laser 2kW",
          "Επιφάνεια εργασίας: 1500 × 3000 mm",
          "Ακριβής ηλεκτροϋδραυλικός έλεγχος",
        ],
        groups: [
          {
            label: "ΥΛΙΚΑ",
            items: ["Χάλυβας", "Ανοξείδωτος Χάλυβας", "Αλουμίνιο", "Ορείχαλκος", "Χαλκός"],
          },
        ],
      },
      {
        id: "fiber-laser-2",
        title: "Σύστημα Κοπής CO2 Laser",
        quantity: "1 Σύστημα",
        image: laserWorkshop.url,
        alt: "Fiber laser cutting workshop",
        description:
          "Επιπλέον δυναμικότητα κοπής co2 laser - Χάραξη με λέιζερ για αποδοτική παραγωγή και γρήγορους χρόνους παράδοσης.",
      },
      {
        id: "press-brakes",
        title: "DURMAPRESS Πρέσες Στραντζαρίσματος",
        quantity: "2 Μονάδες",
        image: pressBrake.url,
        alt: "DURMAPRESS press brake bending sheet metal",
        description:
          "Κάμψη λαμαρίνας υψηλής ακρίβειας με για πρωτότυπα, custom εξαρτήματα και εξαρτήματα παραγωγής. 6+1 άξονες Ηλεκτροϋδραυλική με χειριστήριο Delem (ηλεκτροϋδραυλικό)",
        groups: [
          {
            label: "Δυνατότητες",
            items: [
              "Ελεγχόμενη Κάμψη",
              "Υψηλή Επαναληψιμότητα",
              "Ακριβής Διαμόρφωση",
              "Custom Μεταλλικά Εξαρτήματα",
              "Σειρές Παραγωγής",
            ],
          },
        ],
      },
      {
        id: "shear",
        title: "Ψαλίδι Λαμαρίνας",
        quantity: "1 Μηχάνημα",
        image: shear.url,
        alt: "Hydraulic sheet metal shear",
        description:
          "Ακριβής και αποδοτική κοπή λαμαρίνας για έργα μεταλλικών κατασκευών.",
      },
      {
        id: "welding",
        title: "Σταθμοί Συγκόλλησης",
        quantity: "2 Σταθμοί",
        image: welding.url,
        alt: "Welding workshop",
        description:
          "Επαγγελματικές υπηρεσίες συγκόλλησης και συναρμολόγησης για custom έργα κατασκευής.",
        groups: [
          {
            label: "Δυνατότητες",
            items: ["MIG Welding", "TIG Welding", "ΣΥΓΚΟΛΛΗΣΗ LASER", "ΠΟΝΤΑ"],
          },
        ],
      },
    ];
  }

  return [
    {
      id: "bambu",
      title: "Bambu Lab H2S",
      quantity: "2 Units",
      image: bambu.url,
      alt: "Bambu Lab H2S 3D printer",
      description:
        "High-speed professional 3D printing for prototypes, functional parts and low-volume production.",
      specs: [
        "Build Volume: 350 × 320 × 325 mm",
        "Accuracy: ±0.1 mm",
        "Multi-material & multi-color (AMS 2 Pro)",
      ],
      groups: [
        {
          label: "Highlights",
          items: [
            "Multi-color printing",
            "High-speed printing",
            "Engineering prototypes",
            "Production-ready parts",
          ],
        },
      ],
    },
    {
      id: "akj1530f",
      title: "AKJ1530F Fiber Laser",
      quantity: "1 System",
      image: laserMachine.url,
      alt: "AKJ1530F fiber laser cutter",
      description:
        "High-precision metal cutting for prototypes, custom parts and production runs.",
      specs: [
        "2kW Fiber Laser Source",
        "Working Area: 1500 × 3000 mm",
        "Precision Electro-hydraulic Control",
      ],
      groups: [
        {
          label: "Materials",
          items: ["Carbon Steel", "Stainless Steel", "Aluminum", "Brass", "Copper"],
        },
      ],
    },
    {
      id: "fiber-laser-2",
      title: "CO2 Laser Cutting System",
      quantity: "1 System",
      image: laserWorkshop.url,
      alt: "Fiber laser cutting workshop",
      description:
        "Additional co2 laser - engraving capacity for efficient production and fast turnaround times.",
    },
    {
      id: "press-brakes",
      title: "DURMAPRESS Press Brakes",
      quantity: "2 Units",
      image: pressBrake.url,
      alt: "DURMAPRESS press brake bending sheet metal",
      description:
        "High-precision precision sheet metal bending for prototypes, custom parts and production components.",
      groups: [
        {
          label: "Capabilities",
          items: [
            "Controlled Bending",
            "High Repeatability",
            "Precision Forming",
            "Custom Metal Components",
            "Production Runs",
          ],
        },
      ],
    },
    {
      id: "shear",
      title: "Sheet Metal Shear",
      quantity: "1 Machine",
      image: shear.url,
      alt: "Hydraulic sheet metal shear",
      description:
        "Accurate and efficient cutting of sheet metal for fabrication projects.",
    },
    {
      id: "welding",
      title: "Welding Stations",
      quantity: "2 Workstations",
      image: welding.url,
      alt: "Welding workshop",
      description:
        "Professional welding and assembly services for custom manufacturing projects.",
      groups: [
        {
          label: "Capabilities",
          items: ["MIG Welding", "TIG Welding", "LASER WELDING", "RSW WELDING"],
        },
      ],
    },
  ];
}

export function Equipment() {
  const { lang } = useI18n();
  const items = getItems(lang);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".eq-card").forEach((el) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  const labelSpecs = lang === "GR" ? "Προδιαγραφές" : "Specifications";

  return (
    <section
      ref={root}
      className="relative w-full overflow-hidden py-20 md:py-28"
      style={{ backgroundColor: "#0d1220" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, oklch(0.4 0.2 245 / 0.18), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-[1400px] px-6 md:px-12 space-y-20 md:space-y-28">
        {items.map((it, i) => {
          const reverse = i % 2 === 1;
          return (
            <article
              key={it.id}
              className="eq-card grid md:grid-cols-12 gap-8 md:gap-14 items-center"
            >
              <div
                className={`md:col-span-7 group relative overflow-hidden border border-primary/15 ${
                  reverse ? "md:order-2" : ""
                }`}
              >
                <div className="aspect-[16/10] overflow-hidden bg-black">
                  <img
                    src={it.image}
                    alt={it.alt}
                    loading="lazy"
                    width={1920}
                    height={1200}
                    className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 55%, rgba(13,18,32,0.55) 100%)",
                  }}
                />
                <div className="absolute top-4 left-4 font-mono text-[11px] uppercase tracking-[0.3em] text-primary bg-black/60 border border-primary/40 px-3 py-1.5 backdrop-blur-sm">
                  {it.quantity}
                </div>
                <div className="absolute bottom-4 right-4 font-mono text-[11px] tracking-[0.3em] text-primary/70">
                  0{i + 1}
                </div>
              </div>

              <div className={`md:col-span-5 space-y-5 ${reverse ? "md:order-1" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-primary tracking-[0.3em]">
                    0{i + 1} /
                  </span>
                  <span className="h-px w-14 bg-primary blue-glow" />
                </div>
                <h2 className="font-display font-bold leading-[0.95] tracking-tight text-3xl md:text-4xl">
                  {it.title}
                </h2>
                <p className="text-foreground/75 leading-relaxed font-light">
                  {it.description}
                </p>

                {it.specs && (
                  <div className="pt-2">
                    <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-primary/80 mb-3">
                      {labelSpecs}
                    </div>
                    <ul className="space-y-1.5 text-sm text-foreground/80 font-light">
                      {it.specs.map((s) => (
                        <li key={s} className="flex gap-3">
                          <span className="text-primary/70 mt-1.5 h-px w-3 bg-primary/50" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {it.groups?.map((g) => (
                  <div key={g.label} className="pt-2">
                    <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-primary/80 mb-3">
                      {g.label}
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {g.items.map((m) => (
                        <li
                          key={m}
                          className="font-mono text-[11px] uppercase tracking-[0.2em] border border-primary/25 px-3 py-1.5 text-foreground/80 hover:border-primary/60 hover:text-primary transition-colors"
                        >
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
