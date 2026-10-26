import metlenLogo from "@/assets/metlen-logo.svg.asset.json";
import metlenImage from "@/assets/metlen-headquarters.jpg.asset.json";
import hotemediaLogo from "@/assets/hotemedia-logo.svg.asset.json";
import saridisLogo from "@/assets/saridis-logo.png.asset.json";
import saridisImage from "@/assets/saridis-professional-kitchen.jpg.asset.json";
import hotemediaImage from "@/assets/hotemedia-led-display.jpg.asset.json";
import cosmos1563 from "@/assets/hotemedia-cosmos-1563.jpg.asset.json";
import cosmos1562 from "@/assets/hotemedia-cosmos-1562.jpg.asset.json";
import cosmos1561 from "@/assets/hotemedia-cosmos-1561.jpg.asset.json";
import cosmos1560 from "@/assets/hotemedia-cosmos-1560.jpg.asset.json";
import cosmos1559 from "@/assets/hotemedia-cosmos-1559.jpg.asset.json";

export type Bi = { EN: string; GR: string };

/** A photograph of completed work. Use only TOREO's own, unedited photos. */
export interface ProjectPhoto {
  src: string;
  alt: Bi;
}

/**
 * A completed project with a partner. Group every photo of the same project
 * here — add a new project by appending another entry to `projects`.
 */
export interface ClientProject {
  id: string;
  title: Bi;
  description: Bi;
  work: Bi; // what TOREO made — confirmed by the owner only
  photos: ProjectPhoto[]; // first photo is the cover
}

/**
 * Selected collaborations. Add a new company by appending an entry here —
 * the section and modal render entirely from this data.
 * Only use confirmed information; never invent project scope.
 */
export interface Client {
  id: string;
  name: string;
  logo: string | null; // null → typographic wordmark (no fabricated logo)
  location?: Bi;
  image: string | null; // null → clean logo placeholder
  imageCredit: string; // official source of the photograph
  website: string;
  category: Bi;
  label: Bi;
  description: Bi;
  delivered: Bi;
  services: Bi[];
  status: Bi | null;
  projects?: ClientProject[];
}

export const CLIENTS: Client[] = [
  {
    id: "metlen",
    name: "METLEN Energy & Metals",
    logo: metlenLogo.url,
    image: metlenImage.url,
    imageCredit: "Photo: metlen.com",
    website: "https://www.metlen.com/",
    category: { EN: "Energy & Metals", GR: "Ενέργεια & Μέταλλα" },
    label: { EN: "Industrial Collaboration", GR: "Βιομηχανική συνεργασία" },
    description: {
      EN: "TOREO collaborated with METLEN on the manufacture of galvanized angle brackets used for mounting solar panels.",
      GR: "Η TOREO συνεργάστηκε με τη METLEN στην κατασκευή γαλβανιζέ γωνιών για την τοποθέτηση φωτοβολταϊκών πάνελ.",
    },
    delivered: {
      EN: "Galvanized angle brackets for solar panel installation.",
      GR: "Γαλβανιζέ γωνίες για την τοποθέτηση φωτοβολταϊκών πάνελ.",
    },
    services: [
      { EN: "Custom manufacturing", GR: "Εξατομικευμένη κατασκευή" },
      { EN: "Production of custom components", GR: "Παραγωγή εξατομικευμένων εξαρτημάτων" },
      { EN: "Solar panel mounting parts", GR: "Εξαρτήματα στήριξης φωτοβολταϊκών" },
    ],
    status: null,
  },
  {
    id: "hotemedia",
    name: "HOTEMEDIA",
    logo: hotemediaLogo.url,
    image: hotemediaImage.url,
    imageCredit: "Photo: hotemedia.gr",
    website: "https://hotemedia.gr/",
    category: { EN: "Technology & Commercial", GR: "Τεχνολογία & Εμπορικές λύσεις" },
    label: { EN: "Technology & Commercial Solutions", GR: "Τεχνολογία & Εμπορικές λύσεις" },
    description: {
      EN: "TOREO collaborated with HOTEMEDIA on the manufacture of TV stands for the Cosmos shopping center.",
      GR: "Η TOREO συνεργάστηκε με τη HOTEMEDIA στην κατασκευή βάσεων τηλεοράσεων για το εμπορικό κέντρο Cosmos.",
    },
    delivered: {
      EN: "TV stands for the Cosmos shopping center.",
      GR: "Βάσεις τηλεοράσεων για το εμπορικό κέντρο Cosmos.",
    },
    services: [
      { EN: "Custom manufacturing", GR: "Εξατομικευμένη κατασκευή" },
      { EN: "TV stands", GR: "Βάσεις τηλεοράσεων" },
    ],
    status: null,
    projects: [
      {
        id: "cosmos-tv-stands",
        title: { EN: "TV stands — Cosmos shopping center", GR: "Βάσεις τηλεοράσεων — Εμπορικό κέντρο Cosmos" },
        description: {
          EN: "TOREO manufactured the metal skeleton and frame for the TV stands of the Cosmos shopping center, in collaboration with HOTEMEDIA.",
          GR: "Η TOREO κατασκεύασε τον μεταλλικό σκελετό και το πλαίσιο για τις βάσεις τηλεοράσεων του εμπορικού κέντρου Cosmos, σε συνεργασία με τη HOTEMEDIA.",
        },
        work: { EN: "Metal skeleton – frame.", GR: "Μεταλλικός σκελετός – πλαίσιο." },
        photos: [
          { src: cosmos1563.url, alt: { EN: "Ceiling-suspended four-screen TV stand at Cosmos", GR: "Κρεμαστή βάση τεσσάρων οθονών στο Cosmos" } },
          { src: cosmos1562.url, alt: { EN: "Ceiling-suspended TV stand, view along the walkway", GR: "Κρεμαστή βάση οθονών, θέα από τον διάδρομο" } },
          { src: cosmos1561.url, alt: { EN: "Framed TV screen mounted on a column", GR: "Οθόνη σε πλαίσιο πάνω σε κολόνα" } },
          { src: cosmos1560.url, alt: { EN: "Two framed screens on a column in the food court", GR: "Δύο οθόνες σε πλαίσιο σε κολόνα του χώρου εστίασης" } },
          { src: cosmos1559.url, alt: { EN: "Framed screens on a column, side view", GR: "Οθόνες σε πλαίσιο σε κολόνα, πλάγια όψη" } },
        ],
      },
    ],
  },
  {
    id: "saridis",
    name: "SARIDIS",
    logo: saridisLogo.url,
    image: saridisImage.url,
    imageCredit: "Photo: saridis.gr",
    website: "https://saridis.gr/",
    location: { EN: "Kavallari, Thessaloniki, Greece", GR: "Καβαλλάρι, Θεσσαλονίκη, Ελλάδα" },
    category: { EN: "Professional Equipment", GR: "Επαγγελματικός εξοπλισμός" },
    label: { EN: "Design & 3D Printing Collaboration", GR: "Συνεργασία σχεδιασμού & 3D εκτύπωσης" },
    description: {
      EN: "TOREO collaborated with SARIDIS on the design and 3D printing of custom components for refrigeration units.",
      GR: "Συνεργασία με τη SARIDIS για τον σχεδιασμό και την κατασκευή εξειδικευμένων εξαρτημάτων μέσω τρισδιάστατης εκτύπωσης για ψυκτικές μονάδες.",
    },
    delivered: {
      EN: "Custom 3D-printed components for refrigeration units.",
      GR: "Εξειδικευμένα εξαρτήματα τρισδιάστατης εκτύπωσης για ψυκτικές μονάδες.",
    },
    services: [
      { EN: "Component design", GR: "Σχεδιασμός εξαρτημάτων" },
      { EN: "3D printing", GR: "Τρισδιάστατη εκτύπωση" },
    ],
    status: null,
  },
];
