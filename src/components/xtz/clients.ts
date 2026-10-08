import metlenLogo from "@/assets/metlen-logo.svg.asset.json";
import metlenImage from "@/assets/metlen-headquarters.jpg.asset.json";
import hotemediaLogo from "@/assets/hotemedia-logo.svg.asset.json";
import hotemediaImage from "@/assets/hotemedia-led-display.jpg.asset.json";

type Bi = { EN: string; GR: string };

/**
 * Selected collaborations. Add a new company by appending an entry here —
 * the section and modal render entirely from this data.
 * Only use confirmed information; never invent project scope.
 */
export interface Client {
  id: string;
  name: string;
  logo: string;
  image: string | null; // null → clean logo placeholder
  imageCredit: string; // official source of the photograph
  website: string;
  category: Bi;
  label: Bi;
  description: Bi;
  delivered: Bi;
  services: Bi[];
  status: Bi | null;
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
  },
];
