<!-- Target languages: ["en", "pt-BR", "es", "de", "fr", "el", "ja", "it", "ko", "id"] -->
🌐 [EN](README.md) | [ES](README-es.md) | [PT-BR](README.pt-br.md) | [DE](README-de.md) | [FR](README-fr.md) | [EL](README-el.md) | [JA](README-ja.md) | [KO](README-ko.md) | [ID](README-id.md)

# Beekeeper Studio

Beekeeper Studio è un editor SQL e gestore di database multipiattaforma disponibile per Linux, Mac e Windows.

[Scarica Beekeeper Studio](https://beekeeperstudio.io/get-community)

Pubblichiamo binari per MacOS, Windows e Linux.

[![image](https://user-images.githubusercontent.com/279769/203650152-4a34af1f-8a38-47cf-a273-d34d1c84feeb.png)](https://beekeeperstudio.io/get)


Beekeeper Studio è gratuito da scaricare e offre molte funzionalità gratis, senza iscrizione, registrazione o carta di credito. L'app offre alcune funzionalità premium a un prezzo di licenza ragionevole. [Scopri di più qui](https://beekeeperstudio.io/pricing)


La maggior parte del codice in questo repository è open source sotto licenza GPLv3. Le funzionalità a pagamento sono anch'esse in questo repository sotto una licenza commerciale source-available.

I contributi della community sono benvenuti!


## Database Supportati

<!-- Don't edit this, it gets built automatically from docs/includes/supported_databases.md -->
<!-- SUPPORT_BEGIN -->

| Database                                                 | Supporto                     | Community | Edizioni a Pagamento |                             Link Beekeeper |
| :------------------------------------------------------- | :--------------------------- | :-------: | :------: | -----------------------------------------: |
| [PostgreSQL](https://postgresql.org)                     | ⭐ Supporto Completo         |    ✅     |    ✅    |  [Funzionalità](https://beekeeperstudio.io/db/postgres-client) |
| [MySQL](https://www.mysql.com/)                          | ⭐ Supporto Completo         |    ✅     |    ✅    |  [Funzionalità](https://beekeeperstudio.io/db/mysql-client)|
| [SQLite](https://sqlite.org)                             | ⭐ Supporto Completo         |    ✅     |    ✅    |   [Funzionalità](https://beekeeperstudio.io/db/sqlite-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/sqlite) |
| [SQL Server](https://www.microsoft.com/en-us/sql-server) | ⭐ Supporto Completo         |    ✅     |    ✅    |   [Funzionalità](https://beekeeperstudio.io/db/sql-server-client)  |
| [Amazon Redshift](https://aws.amazon.com/redshift/)      | ⭐ Supporto Completo         |    ✅     |    ✅    |    [Funzionalità](https://beekeeperstudio.io/db/redshift-client) |
| [CockroachDB](https://www.cockroachlabs.com/)            | ⭐ Supporto Completo         |    ✅     |    ✅    | [Funzionalità](https://beekeeperstudio.io/db/cockroachdb-client)|
| [MariaDB](https://mariadb.org/)                          | ⭐ Supporto Completo         |    ✅     |    ✅    |     [Funzionalità](https://beekeeperstudio.io/db/mariadb-client) |
| [TiDB](https://pingcap.com/products/tidb/)               | ⭐ Supporto Completo         |    ✅     |    ✅    |        [Funzionalità](https://beekeeperstudio.io/db/tidb-client) |
| [Google BigQuery](https://cloud.google.com/bigquery)     | ⭐ Supporto Completo         |    ✅      |    ✅    |    [Funzionalità](https://beekeeperstudio.io/db/google-big-query-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/bigquery) |
| [Redis](https://redis.io/)                               | ⭐ Supporto Completo         |    ✅    |    ✅    |       [Funzionalità](https://www.beekeeperstudio.io/db/redis-client/) |
| [Oracle Database](https://www.oracle.com/database/)      | ⭐ Supporto Completo         |           |    ✅    |      [Funzionalità](https://beekeeperstudio.io/db/oracle-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/oracle) |
| [Cassandra](http://cassandra.apache.org/)                | ⭐ Supporto Completo         |           |    ✅    |   [Funzionalità](https://beekeeperstudio.io/db/cassandra-client) |
| [Firebird](https://firebirdsql.org/)                     | ⭐ Supporto Completo         |           |    ✅    |    [Funzionalità](https://beekeeperstudio.io/db/firebird-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/firebird) |
| [LibSQL](https://libsql.org/)                            | ⭐ Supporto Completo         |          |    ✅    |      [Funzionalità](https://beekeeperstudio.io/db/libsql-client) |
| [ClickHouse](https://clickhouse.tech/)                   | ⭐ Supporto Completo         |         |    ✅    |  [Funzionalità](https://www.beekeeperstudio.io/db/clickhouse-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/clickhouse) |
| [DuckDB](https://duckdb.org/)                            | ⭐ Supporto Completo         |         |    ✅    |      [Funzionalità](https://www.beekeeperstudio.io/db/duckdb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/duckdb) |
| [SQL Anywhere](https://www.sap.com/products/technology-platform/sql-anywhere.html)  | ⭐ Supporto Completo    |           |    ✅    |      [Funzionalità](https://www.beekeeperstudio.io/db/sql-anywhere-client/) |
| [MongoDB](https://www.mongodb.com/)                      | ⭐ Supporto Completo         |          |    ✅    |     [Funzionalità](https://www.beekeeperstudio.io/db/mongodb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/mongodb) |
| [Trino](https://trino.io/) / [Presto](https://prestodb.io/) | ⭐ Supporto Completo      |           |    ✅    |    [Funzionalità](https://www.beekeeperstudio.io/db/trino-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/trino/) |
| [Snowflake](https://www.snowflake.com/)                  | ⏳ In Arrivo                 |           |    ✅    |   -- |
| [DynamoDB](https://aws.amazon.com/dynamodb/)             | 🗓️ Pianificato              |           |    ✅    |       -- |




<!-- SUPPORT_END -->

## Edizioni di Beekeeper Studio

Beekeeper Studio è un unico download con upgrade in-app per le funzionalità premium.

Ci piacerebbe rendere Beekeeper Studio completamente gratuito per tutti, ma creare buon software è un lavoro difficile e costoso. Pensiamo che le nostre edizioni a pagamento abbiano un prezzo equo, speriamo che tu sia d'accordo.

👉 [Confronta le Edizioni di Beekeeper Studio](https://beekeeperstudio.io/pricing)

## Funzionalità di Beekeeper Studio

Caratteristica principale: È fluido 🍫, veloce 🏎, e ti piacerà davvero usarlo 🥰

- Veramente multipiattaforma: Windows, MacOS e Linux
- Editor di query SQL con autocompletamento e evidenziazione della sintassi
- Interfaccia a schede per il multitasking
- Ordina e filtra i dati delle tabelle per trovare esattamente ciò di cui hai bisogno
- Scorciatoie da tastiera sensate
- Salva le query per dopo
- Cronologia di esecuzione delle query, per trovare quella query che funzionava 3 giorni fa
- Ottimo tema scuro
- Import/export
- Backup/ripristino
- Visualizza i dati come JSON
- E molto altro

## Il nostro approccio alla UX

Una delle nostre frustrazioni con altri editor SQL open source e gestori di database è che adottano un approccio "tutto dentro" alle funzionalità, aggiungendo così tante funzionalità che l'interfaccia diventa disordinata e difficile da navigare. Volevamo un workbench SQL open source bello, potente, ma anche facile da usare. Non ne abbiamo trovato uno, quindi abbiamo creato Beekeeper Studio!

Generalmente la nostra stella polare è costruire solo software che "fa sentire bene" all'uso. Ciò significa che come minimo diamo valore al fatto che Beekeeper sia veloce, semplice da usare e moderno. Se una nuova funzionalità compromette questa visione, la eliminiamo.


## Supportare Beekeeper Studio

Amiamo lavorare su Beekeeper Studio e ci piacerebbe continuare a farlo crescere e migliorarlo per sempre. Per farlo abbiamo bisogno del tuo aiuto.

Il modo migliore per supportare Beekeeper Studio è acquistare una [licenza](https://beekeeperstudio.io/pricing) a pagamento. Ogni acquisto supporta direttamente il nostro lavoro su Beekeeper Studio.

Se sei in un'azienda e usi Beekeeper Studio per il tuo lavoro, dovresti probabilmente chiedere al tuo capo di [comprarti una licenza](https://beekeeperstudio.io/pricing).

Se non puoi permetterti una licenza, per favore usa la versione gratuita, è per questo che la facciamo!

Grazie per il tuo continuo supporto!


## Documentazione

Visita [docs.beekeeperstudio.io](https://docs.beekeeperstudio.io) per guide utente, FAQ, suggerimenti per la risoluzione dei problemi e altro.

## Licenza

Beekeeper Studio Community Edition (il codice in questo repository) è sotto licenza GPLv3.

Beekeeper Studio Ultimate Edition contiene funzionalità extra ed è sotto [accordo di licenza per utente finale commerciale (EULA)](https://beekeeperstudio.io/legal/commercial-eula/).

I marchi di Beekeeper Studio (marchi verbali e loghi) non sono open source. Vedi le nostre [linee guida sui marchi](https://beekeeperstudio.io/legal/trademark/) per maggiori informazioni.

## Linee Guida sui Marchi

I marchi possono essere complicati con i progetti open source, quindi abbiamo adottato un insieme di linee guida standard per l'uso dei nostri marchi che sono comuni a molti progetti open source.

Se stai solo usando l'app Beekeeper Studio, e non stai forkando o distribuendo codice di Beekeeper Studio in alcun modo, queste probabilmente non si applicano a te.

👉 [Linee Guida sui Marchi di Beekeeper Studio](https://beekeeperstudio.io/legal/trademark/)

## Contribuire a Beekeeper Studio

Amiamo *qualsiasi* coinvolgimento della community. Anche se ti stai lamentando perché non ti piace qualcosa dell'app!


### Accordi dei Contributori

- Costruire una community inclusiva e accogliente è importante per noi, quindi per favore segui il nostro [codice di condotta](code_of_conduct.md) mentre partecipi al progetto.

- Contribuendo al progetto accetti i termini delle nostre [linee guida per i contributori](CONTRIBUTING.md).

### Contribuire senza codice

Ti abbiamo coperto, leggi la nostra [guida per contribuire in 10 minuti senza codice](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

### Compilare ed Eseguire Beekeeper Studio Localmente

Vuoi scrivere codice e migliorare Beekeeper Studio? La configurazione è facile su Mac, Linux o Windows.

```bash
# Prima: Installa NodeJS 20, NPM e Yarn
# ...

# 1. Fai Fork del Repository di Beekeeper Studio (clicca sul pulsante fork in alto a destra di questa schermata)
# 2. Clona il tuo fork:
git clone git@github.com:<tuo-username>/beekeeper-studio.git beekeeper-studio
cd beekeeper-studio/
yarn install # installa le dipendenze


# Ora puoi avviare l'app:
yarn run electron:serve ## l'app si avvierà
```

**Se ottieni `error:03000086:digital envelope routines::initialization error`, dovrai aggiornare openssl.**

- Su Ubuntu/Debian:
```
sudo apt-get update
sudo apt-get upgrade openssl
```

- Su CentOS/RHEL:
```
sudo yum update openssl
```

- Su macOS (usando Homebrew):
```
brew update
brew upgrade openssl
```

### Dove fare le modifiche?

Questo repository è ora un monorepo, abbiamo diversi posti con codice, ma solo un paio di entry point importanti.

Tutto il codice dell'app si trova in `apps/studio`, del codice condiviso si trova in `shared/src`. Questo è condiviso con altre app.

Beekeeper Studio ha due entry point:
- `background.js` - questo è il codice lato Electron che controlla cose native come mostrare le finestre.
- `main.js` - questo è l'entry point per l'app Vue.js. Puoi seguire le briciole di pane dei componenti Vue da `App.vue` per trovare lo schermo di cui hai bisogno.

**Generalmente abbiamo due 'schermi':**
- ConnectionInterface - connessione a un DB
- CoreInterface - interazione con un database

### Come inviare una modifica?


- Pusha le tue modifiche nel tuo repository e apri una Pull Request dalla nostra pagina GitHub (questa pagina)
- Assicurati di scrivere alcune note su cosa fa la tua modifica! Una gif è sempre benvenuta per i cambiamenti visivi.

## Note per i Maintainer (i lettori occasionali possono ignorare)

### Considerazioni sull'Upgrade di Electron

Questo è sempre molto doloroso e romperà la build 9 volte su 10.

Alcune cose da considerare quando si fa l'upgrade di Electron:

1. Usa una versione di node diversa? Es. Electron-18 usa node 14, 22 usa node 16. Quindi tutti devono fare l'upgrade
2. node-abi deve essere aggiornato per capire la versione di Electron? Questo è usato nella build per recuperare pacchetti precompilati. Devi aggiornare questo in root/package.json#resolutions
3. Qualche API è stata deprecata o rimossa? Assicurati che tutte le funzionalità che interagiscono con le API di Electron funzionino ancora, cose come - selezionare un file, massimizzare una finestra, eseguire una query, ecc.


### Processo di Release

1. Aumenta il numero di versione in package.json
2. Sostituisci `build/release-notes.md` con le ultime note di release. Segui il formato esistente.
  - esegui `git log <last-tag>..HEAD --oneline | grep 'Merge pull'` per trovare le PR merged
2. Commit
3. Push su master
4. Crea un tag `git tag v<version>`. Deve iniziare con 'v'
5. `git push origin <tagname>`
  - Ora aspetta che l'azione build/publish sia completata su Github
6. Pubblica la nuova release
  - Vai alla nuova release 'draft' nella tab releases di GitHub, modifica le note, pubblica
  - Accedi a snapcraft.io, trascina la release caricata nel canale 'stable' per ogni architettura.

Questo dovrebbe anche pubblicare la documentazione più recente

Post Release:
1. Copia le note di release in un post sul blog, pubblica sul sito web
2. Tweet del link
3. Condividi su LinkedIn
4. Invia alla mailing list su SendInBlue


## Un Grande Grazie

Beekeeper Studio non esisterebbe senza [Sqlectron-core](https://github.com/sqlectron/sqlectron-core), le librerie database principali del [progetto Sqlectron](https://github.com/sqlectron/sqlectron-gui). Beekeeper Studio è iniziato come un fork sperimentale di quel repository. Un grande grazie a @maxcnunes e al resto della community Sqlectron.

La licenza originale di sqlectron-core è inclusa qui:

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
