<!-- Target languages: ["en", "pt-BR", "es", "de", "fr", "el", "ja", "it", "ko", "id"] -->
🌐 [EN](README.md) | [ES](README-es.md) | [PT-BR](README.pt-br.md) | [DE](README-de.md) | [FR](README-fr.md) | [JA](README-ja.md) | [IT](README-it.md) | [KO](README-ko.md) | [ID](README-id.md)

# Beekeeper Studio

Το Beekeeper Studio είναι ένας διαπλατφορμικός επεξεργαστής SQL και διαχειριστής βάσεων δεδομένων διαθέσιμος για Linux, Mac και Windows.

[Κατεβάστε το Beekeeper Studio](https://beekeeperstudio.io/get-community)

Δημοσιεύουμε εκτελέσιμα για MacOS, Windows και Linux.

[![image](https://user-images.githubusercontent.com/279769/203650152-4a34af1f-8a38-47cf-a273-d34d1c84feeb.png)](https://beekeeperstudio.io/get)


Το Beekeeper Studio είναι δωρεάν για λήψη και παρέχει πολλές δυνατότητες δωρεάν, χωρίς εγγραφή, καταχώρηση ή πιστωτική κάρτα. Η εφαρμογή παρέχει ορισμένες premium δυνατότητες με λογικό κόστος άδειας. [Μάθετε περισσότερα εδώ](https://beekeeperstudio.io/pricing)


Το μεγαλύτερο μέρος του κώδικα σε αυτό το αποθετήριο είναι ανοιχτού κώδικα υπό την άδεια GPLv3. Οι επί πληρωμή δυνατότητες βρίσκονται επίσης σε αυτό το αποθετήριο υπό εμπορική άδεια με διαθέσιμο πηγαίο κώδικα.

Καλωσορίζουμε τις συνεισφορές της κοινότητας!


## Υποστηριζόμενες Βάσεις Δεδομένων

<!-- Don't edit this, it gets built automatically from docs/includes/supported_databases.md -->
<!-- SUPPORT_BEGIN -->

| Βάση Δεδομένων                                           | Υποστήριξη                   | Community | Επί Πληρωμή |                             Σύνδεσμοι Beekeeper |
| :------------------------------------------------------- | :--------------------------- | :-------: | :------: | -----------------------------------------: |
| [PostgreSQL](https://postgresql.org)                     | ⭐ Πλήρης Υποστήριξη         |    ✅     |    ✅    |  [Χαρακτηριστικά](https://beekeeperstudio.io/db/postgres-client) |
| [MySQL](https://www.mysql.com/)                          | ⭐ Πλήρης Υποστήριξη         |    ✅     |    ✅    |  [Χαρακτηριστικά](https://beekeeperstudio.io/db/mysql-client)|
| [SQLite](https://sqlite.org)                             | ⭐ Πλήρης Υποστήριξη         |    ✅     |    ✅    |   [Χαρακτηριστικά](https://beekeeperstudio.io/db/sqlite-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/sqlite) |
| [SQL Server](https://www.microsoft.com/en-us/sql-server) | ⭐ Πλήρης Υποστήριξη         |    ✅     |    ✅    |   [Χαρακτηριστικά](https://beekeeperstudio.io/db/sql-server-client)  |
| [Amazon Redshift](https://aws.amazon.com/redshift/)      | ⭐ Πλήρης Υποστήριξη         |    ✅     |    ✅    |    [Χαρακτηριστικά](https://beekeeperstudio.io/db/redshift-client) |
| [CockroachDB](https://www.cockroachlabs.com/)            | ⭐ Πλήρης Υποστήριξη         |    ✅     |    ✅    | [Χαρακτηριστικά](https://beekeeperstudio.io/db/cockroachdb-client)|
| [MariaDB](https://mariadb.org/)                          | ⭐ Πλήρης Υποστήριξη         |    ✅     |    ✅    |     [Χαρακτηριστικά](https://beekeeperstudio.io/db/mariadb-client) |
| [TiDB](https://pingcap.com/products/tidb/)               | ⭐ Πλήρης Υποστήριξη         |    ✅     |    ✅    |        [Χαρακτηριστικά](https://beekeeperstudio.io/db/tidb-client) |
| [Google BigQuery](https://cloud.google.com/bigquery)     | ⭐ Πλήρης Υποστήριξη         |    ✅      |    ✅    |    [Χαρακτηριστικά](https://beekeeperstudio.io/db/google-big-query-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/bigquery) |
| [Redis](https://redis.io/)                               | ⭐ Πλήρης Υποστήριξη         |    ✅    |    ✅    |       [Χαρακτηριστικά](https://www.beekeeperstudio.io/db/redis-client/) |
| [Oracle Database](https://www.oracle.com/database/)      | ⭐ Πλήρης Υποστήριξη         |           |    ✅    |      [Χαρακτηριστικά](https://beekeeperstudio.io/db/oracle-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/oracle) |
| [Cassandra](http://cassandra.apache.org/)                | ⭐ Πλήρης Υποστήριξη         |           |    ✅    |   [Χαρακτηριστικά](https://beekeeperstudio.io/db/cassandra-client) |
| [Firebird](https://firebirdsql.org/)                     | ⭐ Πλήρης Υποστήριξη         |           |    ✅    |    [Χαρακτηριστικά](https://beekeeperstudio.io/db/firebird-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/firebird) |
| [LibSQL](https://libsql.org/)                            | ⭐ Πλήρης Υποστήριξη         |          |    ✅    |      [Χαρακτηριστικά](https://beekeeperstudio.io/db/libsql-client) |
| [ClickHouse](https://clickhouse.tech/)                   | ⭐ Πλήρης Υποστήριξη         |         |    ✅    |  [Χαρακτηριστικά](https://www.beekeeperstudio.io/db/clickhouse-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/clickhouse) |
| [DuckDB](https://duckdb.org/)                            | ⭐ Πλήρης Υποστήριξη         |         |    ✅    |      [Χαρακτηριστικά](https://www.beekeeperstudio.io/db/duckdb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/duckdb) |
| [SQL Anywhere](https://www.sap.com/products/technology-platform/sql-anywhere.html)  | ⭐ Πλήρης Υποστήριξη    |           |    ✅    |      [Χαρακτηριστικά](https://www.beekeeperstudio.io/db/sql-anywhere-client/) |
| [MongoDB](https://www.mongodb.com/)                      | ⭐ Πλήρης Υποστήριξη         |          |    ✅    |     [Χαρακτηριστικά](https://www.beekeeperstudio.io/db/mongodb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/mongodb) |
| [Trino](https://trino.io/) / [Presto](https://prestodb.io/) | ⭐ Πλήρης Υποστήριξη      |           |    ✅    |    [Χαρακτηριστικά](https://www.beekeeperstudio.io/db/trino-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/trino/) |
| [Snowflake](https://www.snowflake.com/)                  | ⏳ Σύντομα                   |           |    ✅    |   -- |
| [DynamoDB](https://aws.amazon.com/dynamodb/)             | 🗓️ Προγραμματισμένο         |           |    ✅    |       -- |




<!-- SUPPORT_END -->

## Εκδόσεις του Beekeeper Studio

Το Beekeeper Studio είναι μία λήψη με αναβαθμίσεις μέσα στην εφαρμογή για premium δυνατότητες.

Θα θέλαμε να κάνουμε το Beekeeper Studio εντελώς δωρεάν για όλους, αλλά η δημιουργία καλού λογισμικού είναι δύσκολη και ακριβή δουλειά. Πιστεύουμε ότι οι επί πληρωμή εκδόσεις μας έχουν δίκαιη τιμή, ελπίζουμε να συμφωνείτε.

👉 [Συγκρίνετε τις εκδόσεις του Beekeeper Studio](https://beekeeperstudio.io/pricing)

## Χαρακτηριστικά του Beekeeper Studio

Κορυφαίο χαρακτηριστικό: Είναι ομαλό 🍫, γρήγορο 🏎, και θα το απολαύσετε πραγματικά 🥰

- Πραγματικά διαπλατφορμικό: Windows, MacOS και Linux
- Επεξεργαστής ερωτημάτων SQL με αυτόματη συμπλήρωση και επισήμανση σύνταξης
- Διεπαφή με καρτέλες για πολυδιεργασία
- Ταξινόμηση και φιλτράρισμα δεδομένων πίνακα για να βρείτε ακριβώς αυτό που χρειάζεστε
- Λογικές συντομεύσεις πληκτρολογίου
- Αποθήκευση ερωτημάτων για αργότερα
- Ιστορικό εκτέλεσης ερωτημάτων, για να βρείτε εκείνο το ερώτημα που λειτούργησε πριν 3 μέρες
- Εξαιρετικό σκοτεινό θέμα
- Εισαγωγή/εξαγωγή
- Αντίγραφα ασφαλείας/επαναφορά
- Προβολή δεδομένων ως JSON
- Και πολλά άλλα

## Η προσέγγισή μας στο UX

Μία από τις απογοητεύσεις μας με άλλους επεξεργαστές SQL ανοιχτού κώδικα και διαχειριστές βάσεων δεδομένων είναι ότι ακολουθούν μια προσέγγιση "τα πάντα μέσα" στα χαρακτηριστικά, προσθέτοντας τόσα πολλά χαρακτηριστικά που η διεπαφή γίνεται ακατάστατη και δύσκολη στην πλοήγηση. Θέλαμε ένα όμορφο, ανοιχτού κώδικα SQL workbench που να είναι ισχυρό, αλλά και εύκολο στη χρήση. Δεν μπορέσαμε να βρούμε κάτι τέτοιο, οπότε δημιουργήσαμε το Beekeeper Studio!

Γενικά ο οδηγός μας είναι να δημιουργούμε μόνο λογισμικό που "αισθάνεται καλά" στη χρήση. Αυτό σημαίνει ότι τουλάχιστον εκτιμούμε το Beekeeper να είναι γρήγορο, απλό στη χρήση και μοντέρνο. Αν ένα νέο χαρακτηριστικό θέτει σε κίνδυνο αυτό το όραμα, το εγκαταλείπουμε.


## Υποστηρίξτε το Beekeeper Studio

Αγαπάμε να δουλεύουμε στο Beekeeper Studio και θα θέλαμε να συνεχίσουμε να το αναπτύσσουμε και να το βελτιώνουμε για πάντα. Για να το κάνουμε αυτό χρειαζόμαστε τη βοήθειά σας.

Ο καλύτερος τρόπος να υποστηρίξετε το Beekeeper Studio είναι να αγοράσετε μια επί πληρωμή [άδεια](https://beekeeperstudio.io/pricing). Κάθε αγορά υποστηρίζει άμεσα τη δουλειά μας στο Beekeeper Studio.

Αν εργάζεστε σε μια επιχείρηση και χρησιμοποιείτε το Beekeeper Studio για τη δουλειά σας, θα πρέπει πιθανώς να ζητήσετε από το αφεντικό σας να σας [αγοράσει μια άδεια](https://beekeeperstudio.io/pricing).

Αν δεν μπορείτε να αντέξετε οικονομικά μια άδεια, παρακαλώ χρησιμοποιήστε τη δωρεάν έκδοση, γι' αυτό φτιάχνουμε μια δωρεάν έκδοση!

Ευχαριστούμε για τη συνεχή υποστήριξή σας!


## Τεκμηρίωση

Επισκεφθείτε το [docs.beekeeperstudio.io](https://docs.beekeeperstudio.io) για οδηγούς χρήστη, συχνές ερωτήσεις, συμβουλές αντιμετώπισης προβλημάτων και άλλα.

## Άδεια

Το Beekeeper Studio Community Edition (ο κώδικας σε αυτό το αποθετήριο) είναι υπό άδεια GPLv3.

Το Beekeeper Studio Ultimate Edition περιέχει επιπλέον δυνατότητες και είναι υπό [εμπορική άδεια τελικού χρήστη (EULA)](https://beekeeperstudio.io/legal/commercial-eula/).

Τα εμπορικά σήματα του Beekeeper Studio (λέξεις και λογότυπα) δεν είναι ανοιχτού κώδικα. Δείτε τις [οδηγίες εμπορικών σημάτων](https://beekeeperstudio.io/legal/trademark/) για περισσότερες πληροφορίες.

## Οδηγίες Εμπορικών Σημάτων

Τα εμπορικά σήματα μπορεί να είναι περίπλοκα με έργα ανοιχτού κώδικα, οπότε έχουμε υιοθετήσει ένα σύνολο τυπικών οδηγιών για τη χρήση των σημάτων μας που είναι κοινές σε πολλά έργα ανοιχτού κώδικα.

Αν απλά χρησιμοποιείτε την εφαρμογή Beekeeper Studio και δεν κάνετε fork ή διανομή κώδικα του Beekeeper Studio με οποιονδήποτε τρόπο, αυτά πιθανότατα δεν σας αφορούν.

👉 [Οδηγίες Εμπορικών Σημάτων Beekeeper Studio](https://beekeeperstudio.io/legal/trademark/)

## Συνεισφορά στο Beekeeper Studio

Αγαπάμε *οποιαδήποτε* συμμετοχή της κοινότητας. Ακόμα κι αν παραπονιέστε επειδή δεν σας αρέσει κάτι στην εφαρμογή!


### Συμφωνίες Συνεισφερόντων

- Η δημιουργία μιας συμπεριληπτικής και φιλόξενης κοινότητας είναι σημαντική για εμάς, οπότε παρακαλώ ακολουθήστε τον [κώδικα δεοντολογίας](code_of_conduct.md) καθώς συμμετέχετε στο έργο.

- Με τη συνεισφορά στο έργο συμφωνείτε με τους όρους των [οδηγιών συνεισφοράς](CONTRIBUTING.md).

### Συνεισφέρετε χωρίς κώδικα

Σας καλύπτουμε, διαβάστε τον [οδηγό συνεισφοράς σε 10 λεπτά χωρίς κώδικα](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

### Μεταγλώττιση και Εκτέλεση του Beekeeper Studio Τοπικά

Θέλετε να γράψετε κώδικα και να βελτιώσετε το Beekeeper Studio; Η ρύθμιση είναι εύκολη σε Mac, Linux ή Windows.

```bash
# Πρώτα: Εγκαταστήστε NodeJS 20, NPM και Yarn
# ...

# 1. Κάντε Fork το αποθετήριο του Beekeeper Studio (κάντε κλικ στο κουμπί fork πάνω δεξιά σε αυτή την οθόνη)
# 2. Κάντε checkout το fork σας:
git clone git@github.com:<το-όνομα-χρήστη-σας>/beekeeper-studio.git beekeeper-studio
cd beekeeper-studio/
yarn install # εγκαθιστά τις εξαρτήσεις


# Τώρα μπορείτε να ξεκινήσετε την εφαρμογή:
yarn run electron:serve ## η εφαρμογή θα ξεκινήσει τώρα
```

**Αν λάβετε `error:03000086:digital envelope routines::initialization error`, θα πρέπει να ενημερώσετε το openssl.**

- Σε Ubuntu/Debian:
```
sudo apt-get update
sudo apt-get upgrade openssl
```

- Σε CentOS/RHEL:
```
sudo yum update openssl
```

- Σε macOS (με Homebrew):
```
brew update
brew upgrade openssl
```

### Πού να κάνετε αλλαγές;

Αυτό το αποθετήριο είναι τώρα monorepo, έχουμε πολλά μέρη με κώδικα, αλλά μόνο μερικά σημαντικά σημεία εισόδου.

Όλος ο κώδικας της εφαρμογής βρίσκεται στο `apps/studio`, κάποιος κοινόχρηστος κώδικας βρίσκεται στο `shared/src`. Αυτός μοιράζεται με άλλες εφαρμογές.

Το Beekeeper Studio έχει δύο σημεία εισόδου:
- `background.js` - αυτός είναι ο κώδικας της πλευράς του Electron που ελέγχει εγγενή πράγματα όπως η εμφάνιση παραθύρων.
- `main.js` - αυτό είναι το σημείο εισόδου για την εφαρμογή Vue.js. Μπορείτε να ακολουθήσετε τα breadcrumbs των Vue components από το `App.vue` για να βρείτε την οθόνη που χρειάζεστε.

**Γενικά έχουμε δύο 'οθόνες':**
- ConnectionInterface - σύνδεση σε μια ΒΔ
- CoreInterface - αλληλεπίδραση με μια βάση δεδομένων

### Πώς να υποβάλετε μια αλλαγή;


- Κάντε push τις αλλαγές σας στο αποθετήριό σας και ανοίξτε ένα Pull Request από τη σελίδα μας στο GitHub (αυτή η σελίδα)
- Φροντίστε να γράψετε μερικές σημειώσεις για το τι κάνει η αλλαγή σας! Ένα gif είναι πάντα ευπρόσδεκτο για οπτικές αλλαγές.

## Σημειώσεις Συντηρητών (οι περιστασιακοί αναγνώστες μπορούν να το αγνοήσουν)

### Προβληματισμοί Αναβάθμισης Electron

Αυτό είναι πάντα πολύ επώδυνο και θα χαλάσει το build 9 στις 10 φορές.

Μερικά πράγματα που πρέπει να λάβετε υπόψη κατά την αναβάθμιση του Electron:

1. Χρησιμοποιεί διαφορετική έκδοση node; Π.χ. το Electron-18 χρησιμοποιεί node 14, το 22 χρησιμοποιεί node 16. Οπότε όλοι πρέπει να αναβαθμίσουν
2. Χρειάζεται αναβάθμιση το node-abi για να καταλάβει την έκδοση του Electron; Αυτό χρησιμοποιείται στο build για να φέρει προμεταγλωττισμένα πακέτα. Πρέπει να το ενημερώσετε στο root/package.json#resolutions
3. Έχουν καταργηθεί ή αφαιρεθεί κάποια APIs; Βεβαιωθείτε ότι όλες οι λειτουργίες που αλληλεπιδρούν με τα APIs του Electron λειτουργούν ακόμα, πράγματα όπως - επιλογή αρχείου, μεγιστοποίηση παραθύρου, εκτέλεση ερωτήματος, κλπ.


### Διαδικασία Έκδοσης

1. Αυξήστε τον αριθμό έκδοσης στο package.json
2. Αντικαταστήστε το `build/release-notes.md` με τις τελευταίες σημειώσεις έκδοσης. Ακολουθήστε τη μορφή που υπάρχει.
  - εκτελέστε `git log <last-tag>..HEAD --oneline | grep 'Merge pull'` για να βρείτε merged PRs
2. Commit
3. Push στο master
4. Δημιουργήστε ένα tag `git tag v<version>`. Πρέπει να ξεκινάει με 'v'
5. `git push origin <tagname>`
  - Τώρα περιμένετε να ολοκληρωθεί η ενέργεια build/publish στο Github
6. Δημοσιεύστε τη νέα έκδοση
  - Πηγαίνετε στη νέα 'draft' έκδοση στην καρτέλα releases του GitHub, επεξεργαστείτε τις σημειώσεις, δημοσιεύστε
  - Συνδεθείτε στο snapcraft.io, σύρετε την ανεβασμένη έκδοση στο 'stable' channel για κάθε αρχιτεκτονική.

Αυτό θα πρέπει επίσης να δημοσιεύσει την τελευταία τεκμηρίωση

Μετά την Έκδοση:
1. Αντιγράψτε τις σημειώσεις έκδοσης σε μια ανάρτηση blog, δημοσιεύστε στον ιστότοπο
2. Tweet του συνδέσμου
3. Μοιραστείτε στο LinkedIn
4. Στείλτε στη λίστα αλληλογραφίας στο SendInBlue


## Μεγάλο Ευχαριστώ

Το Beekeeper Studio δεν θα υπήρχε χωρίς το [Sqlectron-core](https://github.com/sqlectron/sqlectron-core), τις βασικές βιβλιοθήκες βάσεων δεδομένων από το [έργο Sqlectron](https://github.com/sqlectron/sqlectron-gui). Το Beekeeper Studio ξεκίνησε ως πειραματικό fork αυτού του αποθετηρίου. Ένα μεγάλο ευχαριστώ στον @maxcnunes και στην υπόλοιπη κοινότητα του Sqlectron.

Η αρχική άδεια από το sqlectron-core περιλαμβάνεται εδώ:

```
Copyright (c) 2015 The SQLECTRON Team

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
