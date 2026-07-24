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
        quantity: "3 ΜΟΝΆΔΕΣ",
        image: bambu.url,
        alt: "Bambu Lab H2S 3D printer",
        description:
          "Ο εξοπλισμός 3D εκτύπωσης χρησιμοποιείται για λειτουργικά πρωτότυπα, ανταλλακτικά, βάσεις, καλύμματα, βοηθητικά εξαρτήματα παραγωγής και εξαρτήματα τελικής χρήσης σε μικρές σειρές. Το υλικό και οι ρυθμίσεις εκτύπωσης επιλέγονται ανάλογα με τη χρήση και τις απαιτήσεις κάθε εξαρτήματος.",
        specs: [
          "Μέγιστη εκτύπωση: 340 × 320 × 340 mm",
          "2× ακροφύσιο 0.4 mm · 1× ακροφύσιο 0.2 mm",
          "Πολλαπλά υλικά & χρώματα (AMS 2 Pro)",
        ],
        groups: [
          {
            label: "Τυπικές εφαρμογές",
            items: [
              "Λειτουργικά πρωτότυπα",
              "Ανταλλακτικά",
              "Βάσεις & καλύμματα",
              "Βοηθητικά παραγωγής",
              "Μικρές σειρές τελικής χρήσης",
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
          "Το fiber laser χρησιμοποιείται για την κοπή λαμαρίνας με καθαρές ακμές και σταθερή επαναληψιμότητα. Είναι κατάλληλο για εξαρτήματα, βάσεις, καλύμματα, πάνελ, κουτιά και custom μεταλλικά μέρη που κατασκευάζονται σύμφωνα με τα σχέδια του πελάτη.",
        specs: [
          "Πηγή Fiber Laser 2 kW",
          "Επιφάνεια εργασίας: 1500 × 3000 mm",
          "Σταθερή και ακριβής κοπή λαμαρίνας, κατάλληλη για μεμονωμένα εξαρτήματα καθώς και για μικρές ή μεγαλύτερες σειρές παραγωγής",
          "Αποδεκτά αρχεία: DXF, DWG",
        ],
        groups: [
          {
            label: "Υλικά",
            items: ["Χάλυβας", "Ανοξείδωτος Χάλυβας", "Αλουμίνιο", "Ορείχαλκος", "Χαλκός"],
          },
        ],
      },
      {
        id: "fiber-laser-2",
        title: "Σύστημα Κοπής CO₂ Laser",
        quantity: "1 Σύστημα",
        image: laserWorkshop.url,
        alt: "CO2 laser cutting workshop",
        description:
          "Το CO₂ laser χρησιμοποιείται για κοπή και χάραξη μη μεταλλικών υλικών. Είναι κατάλληλο για ταμπέλες, καλύμματα, πατρόν, διακοσμητικά εξαρτήματα και custom μέρη από υλικά όπως ακρυλικό και ξύλο.",
      },
      {
        id: "press-brakes",
        title: "DURMAPRESS Πρέσες Στραντζαρίσματος",
        quantity: "2 Μονάδες",
        image: pressBrake.url,
        alt: "DURMAPRESS press brake bending sheet metal",
        description:
          "Η πρέσα στραντζαρίσματος χρησιμοποιείται για την κάμψη και διαμόρφωση μεταλλικών εξαρτημάτων σε συγκεκριμένες γωνίες και διαστάσεις. Είναι κατάλληλη για βάσεις, κουτιά, καλύμματα, στηρίγματα και custom εξαρτήματα από λαμαρίνα.",
        specs: [
          "Κάμψη λαμαρίνας και διαμόρφωση με ελεγχόμενες γωνίες και σταθερή επαναληψιμότητα",
          "Ηλεκτροϋδραυλικό χειριστήριο Delem, 6+1 άξονες",
        ],
        groups: [
          {
            label: "Τυπικές εφαρμογές",
            items: [
              "Βάσεις & στηρίγματα",
              "Κουτιά & καλύμματα",
              "Πάνελ & πλαίσια",
              "Custom εξαρτήματα λαμαρίνας",
              "Σειρές παραγωγής",
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
          "Ευθεία κοπή λαμαρίνας σε λωρίδες και πλάκες, για την προετοιμασία υλικού πριν από τις επόμενες εργασίες κατεργασίας.",
      },
      {
        id: "welding",
        title: "Σταθμοί Συγκόλλησης",
        quantity: "2 Σταθμοί",
        image: welding.url,
        alt: "Welding workshop",
        description:
          "Ο εξοπλισμός συγκόλλησης χρησιμοποιείται για τη συναρμολόγηση μεταλλικών εξαρτημάτων και την ολοκλήρωση custom μεταλλικών κατασκευών. Η μέθοδος συγκόλλησης επιλέγεται ανάλογα με το υλικό, το πάχος, τη γεωμετρία και τις απαιτήσεις κάθε έργου.",
        groups: [
          {
            label: "Διαθέσιμες μέθοδοι",
            items: ["MIG", "TIG", "Συγκόλληση Laser", "Πονταρίσματα (RSW)"],
          },
        ],
      },
    ];
  }

  return [
    {
      id: "bambu",
      title: "Bambu Lab H2S",
      quantity: "3 UNITS",
      image: bambu.url,
      alt: "Bambu Lab H2S 3D printer",
      description:
        "Our 3D printing equipment is used for functional prototypes, replacement parts, brackets, covers, production aids, and small-series end-use components. The material and print settings are selected according to the intended use and requirements of each part.",
      specs: [
        "Build Volume: 340 × 320 × 340 mm",
        "2× 0.4 mm nozzle · 1× 0.2 mm nozzle",
        "Multi-material & multi-color (AMS 2 Pro)",
      ],
      groups: [
        {
          label: "Typical applications",
          items: [
            "Functional prototypes",
            "Replacement parts",
            "Brackets & covers",
            "Production aids",
            "Small-series end-use parts",
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
        "Our fiber laser is used to cut sheet metal with clean edges and consistent repeatability. It is suitable for components, brackets, covers, panels, enclosures, and custom metal parts manufactured according to the customer's drawings.",
      specs: [
        "2 kW Fiber Laser Source",
        "Working Area: 1500 × 3000 mm",
        "Consistent and accurate sheet metal cutting, suitable for individual parts as well as small or larger production runs",
        "Accepted files: DXF, DWG",
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
      title: "CO₂ Laser Cutting System",
      quantity: "1 System",
      image: laserWorkshop.url,
      alt: "CO2 laser cutting workshop",
      description:
        "The CO₂ laser is used for cutting and engraving non-metal materials. It is suitable for signs, covers, templates, decorative components, and custom parts made from materials such as acrylic and wood.",
    },
    {
      id: "press-brakes",
      title: "DURMAPRESS Press Brakes",
      quantity: "2 Units",
      image: pressBrake.url,
      alt: "DURMAPRESS press brake bending sheet metal",
      description:
        "The press brake is used to bend and form sheet metal parts according to specific angles and dimensions. It is suitable for brackets, boxes, enclosures, covers, supports, and custom sheet metal components.",
      specs: [
        "Sheet metal bending and forming with controlled angles and consistent repeatability",
        "Electro-hydraulic Delem control, 6+1 axes",
      ],
      groups: [
        {
          label: "Typical applications",
          items: [
            "Brackets & supports",
            "Boxes & enclosures",
            "Panels & frames",
            "Custom sheet metal parts",
            "Production runs",
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
        "Straight cutting of sheet metal into strips and blanks, used to prepare material before subsequent forming and fabrication steps.",
    },
    {
      id: "welding",
      title: "Welding Stations",
      quantity: "2 Workstations",
      image: welding.url,
      alt: "Welding workshop",
      description:
        "Our welding equipment is used to assemble metal components and complete custom metal constructions. The welding method is selected according to the material, thickness, geometry, and requirements of each project.",
      groups: [
        {
          label: "Available methods",
          items: ["MIG", "TIG", "Laser Welding", "Spot Welding (RSW)"],
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
