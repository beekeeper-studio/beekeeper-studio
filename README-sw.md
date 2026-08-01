<!-- Target languages: ["en", "pt-BR", "es", "de","sw", "fr", "el", "ja", "it", "ko", "id"] -->
🌐 [EN](README.md) | [PT-BR](README.pt-br.md) | [ES](README-es.md) | [DE](README-de.md) | [FR](README-fr.md) | [EL](README-el.md) | [JA](README-ja.md) | [IT](README-it.md) | [KO](README-ko.md) | [ID](README-id.md) | [SW](README-sw.md)

# Beekeeper Studio

Beekeeper Studio ni kihariri cha SQL na kidhibiti cha kazidata (database manager) chenye jukwaa mtambuka (cross-platform), kinachopatikana kwa Linux, Mac, na Windows.

[Pakua Beekeeper Studio](https://beekeeperstudio.io/get-community)

Tunatoa binaries kwa MacOS, Windows, na Linux.

[![image](https://user-images.githubusercontent.com/279769/203650152-4a34af1f-8a38-47cf-a273-d34d1c84feeb.png)](https://beekeeperstudio.io/get)


Beekeeper Studio ni bure kupakua na inatoa vipengele vingi bila malipo, bila usajili, bila kujiandikisha, na bila kadi ya benki. Programu inatoa baadhi ya vipengele vya premium kwa bei nafuu ya leseni. [Soma zaidi hapa](https://beekeeperstudio.io/pricing)


Sehemu kubwa ya code katika repo hii ni open source chini ya leseni ya GPLv3. Vipengele vya kulipia pia viko kwenye repo hii chini ya leseni ya kibiashara yenye source code inayopatikana.

Michango kutoka kwa jamii (community contributions) inakaribishwa!


## Kazidata Zinazotumika (Supported Databases)

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
| [DynamoDB](https://aws.amazon.com/dynamodb/)             | 🧪 Beta Support               |           |    ✅    |      [Features](https://www.beekeeperstudio.io/db/dynamodb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/dynamodb) |
| [Snowflake](https://www.snowflake.com/)                  | ⏳ Coming Soon                |           |    ✅    |   -- |




<!-- SUPPORT_END -->

## Matoleo ya Beekeeper Studio (Editions)

Beekeeper Studio ni pakua moja tu, ikiwa na updates ndani ya programu (in-app) kwa vipengele vya premium.

Tungependa kufanya Beekeeper Studio kuwa bure kabisa kwa kila mtu, lakini kutengeneza software nzuri ni kazi ngumu na ya gharama. Tunaamini kuwa matoleo yetu ya kulipia yana bei ya haki, na tunatumaini wewe pia utakubaliana nasi.

👉 [Linganisha Matoleo ya Beekeeper Studio](https://beekeeperstudio.io/pricing)

## Vipengele vya Beekeeper Studio

Sehemu bora zaidi: Ni laini 🍫, haraka 🏎, na kwa kweli utafurahia kuitumia 🥰

- Cross-platform kweli: Windows, MacOS, na Linux
- Kihariri cha SQL chenye autocomplete na syntax highlighting
- Interface yenye tabs ili uweze kufanya kazi nyingi kwa wakati mmoja
- Panga na chuja data za jedwali (table data) ili kupata unachohitaji hasa
- Njia za mkato za kibodi (keyboard shortcuts) zenye mantiki
- Hifadhi queries kwa matumizi ya baadaye
- Historia ya utekelezaji wa queries, ili uweze kupata ile query iliyofanya kazi siku 3 zilizopita
- Dark theme nzuri sana
- Import/Export
- Backup/Restore
- Angalia data kama JSON
- Na mengine mengi

## Mtazamo Wetu wa UX

Moja ya mambo yanayotukera kuhusu vihariri vingine vya SQL na vidhibiti vya kazidata vya open source ni kwamba vinachukua mtazamo wa "kutupa kila kitu ndani", vikiongeza vipengele vingi mno hadi interface inakuwa fujo na ngumu kutumia. Tulitaka mazingira ya SQL ya open source yenye muonekano mzuri, yenye nguvu lakini pia rahisi kutumia. Hatukuweza kupata, kwa hivyo tukatengeneza Beekeeper Studio!

Kwa ujumla, dira yetu kuu ni kujenga software ambayo "inajisikia vizuri" unapoitumia. Hiyo inamaanisha, kwa kiwango cha chini kabisa, tunathamini Beekeeper kuwa haraka, rahisi kutumia, na ya kisasa. Ikiwa kipengele kipya kinaathiri dira hii, tunakiondoa.


## Kuunga Mkono Beekeeper Studio

Tunapenda kufanya kazi kwenye Beekeeper Studio, na tungependa kuendelea kuikuza na kuiboresha milele. Kwa hilo tunahitaji msaada wako.

Njia bora ya kuunga mkono Beekeeper Studio ni kununua [leseni](https://beekeeperstudio.io/pricing) ya kulipia. Kila ununuzi unasaidia moja kwa moja kazi yetu kwenye Beekeeper Studio.

Ikiwa uko kwenye kampuni na unatumia Beekeeper Studio kwa kazi yako, labda unapaswa kumwomba bosi wako [akununulie leseni](https://beekeeperstudio.io/pricing).

Ikiwa huwezi kumudu leseni, tafadhali tumia toleo la bure — kwa hilo ndio tunalitengeneza!

Asante kwa msaada wako wa kudumu!


## Nyaraka (Documentation)

Tembelea [docs.beekeeperstudio.io](https://docs.beekeeperstudio.io) kwa miongozo ya watumiaji, maswali yanayoulizwa mara kwa mara (FAQ), vidokezo vya utatuzi wa matatizo (troubleshooting), na zaidi.

## Leseni

Beekeeper Studio Community Edition (code iliyo kwenye repo hii) ina leseni ya GPLv3.

Beekeeper Studio Ultimate Edition ina vipengele vya ziada na ina leseni ya [makubaliano ya kibiashara ya leseni ya mtumiaji wa mwisho (EULA)](https://beekeeperstudio.io/legal/commercial-eula/).

Alama za biashara za Beekeeper Studio (majina na nembo/logos) sio open source. Angalia [miongozo yetu ya alama za biashara](https://beekeeperstudio.io/legal/trademark/) kwa maelezo zaidi.

## Miongozo ya Alama za Biashara (Trademark Guidelines)

Alama za biashara zinaweza kuwa ngumu kwa miradi ya open source, kwa hivyo tumepitisha seti ya miongozo ya kawaida kuhusu matumizi ya alama zetu ambayo ni ya kawaida katika miradi mingi ya open source.

Ikiwa unatumia tu programu ya Beekeeper Studio, na hufanyi fork au kusambaza code ya Beekeeper Studio kwa njia yoyote, hizi labda hazikuhusu wewe.

👉 [Miongozo ya Alama za Biashara ya Beekeeper Studio](https://beekeeperstudio.io/legal/trademark/)

## Kuchangia (Contributing) kwenye Beekeeper Studio

Tunapenda ushiriki *wowote* kutoka kwa jamii. Hata kama unalalamika kwa sababu hukupendi kitu fulani kwenye programu!


### Makubaliano ya Wachangiaji (Contributor Agreements)

- Kujenga jamii yenye ushirikishwaji na ukaribishaji ni muhimu kwetu, hivyo tafadhali fuata [kanuni zetu za maadili](code_of_conduct.md) unaposhiriki kwenye mradi.

- Kwa kuchangia kwenye mradi, unakubali masharti ya [miongozo yetu ya uchangiaji](CONTRIBUTING.md).

### Kuchangia Bila Kuandika Code

Tumekufunika, soma [mwongozo wetu wa dakika 10 wa kuchangia bila kuandika code](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

### Ku-compile na Kuendesha Beekeeper Studio kwa Mtaa (Locally)

Unataka kuandika code na kuboresha Beekeeper Studio? Kuweka mazingira ni rahisi kwenye Mac, Linux, au Windows.

```bash
# Kwanza: Sakinisha NodeJS 20, NPM, na Yarn
# ...

# 1. Fanya fork ya repo ya Beekeeper Studio (bofya kitufe cha fork juu kulia mwa skrini hii)
# 2. Clone fork yako:
git clone git@github.com:<jina-lako>/beekeeper-studio.git beekeeper-studio
cd beekeeper-studio/
yarn install # sakinisha dependencies


# Sasa unaweza kuanzisha programu:
yarn run electron:serve ## programu itaanza
```

**Ukipata `error:03000086:digital envelope routines::initialization error`, utahitaji ku-update openssl.**

- Kwenye Ubuntu/Debian:
```
sudo apt-get update
sudo apt-get upgrade openssl
```

- Kwenye CentOS/RHEL:
```
sudo yum update openssl
```

- Kwenye macOS (kwa kutumia Homebrew):
```
brew update
brew upgrade openssl
```

### Wapi kufanya mabadiliko?

Repo hii sasa ni monorepo, tuna sehemu kadhaa zenye code, lakini kuna sehemu chache tu muhimu za kuingilia (entry points).

Code yote ya programu iko kwenye `apps/studio`, na baadhi ya code inayoshirikiwa iko kwenye `shared/src`. Hii inashirikiwa na programu nyingine.

Beekeeper Studio ina entry points mbili:
- `background.js` - hii ni code ya upande wa Electron inayodhibiti mambo ya asili (native) kama kuonyesha madirisha (windows).
- `main.js` - hii ndio entry point kwa programu ya Vue.js. Unaweza kufuata nyayo za components za Vue kutoka `App.vue` kupata screen unayohitaji.

**Kwa kawaida tuna 'skrini' mbili:**
- ConnectionInterface - kuunganisha kwenye DB
- CoreInterface - kuingiliana na kazidata

### Jinsi ya Kutuma Mabadiliko (Change)?


- Push mabadiliko yako kwenye repo yako na fungua Pull Request kutoka kwenye ukurasa wetu wa GitHub (ukurasa huu)
- Hakikisha unaandika maelezo kuhusu kinachofanya mabadiliko yako! Gif inakaribishwa kila wakati kwa mabadiliko ya kuonekana (visual).

## Maelezo kwa Maintainers (wasomaji wa kawaida wanaweza kuruka hii)

### Mambo ya Kuzingatia Wakati wa Ku-update Electron

Hii kila wakati ni maumivu kamili na itavunja build mara 9 kati ya 10.

Baadhi ya mambo unayopaswa kuzingatia unapo-update Electron:

1. Je, inatumia toleo tofauti la node? Kwa mfano, Electron-18 inatumia node 14, 22 inatumia node 16. Kwa hivyo wote wanahitaji kusasishwa
2. Je, node-abi inahitaji kusasishwa ili iweze kuelewa toleo la Electron? Hii inatumika kwenye build kupata packages zilizokwisha-compile. Unahitaji ku-update hii kwenye root/package.json#resolutions
3. Je, baadhi ya APIs zimeondolewa au kupitwa na wakati (deprecated)? Hakikisha functions zote zinazoingiliana na Electron APIs bado zinafanya kazi, mambo kama - kuchagua faili, ku-maximize dirisha, kutekeleza query, n.k.


### Mchakato wa Kutoa Toleo (Release Process)

1. Ongeza namba ya toleo (version) kwenye package.json
2. Badilisha `build/release-notes.md` na maelezo mapya ya toleo. Fuata muundo ulioko humo.
  - endesha `git log <last-tag>..HEAD --oneline | grep 'Merge pull'` kupata PRs zilizounganishwa (merged)
2. Commit
3. Push kwenye master
4. Tengeneza tag `git tag v<version>`. Lazima ianze na 'v'
5. `git push origin <tagname>`
  - Sasa subiri action ya build/publish kwenye Github ikamilike
6. Chapisha toleo jipya
  - Nenda kwenye toleo jipya la 'draft' kwenye tab ya releases ya GitHub, hariri maelezo, chapisha
  - Ingia kwenye snapcraft.io, buruta toleo lililopakiwa kwenda kwenye channel ya 'stable' kwa kila architecture.

Hii pia inapaswa kuchapisha nyaraka (documentation) za hivi karibuni

Baada ya Kutoa Toleo:
1. Nakili maelezo ya toleo kwenye blog post, chapisha kwenye tovuti
2. Tweet link
3. Shiriki kwenye LinkedIn
4. Tuma kwenye mailing list kwenye SendInBlue


## Shukrani Kubwa

Beekeeper Studio isingekuwepo bila [Sqlectron-core](https://github.com/sqlectron/sqlectron-core), maktaba kuu za kazidata (core database libraries) za [mradi wa Sqlectron](https://github.com/sqlectron/sqlectron-gui). Beekeeper Studio ilianza kama fork ya majaribio ya repo hiyo. Shukrani kubwa kwa @maxcnunes na wengine wa jamii ya Sqlectron.

Leseni asili ya sqlectron-core imejumuishwa hapa:

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