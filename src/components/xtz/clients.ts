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
      EN: "TOREO collaborated with METLEN on a custom industrial manufacturing project, delivering components developed according to specific technical and functional requirements.",
      GR: "Η TOREO συνεργάστηκε με τη METLEN σε έργο εξατομικευμένης βιομηχανικής κατασκευής, παραδίδοντας εξαρτήματα που αναπτύχθηκαν σύμφωνα με συγκεκριμένες τεχνικές και λειτουργικές απαιτήσεις.",
    },
    delivered: {
      EN: "Custom components developed to the project's technical and functional requirements.",
      GR: "Εξατομικευμένα εξαρτήματα σύμφωνα με τις τεχνικές και λειτουργικές απαιτήσεις του έργου.",
    },
    services: [
      { EN: "Custom manufacturing", GR: "Εξατομικευμένη κατασκευή" },
      { EN: "Technical development", GR: "Τεχνική ανάπτυξη" },
      { EN: "Engineering support", GR: "Υποστήριξη μηχανικού" },
      { EN: "Production of custom components", GR: "Παραγωγή εξατομικευμένων εξαρτημάτων" },
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
      EN: "TOREO collaborated with HOTEMEDIA on custom solutions developed to meet specific project requirements.",
      GR: "Η TOREO συνεργάστηκε με τη HOTEMEDIA σε εξατομικευμένες λύσεις που αναπτύχθηκαν για τις συγκεκριμένες απαιτήσεις του έργου.",
    },
    delivered: {
      EN: "Custom solutions developed to the project's specific requirements.",
      GR: "Εξατομικευμένες λύσεις σύμφωνα με τις απαιτήσεις του έργου.",
    },
    services: [
      { EN: "Custom manufacturing", GR: "Εξατομικευμένη κατασκευή" },
      { EN: "Engineering support", GR: "Υποστήριξη μηχανικού" },
    ],
    status: null,
  },
];
