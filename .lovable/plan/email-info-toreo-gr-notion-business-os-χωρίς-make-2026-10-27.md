# Email info@toreo.gr → Notion Business OS (χωρίς Make)

## Τι έλεγξα ήδη (χωρίς κωδικό, χωρίς αλλαγές)

- **Papaki mail server**: το `mail-gr.securemail.pro:993` απαντά με κανονική ασφαλή σύνδεση (έγκυρο πιστοποιητικό, Dovecot). Υποστηρίζει απλή είσοδο με κωδικό. Δεν έκανα σύνδεση, γιατί δεν υπάρχει κωδικός.
- **Backend της TOREO**: το περιβάλλον όπου τρέχει το live site επιτρέπει ασφαλείς εξερχόμενες συνδέσεις σε θύρες όπως η 993. **Όμως δεν μπορώ να το αποδείξω μέσα από το preview**, γιατί το preview τρέχει σε διαφορετικό περιβάλλον. Η πραγματική απόδειξη χρειάζεται ένα πρώτο βήμα που μόνο διαβάζει: σύνδεση, λίστα φακέλων, πλήθος μηνυμάτων, χωρίς εγγραφές. Αν αποτύχει, σταματάμε εκεί και πάμε στην εναλλακτική (δες παρακάτω).
- **Notion**: δεν υπάρχει ακόμα σύνδεση Notion στο project.
- **Φόρμα του site**: σήμερα αποθηκεύει το αίτημα, δημιουργεί παραγγελία και το καταγράφει στο αρχείο ελέγχου διπλοτύπων. Δεν θα την αλλάξω. Μόνο μια προαιρετική, απενεργοποιημένη προσθήκη στο τέλος.
- Η υπάρχουσα διεύθυνση εισαγωγής email (αυτή που χρησιμοποιεί σήμερα το Make) μένει ως έχει.

## Βήματα

**Βήμα 1 — Συνδέσεις (θα χρειαστώ εσένα)**
- Notion: κάρτα σύνδεσης. Επιλέγεις **μόνο** τις βάσεις `TOREO | Orders & Quotes` και `TOREO | Communication Log`. Το κλειδί μένει μόνο στο backend.
- Papaki: ασφαλής φόρμα για το `PAPAKI_EMAIL_PASSWORD`. Ο κωδικός δεν περνά ποτέ από το chat ή τον κώδικα.

**Βήμα 2 — Έλεγχος Notion (μόνο ανάγνωση)**
- Διαβάζω τα πραγματικά πεδία και τις τιμές κατάστασης των δύο βάσεων, π.χ. αν υπάρχουν τα `Awaiting TOREO Reply` και `Replied`, ποιο πεδίο είναι υποχρεωτικό και πώς συνδέεται το Log με την Παραγγελία.
- Σου δείχνω την αντιστοίχιση πεδίων πριν γίνει οποιαδήποτε εγγραφή. Αν λείπει πεδίο, π.χ. για το Message-ID, σε ρωτάω. Δεν φτιάχνω αντίγραφα βάσεων.

**Βήμα 3 — Δοκιμή σύνδεσης email (μόνο ανάγνωση)**
- Το mailbox ανοίγει **μόνο για ανάγνωση**. Τα email δεν σημειώνονται ως αναγνωσμένα, δεν μετακινούνται και δεν διαγράφονται.
- Βρίσκω τον φάκελο Απεσταλμένα αυτόματα.

**Βήμα 4 — Εισερχόμενα (dry-run)**
- Νέα email εντοπίζονται με αποθηκευμένο σημείο ελέγχου για κάθε φάκελο. Τα διπλότυπα αποκλείονται με το Message-ID.
- Παραλείπονται αυτόματες απαντήσεις, newsletters και δικά μας μηνύματα.
- Αντιστοίχιση με υπάρχουσα εγγραφή στο `Orders & Quotes`, πρώτα με το νήμα (References/In-Reply-To) και μετά με αποστολέα και θέμα. Αλλιώς, νέα εγγραφή με `Awaiting TOREO Reply`.
- Κάθε μήνυμα καταγράφεται στο `Communication Log`.
- Αποθηκεύονται μόνο τα απαραίτητα: αποστολέας, θέμα, ημερομηνία, αναγνωριστικά, σύντομο απόσπασμα και ονόματα συνημμένων. Όχι ολόκληρα κείμενα ή αρχεία.

**Βήμα 5 — Απεσταλμένα (dry-run)**
- Κάθε απάντηση της TOREO αντιστοιχίζεται στο αρχικό email μέσω In-Reply-To/References → η εγγραφή γίνεται `Replied`.
- Αν η αντιστοίχιση δεν είναι σίγουρη, δεν αλλάζει τίποτα. Δημιουργείται εκκρεμότητα «Χειροκίνητος έλεγχος».

**Βήμα 6 — Σελίδα ελέγχου στο admin**
- Νέα σελίδα «Email → Notion»: κουμπί «Εκτέλεση dry-run» και αναλυτική αναφορά για το τι *θα* γινόταν (νέες εγγραφές, ενημερώσεις, `Replied`, χειροκίνητοι έλεγχοι, σφάλματα).
- Ξεχωριστός διακόπτης «Ζωντανές εγγραφές», κλειστός από προεπιλογή. Ανοίγει μόνο όταν το εγκρίνεις.

**Βήμα 7 — Φόρμα του site (πρόταση, ανενεργό)**
- Μετά από επιτυχή υποβολή, το αίτημα στέλνεται στην ίδια ροή προς Notion, στο παρασκήνιο. Αν το Notion αποτύχει, η φόρμα δουλεύει κανονικά.
- Η προσθήκη μένει κλειστή μέχρι να την εγκρίνεις.

**Βήμα 8 — Προγραμματισμένη εκτέλεση (δεν ενεργοποιείται τώρα)**
- Έτοιμη αλλά ανενεργή. Προτεινόμενη συχνότητα: κάθε 10 λεπτά (144 φορές/ημέρα). Η τελική συχνότητα αποφασίζεται μαζί, αφού δούμε αξιόπιστα αποτελέσματα.

## Εναλλακτική αν η σύνδεση email αποτύχει στο Βήμα 3
- Το Papaki κάνει προώθηση μόνο σε άλλο email, όχι σε webhook. Δεν θα σου παρουσιάσω λύση που δεν συνδέεται.
- Πρόταση: ένα μικρό ξεχωριστό πρόγραμμα σε server που διαβάζει το mailbox και στέλνει τα στοιχεία στη δική μας προστατευμένη διεύθυνση εισαγωγής. Όλη η υπόλοιπη λογική (Notion, διπλότυπα, αντιστοίχιση) μένει ίδια.

## Ασφάλεια
- Καμία πρόσβαση σε email ή Notion από τον browser. Όλα τα κλειδιά μένουν μόνο στο backend.
- Το dry-run το ξεκινά μόνο συνδεδεμένος admin. Η προγραμματισμένη εκτέλεση χρειάζεται ξεχωριστό μυστικό κλειδί, που δεν φαίνεται πουθενά.
- Τρέχει μία εκτέλεση τη φορά, με ελάχιστο διάστημα μεταξύ εκτελέσεων, έλεγχο όλων των δεδομένων και όριο μηνυμάτων ανά εκτέλεση.
- Καμία αυτόματη απάντηση σε πελάτη, καμία διαγραφή ή μετακίνηση email.
- Σε σφάλμα δικτύου ή Notion, το σημείο ελέγχου δεν προχωρά, οπότε τίποτα δεν χάνεται. Στην επόμενη εκτέλεση ξαναδοκιμάζεται χωρίς διπλοεγγραφές.

## Δοκιμές
- Αυτόματα tests: ανάγνωση κεφαλίδων (και ελληνικά θέματα), αντιστοίχιση νήματος, διπλότυπα, αντιστοίχιση πεδίων Notion, ασφαλής χειρισμός ασαφών απαντήσεων, αποτυχίες δικτύου (timeout, λάθος κωδικός, Notion εκτός λειτουργίας).
- Ζωντανά: Βήμα 3 (μόνο ανάγνωση), μετά dry-run σε πραγματικά εισερχόμενα και απεσταλμένα, μετά δοκιμαστική υποβολή φόρμας.

## Technical details
- IMAP client: small in-house module over `cloudflare:sockets` `connect(..., { secureTransport: "on" })`, with a Node `tls` transport only for local dev/tests. No new npm dependency. Commands: LOGIN, LIST (SPECIAL-USE `\Sent`), EXAMINE (read-only), UID SEARCH UID n:*, UID FETCH BODY.PEEK[HEADER.FIELDS (...)] + BODY.PEEK[TEXT]<0.2048>. RFC 2047 decoding. Hard per-run cap of about 25 messages per folder and a 20s budget.
- Proof of hosted runtime: a read-only admin probe on the hosted build (preview build URL), because the local dev server runs on Node.
- New tables, service-role only, no anon/authenticated policies: `mail_sync_state` (folder, uidvalidity, last_uid, lock), `mail_sync_messages` (message_id unique, folder, direction, in_reply_to, references, from, subject, date, snippet, notion_order_page_id, notion_log_page_id, match_result, status), `mail_sync_runs` (mode dry/live, counts, report jsonb, error).
- Notion via connector gateway, `Notion-Version: 2025-09-03`, data sources resolved from the database IDs; schema read before any write; idempotency by checking `mail_sync_messages` before each create.
- Triggers: admin server function (existing admin cookie auth) and `src/routes/api/public/mail-sync.ts` for cron, with a `MAIL_SYNC_TOKEN` server-only secret (timing-safe compare) plus a DB lock and minimum interval. pg_cron is not scheduled in this work.
- Website hook: optional non-blocking call at the end of `submitForm`, behind a `factory_settings` flag defaulting to off.
- Existing Make endpoint `ingest-email-order` untouched.
