<!-- Target languages: ["en", "pt-BR", "es", "de", "fr", "el", "ja", "it", "ko", "id"] -->
🌐 [EN](README.md) | [ES](README-es.md) | [PT-BR](README.pt-br.md) | [FR](README-fr.md) | [EL](README-el.md) | [JA](README-ja.md) | [IT](README-it.md) | [KO](README-ko.md) | [ID](README-id.md)

# Beekeeper Studio

Beekeeper Studio ist ein plattformübergreifender SQL-Editor und Datenbankmanager für Linux, Mac und Windows.

[Beekeeper Studio herunterladen](https://beekeeperstudio.io/get-community)

Wir veröffentlichen Binärdateien für MacOS, Windows und Linux.

[![image](https://user-images.githubusercontent.com/279769/203650152-4a34af1f-8a38-47cf-a273-d34d1c84feeb.png)](https://beekeeperstudio.io/get)


Beekeeper Studio kann kostenlos heruntergeladen werden und bietet viele Funktionen gratis, ohne Anmeldung, Registrierung oder Kreditkarte. Die App bietet einige Premium-Funktionen zu einem angemessenen Lizenzpreis. [Mehr erfahren](https://beekeeperstudio.io/pricing)


Der größte Teil des Codes in diesem Repository ist Open Source unter der GPLv3-Lizenz. Bezahlte Funktionen befinden sich ebenfalls in diesem Repository unter einer kommerziellen Source-Available-Lizenz.

Community-Beiträge sind willkommen!


## Unterstützte Datenbanken

<!-- Don't edit this, it gets built automatically from docs/includes/supported_databases.md -->
<!-- SUPPORT_BEGIN -->

| Database                                                 | Support                      | Community | Paid Editions |                             Beekeeper Links |
| :------------------------------------------------------- | :--------------------------- | :-------: | :------: | -----------------------------------------: |
| [PostgreSQL](https://postgresql.org)                     | ⭐ Full Support              |    ✅     |    ✅    |  [Features](https://beekeeperstudio.io/db/postgres-client) |
| [MySQL](https://www.mysql.com/)                          | ⭐ Full Support              |    ✅     |    ✅    |  [Features](https://beekeeperstudio.io/db/mysql-client)|
| [SQLite](https://sqlite.org)                             | ⭐ Full Support              |    ✅     |    ✅    |   [Features](https://beekeeperstudio.io/db/sqlite-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/sqlite) |
| [SQL Server](https://www.microsoft.com/en-us/sql-server) | ⭐ Full Support              |    ✅     |    ✅    |   [Features](https://beekeeperstudio.io/db/sql-server-client)  |
| [Amazon Redshift](https://aws.amazon.com/redshift/)      | ⭐ Full Support              |    ✅     |    ✅    |    [Features](https://beekeeperstudio.io/db/redshift-client) |
| [CockroachDB](https://www.cockroachlabs.com/)            | ⭐ Full Support              |    ✅     |    ✅    | [Features](https://beekeeperstudio.io/db/cockroachdb-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/cockroachdb) |
| [MariaDB](https://mariadb.org/)                          | ⭐ Full Support              |    ✅     |    ✅    |     [Features](https://beekeeperstudio.io/db/mariadb-client) |
| [TiDB](https://pingcap.com/products/tidb/)               | ⭐ Full Support              |    ✅     |    ✅    |        [Features](https://beekeeperstudio.io/db/tidb-client) |
| [Google BigQuery](https://cloud.google.com/bigquery)     | ⭐ Full Support             |    ✅      |    ✅    |    [Features](https://beekeeperstudio.io/db/google-big-query-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/bigquery) |
| [Redis](https://redis.io/)                               | ⭐ Full Support               |    ✅    |    ✅    |       [Features](https://www.beekeeperstudio.io/db/redis-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/redis) |
| [GreengageDB](https://greengagedb.org/)                  | ⭐ Full Support              |    ✅     |    ✅    |   [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/greengage) |
| [Oracle Database](https://www.oracle.com/database/)      | ⭐ Full Support              |           |    ✅    |      [Features](https://beekeeperstudio.io/db/oracle-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/oracle) |
| [Cassandra](http://cassandra.apache.org/)                | ⭐ Full Support              |           |    ✅    |   [Features](https://beekeeperstudio.io/db/cassandra-client) |
| [ScyllaDB](https://www.scylladb.com/)                    | ⭐ Full Support (via Cassandra driver) |           |    ✅    |   Drop-in compatible with Cassandra |
| [Firebird](https://firebirdsql.org/)                     | ⭐ Full Support              |           |    ✅    |    [Features](https://beekeeperstudio.io/db/firebird-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/firebird) |
| [LibSQL](https://libsql.org/)                            | ⭐ Full Support               |          |    ✅    |      [Features](https://beekeeperstudio.io/db/libsql-client) |
| [ClickHouse](https://clickhouse.tech/)                   | ⭐ Full Support                |         |    ✅    |  [Features](https://www.beekeeperstudio.io/db/clickhouse-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/clickhouse) |
| [DuckDB](https://duckdb.org/)                            | ⭐ Full Support                |         |    ✅    |      [Features](https://www.beekeeperstudio.io/db/duckdb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/duckdb) |
| [SQL Anywhere](https://www.sap.com/products/technology-platform/sql-anywhere.html)  | ⭐ Full Support    |           |    ✅    |      [Features](https://www.beekeeperstudio.io/db/sql-anywhere-client/) |
| [MongoDB](https://www.mongodb.com/)                      | ⭐ Full Support               |          |    ✅    |     [Features](https://www.beekeeperstudio.io/db/mongodb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/mongodb) |
| [Trino](https://trino.io/) / [Presto](https://prestodb.io/) | ⭐ Full Support                |           |    ✅    |    [Features](https://www.beekeeperstudio.io/db/trino-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/trino/) |
| [SurrealDB](https://surrealdb.com/)                      | ⭐ Full Support               |           |    ✅    |      [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/surrealdb) |
| [Snowflake](https://www.snowflake.com/)                  | ⏳ Coming Soon                |           |    ✅    |   -- |
| [DynamoDB](https://aws.amazon.com/dynamodb/)             | 🗓️ Planned               |           |    ✅    |       -- |




<!-- SUPPORT_END -->

## Beekeeper Studio Editionen

Beekeeper Studio ist ein einzelner Download mit In-App-Upgrades für Premium-Funktionen.

Wir würden Beekeeper Studio gerne für alle völlig kostenlos machen, aber gute Software zu entwickeln ist harte und teure Arbeit. Wir denken, dass unsere bezahlten Editionen fair bepreist sind, und hoffen, dass du das auch so siehst.

👉 [Beekeeper Studio Editionen vergleichen](https://beekeeperstudio.io/pricing)

## Beekeeper Studio Funktionen

Top-Feature: Es ist geschmeidig 🍫, schnell 🏎, und du wirst es wirklich gerne benutzen 🥰

- Wirklich plattformübergreifend: Windows, MacOS und Linux
- SQL-Abfrage-Editor mit Autovervollständigung und Syntaxhervorhebung
- Tab-Interface für Multitasking
- Tabellendaten sortieren und filtern, um genau das zu finden, was du brauchst
- Sinnvolle Tastaturkürzel
- Abfragen für später speichern
- Abfrageverlauf, damit du die Abfrage findest, die vor 3 Tagen funktioniert hat
- Großartiges dunkles Theme
- Import/Export
- Backup/Wiederherstellung
- Daten als JSON anzeigen
- Und vieles mehr

## Unser UX-Ansatz

Eine unserer Frustrationen mit anderen Open-Source-SQL-Editoren und Datenbankmanagern ist, dass sie einen "Alles-rein"-Ansatz bei den Funktionen verfolgen und so viele Features hinzufügen, dass die Benutzeroberfläche überladen und schwer zu navigieren wird. Wir wollten eine gut aussehende, Open-Source-SQL-Workbench, die leistungsstark, aber auch einfach zu bedienen ist. Wir konnten keine finden, also haben wir Beekeeper Studio erstellt!

Unser Leitstern ist generell, nur Software zu bauen, die sich "gut anfühlt". Das bedeutet, dass wir mindestens Wert darauf legen, dass Beekeeper schnell, unkompliziert und modern ist. Wenn ein neues Feature diese Vision gefährdet, streichen wir es.


## Beekeeper Studio unterstützen

Wir lieben die Arbeit an Beekeeper Studio und würden es gerne für immer weiter ausbauen und verbessern. Dafür brauchen wir deine Hilfe.

Der beste Weg, Beekeeper Studio zu unterstützen, ist der Kauf einer bezahlten [Lizenz](https://beekeeperstudio.io/pricing). Jeder Kauf unterstützt direkt unsere Arbeit an Beekeeper Studio.

Wenn du in einem Unternehmen arbeitest und Beekeeper Studio für deine Arbeit nutzt, solltest du wahrscheinlich deinen Chef bitten, dir eine [Lizenz zu kaufen](https://beekeeperstudio.io/pricing).

Wenn du dir keine Lizenz leisten kannst, nutze bitte die kostenlose Version, dafür gibt es sie!

Vielen Dank für deine kontinuierliche Unterstützung!


## Dokumentation

Besuche [docs.beekeeperstudio.io](https://docs.beekeeperstudio.io) für Benutzerhandbücher, FAQs, Tipps zur Fehlerbehebung und mehr.

## Lizenz

Beekeeper Studio Community Edition (der Code in diesem Repository) ist unter der GPLv3-Lizenz lizenziert.

Beekeeper Studio Ultimate Edition enthält zusätzliche Funktionen und ist unter einer [kommerziellen Endbenutzer-Lizenzvereinbarung (EULA)](https://beekeeperstudio.io/legal/commercial-eula/) lizenziert.

Die Marken von Beekeeper Studio (Wortmarken und Logos) sind nicht Open Source. Siehe unsere [Markenrichtlinien](https://beekeeperstudio.io/legal/trademark/) für weitere Informationen.

## Markenrichtlinien

Marken können bei Open-Source-Projekten kompliziert sein, daher haben wir eine Reihe von Standardrichtlinien für die Verwendung unserer Marken übernommen, die bei vielen Open-Source-Projekten üblich sind.

Wenn du nur die Beekeeper Studio-App verwendest und den Beekeeper Studio-Code nicht forkst oder verteilst, gelten diese wahrscheinlich nicht für dich.

👉 [Beekeeper Studio Markenrichtlinien](https://beekeeperstudio.io/legal/trademark/)

## Zu Beekeeper Studio beitragen

Wir lieben *jedes* Community-Engagement. Auch wenn du dich beschwerst, weil dir etwas an der App nicht gefällt!


### Mitwirkenden-Vereinbarungen

- Der Aufbau einer inklusiven und einladenden Community ist uns wichtig, also befolge bitte unseren [Verhaltenskodex](code_of_conduct.md), wenn du am Projekt teilnimmst.

- Durch Beiträge zum Projekt stimmst du den Bedingungen unserer [Beitragsrichtlinien](CONTRIBUTING.md) zu.

### Ohne Code beitragen

Wir haben dich abgedeckt, lies unsere [Anleitung zum Beitragen in 10 Minuten ohne Code](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

### Beekeeper Studio lokal kompilieren und ausführen

Möchtest du Code schreiben und Beekeeper Studio verbessern? Die Einrichtung ist einfach auf Mac, Linux oder Windows.

```bash
# Zuerst: Installiere NodeJS 20, NPM und Yarn
# ...

# 1. Forke das Beekeeper Studio Repository (klicke auf den Fork-Button oben rechts auf diesem Bildschirm)
# 2. Clone deinen Fork:
git clone git@github.com:<dein-benutzername>/beekeeper-studio.git beekeeper-studio
cd beekeeper-studio/
yarn install # installiert Abhängigkeiten


# Jetzt kannst du die App starten:
yarn run electron:serve ## die App wird jetzt starten
```

**Wenn du `error:03000086:digital envelope routines::initialization error` erhältst, musst du openssl aktualisieren.**

- Auf Ubuntu/Debian:
```
sudo apt-get update
sudo apt-get upgrade openssl
```

- Auf CentOS/RHEL:
```
sudo yum update openssl
```

- Auf macOS (mit Homebrew):
```
brew update
brew upgrade openssl
```

### Wo soll ich Änderungen vornehmen?

Dieses Repository ist jetzt ein Monorepo, wir haben mehrere Orte mit Code, aber nur ein paar wichtige Einstiegspunkte.

Der gesamte App-Code befindet sich in `apps/studio`, etwas geteilter Code befindet sich in `shared/src`. Dieser wird mit anderen Apps geteilt.

Beekeeper Studio hat zwei Einstiegspunkte:
- `background.js` - dies ist der Electron-seitige Code, der native Dinge wie das Anzeigen von Fenstern steuert.
- `main.js` - dies ist der Einstiegspunkt für die Vue.js-App. Du kannst den Vue-Komponenten-Breadcrumbs von `App.vue` aus folgen, um den Bildschirm zu finden, den du brauchst.

**Im Allgemeinen haben wir zwei 'Bildschirme':**
- ConnectionInterface - Verbindung zu einer DB
- CoreInterface - Interaktion mit einer Datenbank

### Wie reiche ich eine Änderung ein?


- Pushe deine Änderungen in dein Repository und öffne einen Pull Request von unserer GitHub-Seite (diese Seite)
- Schreibe unbedingt einige Notizen darüber, was deine Änderung bewirkt! Ein GIF ist bei visuellen Änderungen immer willkommen.

## Maintainer-Notizen (Gelegenheitsleser können dies ignorieren)

### Hinweise zum Electron-Upgrade

Das ist immer ein totaler Schmerz und wird den Build in 9 von 10 Fällen kaputt machen.

Einige Dinge, die du beim Electron-Upgrade beachten musst:

1. Verwendet es eine andere Node-Version? Z.B. Electron-18 verwendet Node 14, 22 verwendet Node 16. Also muss jeder upgraden
2. Muss node-abi aktualisiert werden, um die Electron-Version zu verstehen? Dies wird im Build verwendet, um vorgefertigte Pakete abzurufen. Du musst dies in root/package.json#resolutions aktualisieren
3. Wurden APIs deprecated oder entfernt? Stelle sicher, dass alle Funktionen, die mit den Electron-APIs interagieren, noch funktionieren, Dinge wie - eine Datei auswählen, ein Fenster maximieren, eine Abfrage ausführen, etc.


### Release-Prozess

1. Erhöhe die Versionsnummer in package.json
2. Ersetze `build/release-notes.md` mit den neuesten Release-Notes. Befolge das vorhandene Format.
  - führe `git log <last-tag>..HEAD --oneline | grep 'Merge pull'` aus, um gemergte PRs zu finden
2. Commit
3. Push zu master
4. Erstelle einen Tag `git tag v<version>`. Er muss mit 'v' beginnen
5. `git push origin <tagname>`
  - Warte nun, bis die build/publish-Aktion auf Github abgeschlossen ist
6. Veröffentliche das neue Release
  - Gehe zum neuen 'Draft'-Release im Releases-Tab von GitHub, bearbeite die Notes, veröffentliche
  - Melde dich bei snapcraft.io an, ziehe das hochgeladene Release in den 'stable'-Channel für jede Architektur.

Dies sollte auch die neueste Dokumentation veröffentlichen

Nach dem Release:
1. Kopiere die Release-Notes in einen Blog-Post, veröffentliche auf der Website
2. Tweet den Link
3. Teile auf LinkedIn
4. Sende an die Mailingliste auf SendInBlue


## Großer Dank

Beekeeper Studio würde ohne [Sqlectron-core](https://github.com/sqlectron/sqlectron-core) nicht existieren, die Kern-Datenbankbibliotheken vom [Sqlectron-Projekt](https://github.com/sqlectron/sqlectron-gui). Beekeeper Studio begann als experimenteller Fork dieses Repositories. Ein großes Dankeschön an @maxcnunes und den Rest der Sqlectron-Community.

Die Originallizenz von sqlectron-core ist hier enthalten:

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
