# Ενδεικτική τιμή ΜΟΝΟ ΥΛΙΚΟΥ για μεταλλικές κατασκευές

## Τι θα δει ο πελάτης
Στη φόρμα αιτήματος (`/request`), για τις υπηρεσίες Laser Cutting, Bending, Welding, Replacement Parts, προστίθεται στο βήμα **Review** μια κάρτα «Ενδεικτική τιμή υλικού»:
- Υλικό, πάχος, εκτιμώμενο βάρος (kg), ενδεικτική τιμή υλικού (ή εύρος).
- Μόνιμη σημείωση: «Η τιμή αφορά ΜΟΝΟ το υλικό. Δεν περιλαμβάνει εργατικά, κοπή, κάμψη, συγκόλληση, φινίρισμα, μεταφορά ή άλλες κατεργασίες. Η τελική τιμή καθορίζεται στην επίσημη προσφορά μετά από έλεγχο.»
- Αν δεν υπάρχει σχέδιο: σήμανση «Βασισμένο σε ενδεικτική γεωμετρική παραδοχή — όχι τελικό σχέδιο» και σύντομη περιγραφή της παραδοχής (π.χ. «Επίπεδη λαμαρίνα 1000×500 mm»).
- Αν η αβεβαιότητα είναι μεγάλη: εμφανίζεται εύρος (min–max) ή μήνυμα «Χρειαζόμαστε: διαστάσεις / πάχος / ποσότητα» με τα ελάχιστα πεδία προς συμπλήρωση. Ποτέ δεν φαίνεται κόστος/kg, margin ή λέξη «AI».
- 3D Printing flow και Product Design: δεν αλλάζουν.

## Τι θα δει ο admin
Στην καρτέλα παραγγελίας/αιτήματος, νέο μπλοκ «Material Estimate (internal)»: κόστος/kg, kg, κόστος υλικού, markup %, τελική τιμή, βεβαιότητα, όλες οι παραδοχές της AI, πηγή γεωμετρίας (σχέδιο/πελάτης/AI προσχέδιο). Στο Admin Config → Pricing: πεδίο «Material markup %» (προεπιλογή 30) και όριο βεβαιότητας.

## Ροή δεδομένων
```text
Πελάτης (Details step: υλικό ή "Άλλο/Δεν ξέρω", πάχος, διαστάσεις, ποσότητα, αρχεία)
   -> server fn estimateMaterial
        1. AI (μόνο τεχνικά): προτεινόμενο υλικό-κωδικός, πάχος, γεωμετρία,
           όγκος ή εμβαδό, ποσότητα, confidence, παραδοχές, missing_fields
        2. Ντετερμινιστικός υπολογισμός (κώδικας, όχι AI):
           kg = volume_cm3 × density / 1000 (ή εμβαδό × πάχος × density)
           κόστος = kg × price_per_kg ;  τιμή = κόστος × (1 + markup)
           confidence χαμηλό -> εύρος ±% αντί για μία τιμή
        3. Επιστρέφει στον πελάτη ΜΟΝΟ: υλικό, πάχος, kg, τιμή/εύρος, παραδοχή κειμένου
   -> Review step δείχνει την κάρτα
   -> submitForm (υπάρχον) αποθηκεύει το πλήρες estimate στο metadata (server-side επανυπολογισμός)
   -> Admin βλέπει πλήρη ανάλυση· η επίσημη προσφορά (TR-NNNN) μένει χειροκίνητη
```
Η AI δεν δίνει ποτέ τιμή· ό,τι αριθμό τιμής επιστρέψει αγνοείται (ίδια αρχή με `pricing.ts`).

## Υλικά
Χρήση του υπάρχοντος πίνακα `materials` (έχει ήδη `density_g_cm3`, `price_per_kg`, `process`, `properties`). Προσθήκη εγγραφών με `process = 'sheet_metal'`: π.χ. DC01 χάλυβας (7.85), Γαλβανιζέ (7.85), Inox AISI 304 / 316 (7.93/8.0), Αλουμίνιο 1050/5754 (2.70/2.66). Διαθέσιμα πάχη στο `properties.thicknesses_mm`. **Τις πραγματικές τιμές κόστους/kg θα τις ορίσετε εσείς** από το Admin → Materials (θα μπουν προσωρινά κενές· χωρίς τιμή δεν εμφανίζεται ποσό, μόνο βάρος).
«Άλλο υλικό»: ελεύθερο κείμενο· αν η AI το αντιστοιχίσει σε υλικό του καταλόγου χρησιμοποιείται, αλλιώς εμφανίζεται μόνο βάρος (αν υπάρχει πυκνότητα) ή «η τιμή θα δοθεί στην προσφορά».

## Validation
- Zod σε input (διαστάσεις 1–6000 mm, πάχος 0.3–30 mm, ποσότητα 1–10000) και σε AI output (strict JSON schema).
- Κωδικός υλικού πρέπει να υπάρχει & να είναι active· πάχος πρέπει να ανήκει στα διαθέσιμα (αλλιώς πλησιέστερο, σημειώνεται ως παραδοχή).
- Sanity checks: kg > 0, kg < όριο (π.χ. 5000), αλλιώς «χρειάζεται έλεγχος».
- Αποτυχία AI / χωρίς credits: η φόρμα υποβάλλεται κανονικά χωρίς estimate (δεν μπλοκάρει ποτέ αίτημα).
- Rate limit ανά IP/session και cache με fingerprint (ίδια είσοδος -> ίδιο αποτέλεσμα).

## Αποθήκευση
Νέος πίνακας `material_estimates` (admin-only RLS): `id, fingerprint (unique), submission_id/order_id, inputs jsonb, ai_output jsonb, assumptions jsonb, geometry_source ('drawing'|'customer'|'ai_draft'), material_code, thickness_mm, kg_min, kg_max, cost_per_kg, material_cost, markup_pct, price_min, price_max, confidence, model, created_at`. Στο `metadata` του αιτήματος μπαίνει μόνο το `material_estimate_id` + τα customer-safe πεδία. Ο πελάτης στο `/track` βλέπει μόνο τα ίδια customer-safe πεδία.

## Δεν αλλάζει
Quote documents/PDF, TR-NNNN αρίθμηση, email ingestion, dedupe, order statuses, emails, 3D printing pricing.

## Technical details
- `src/lib/material-estimate.ts` — καθαρή συνάρτηση `computeMaterialEstimate(geometry, material, settings)` + unit tests (vitest).
- `src/lib/ai/material-geometry.server.ts` — κλήση AI (`openai/gpt-6-astra`, Responses API, strict json_schema, streaming consumed server-side). Αρχεία: PDF/εικόνες περνούν στο μοντέλο· DXF: απλό server-side parse bounding box/εμβαδού περιγράμματος· STEP/STL: όγκος από υπάρχον `geometry-hash.server.ts` όπου είναι εφικτό.
- `src/lib/api/material-estimate.functions.ts` — `estimateMaterial` (public, rate-limited, επιστρέφει customer-safe DTO) και `adminGetMaterialEstimate` (admin cookie).
- `src/routes/request.tsx` — πεδία υλικό/πάχος/«Άλλο» στο Details, κάρτα στο Review, `material_estimate_id` στο metadata.
- `src/lib/api/submissions.functions.ts` — σύνδεση estimate με submission κατά την υποβολή.
- `src/routes/admin.tsx` (order detail) + `admin_.config.tsx` (markup %, threshold) + Materials σελίδα (πάχη, process sheet_metal).
- Migration: `material_estimates` + GRANT/RLS, seed sheet-metal υλικών, settings keys `material_markup_pct=30`, `material_estimate_min_confidence`.
- i18n EL/EN για όλα τα νέα κείμενα στο `i18n.tsx`.

## Ανοιχτά σημεία προς επιβεβαίωση
1. Τιμές κόστους/kg ανά υλικό — θα τις δώσετε ή θα τις περάσετε από το Admin;
2. Markup 30% ενιαίο για όλα τα υλικά ή ανά υλικό; (προτείνεται ενιαίο με override ανά υλικό)
3. Τιμή με ή χωρίς ΦΠΑ στον πελάτη; (προτείνεται «χωρίς ΦΠΑ» με σημείωση)
