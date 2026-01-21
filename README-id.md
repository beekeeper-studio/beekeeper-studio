<!-- Target languages: ["en", "pt-BR", "es", "de", "fr", "el", "ja", "it", "ko", "id"] -->
🌐 [EN](README.md) | [ES](README-es.md) | [PT-BR](README.pt-br.md) | [DE](README-de.md) | [FR](README-fr.md) | [EL](README-el.md) | [JA](README-ja.md) | [IT](README-it.md) | [KO](README-ko.md)

# Beekeeper Studio

Beekeeper Studio adalah editor SQL dan manajer database lintas platform yang tersedia untuk Linux, Mac, dan Windows.

[Unduh Beekeeper Studio](https://beekeeperstudio.io/get-community)

Kami menerbitkan binary untuk MacOS, Windows, dan Linux.

[![image](https://user-images.githubusercontent.com/279769/203650152-4a34af1f-8a38-47cf-a273-d34d1c84feeb.png)](https://beekeeperstudio.io/get)


Beekeeper Studio gratis untuk diunduh dan menyediakan banyak fitur secara gratis, tanpa pendaftaran, registrasi, atau kartu kredit. Aplikasi ini menyediakan beberapa fitur premium dengan harga lisensi yang wajar. [Pelajari lebih lanjut di sini](https://beekeeperstudio.io/pricing)


Sebagian besar kode di repositori ini adalah open source di bawah lisensi GPLv3. Fitur berbayar juga ada di repositori ini di bawah lisensi komersial source-available.

Kami menyambut kontribusi dari komunitas!


## Database yang Didukung

<!-- Don't edit this, it gets built automatically from docs/includes/supported_databases.md -->
<!-- SUPPORT_BEGIN -->

| Database                                                 | Dukungan                     | Community | Edisi Berbayar |                             Link Beekeeper |
| :------------------------------------------------------- | :--------------------------- | :-------: | :------: | -----------------------------------------: |
| [PostgreSQL](https://postgresql.org)                     | ⭐ Dukungan Penuh            |    ✅     |    ✅    |  [Fitur](https://beekeeperstudio.io/db/postgres-client) |
| [MySQL](https://www.mysql.com/)                          | ⭐ Dukungan Penuh            |    ✅     |    ✅    |  [Fitur](https://beekeeperstudio.io/db/mysql-client)|
| [SQLite](https://sqlite.org)                             | ⭐ Dukungan Penuh            |    ✅     |    ✅    |   [Fitur](https://beekeeperstudio.io/db/sqlite-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/sqlite) |
| [SQL Server](https://www.microsoft.com/en-us/sql-server) | ⭐ Dukungan Penuh            |    ✅     |    ✅    |   [Fitur](https://beekeeperstudio.io/db/sql-server-client)  |
| [Amazon Redshift](https://aws.amazon.com/redshift/)      | ⭐ Dukungan Penuh            |    ✅     |    ✅    |    [Fitur](https://beekeeperstudio.io/db/redshift-client) |
| [CockroachDB](https://www.cockroachlabs.com/)            | ⭐ Dukungan Penuh            |    ✅     |    ✅    | [Fitur](https://beekeeperstudio.io/db/cockroachdb-client)|
| [MariaDB](https://mariadb.org/)                          | ⭐ Dukungan Penuh            |    ✅     |    ✅    |     [Fitur](https://beekeeperstudio.io/db/mariadb-client) |
| [TiDB](https://pingcap.com/products/tidb/)               | ⭐ Dukungan Penuh            |    ✅     |    ✅    |        [Fitur](https://beekeeperstudio.io/db/tidb-client) |
| [Google BigQuery](https://cloud.google.com/bigquery)     | ⭐ Dukungan Penuh            |    ✅      |    ✅    |    [Fitur](https://beekeeperstudio.io/db/google-big-query-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/bigquery) |
| [Redis](https://redis.io/)                               | ⭐ Dukungan Penuh            |    ✅    |    ✅    |       [Fitur](https://www.beekeeperstudio.io/db/redis-client/) |
| [Oracle Database](https://www.oracle.com/database/)      | ⭐ Dukungan Penuh            |           |    ✅    |      [Fitur](https://beekeeperstudio.io/db/oracle-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/oracle) |
| [Cassandra](http://cassandra.apache.org/)                | ⭐ Dukungan Penuh            |           |    ✅    |   [Fitur](https://beekeeperstudio.io/db/cassandra-client) |
| [Firebird](https://firebirdsql.org/)                     | ⭐ Dukungan Penuh            |           |    ✅    |    [Fitur](https://beekeeperstudio.io/db/firebird-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/firebird) |
| [LibSQL](https://libsql.org/)                            | ⭐ Dukungan Penuh            |          |    ✅    |      [Fitur](https://beekeeperstudio.io/db/libsql-client) |
| [ClickHouse](https://clickhouse.tech/)                   | ⭐ Dukungan Penuh            |         |    ✅    |  [Fitur](https://www.beekeeperstudio.io/db/clickhouse-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/clickhouse) |
| [DuckDB](https://duckdb.org/)                            | ⭐ Dukungan Penuh            |         |    ✅    |      [Fitur](https://www.beekeeperstudio.io/db/duckdb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/duckdb) |
| [SQL Anywhere](https://www.sap.com/products/technology-platform/sql-anywhere.html)  | ⭐ Dukungan Penuh    |           |    ✅    |      [Fitur](https://www.beekeeperstudio.io/db/sql-anywhere-client/) |
| [MongoDB](https://www.mongodb.com/)                      | ⭐ Dukungan Penuh            |          |    ✅    |     [Fitur](https://www.beekeeperstudio.io/db/mongodb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/mongodb) |
| [Trino](https://trino.io/) / [Presto](https://prestodb.io/) | ⭐ Dukungan Penuh         |           |    ✅    |    [Fitur](https://www.beekeeperstudio.io/db/trino-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/trino/) |
| [Snowflake](https://www.snowflake.com/)                  | ⏳ Segera Hadir              |           |    ✅    |   -- |
| [DynamoDB](https://aws.amazon.com/dynamodb/)             | 🗓️ Direncanakan             |           |    ✅    |       -- |




<!-- SUPPORT_END -->

## Edisi Beekeeper Studio

Beekeeper Studio adalah unduhan tunggal dengan upgrade dalam aplikasi untuk fitur premium.

Kami ingin membuat Beekeeper Studio sepenuhnya gratis untuk semua orang, tetapi membangun perangkat lunak yang baik adalah pekerjaan yang sulit dan mahal. Kami pikir edisi berbayar kami memiliki harga yang wajar, semoga Anda juga berpikir demikian.

👉 [Bandingkan Edisi Beekeeper Studio](https://beekeeperstudio.io/pricing)

## Fitur Beekeeper Studio

Fitur unggulan: Halus 🍫, cepat 🏎, dan Anda akan benar-benar menikmati menggunakannya 🥰

- Benar-benar lintas platform: Windows, MacOS, dan Linux
- Editor query SQL dengan autocomplete dan syntax highlighting
- Antarmuka tab untuk multitasking
- Urutkan dan filter data tabel untuk menemukan apa yang Anda butuhkan
- Shortcut keyboard yang masuk akal
- Simpan query untuk nanti
- Riwayat eksekusi query, sehingga Anda dapat menemukan query yang berhasil 3 hari lalu
- Tema gelap yang bagus
- Impor/ekspor
- Backup/restore
- Lihat data sebagai JSON
- Dan banyak lagi

## Pendekatan UX Kami

Salah satu frustrasi kami dengan editor SQL open source dan manajer database lainnya adalah mereka mengambil pendekatan 'masukkan semuanya' terhadap fitur, menambahkan begitu banyak fitur sehingga UI menjadi berantakan dan sulit dinavigasi. Kami menginginkan workbench SQL open source yang terlihat bagus, powerful, tetapi juga mudah digunakan. Kami tidak dapat menemukannya, jadi kami membuat Beekeeper Studio!

Secara umum pedoman kami adalah hanya membangun perangkat lunak yang 'terasa nyaman' digunakan. Itu berarti minimal kami menghargai Beekeeper yang cepat, mudah digunakan, dan modern. Jika fitur baru membahayakan visi ini, kami menghapusnya.


## Mendukung Beekeeper Studio

Kami senang bekerja pada Beekeeper Studio, dan kami ingin terus mengembangkan dan memperbaikinya selamanya. Untuk melakukan itu kami membutuhkan bantuan Anda.

Cara terbaik untuk mendukung Beekeeper Studio adalah membeli [lisensi](https://beekeeperstudio.io/pricing) berbayar. Setiap pembelian langsung mendukung pekerjaan kami pada Beekeeper Studio.

Jika Anda berada di perusahaan dan menggunakan Beekeeper Studio untuk pekerjaan Anda, Anda mungkin harus meminta atasan Anda untuk [membeli lisensi](https://beekeeperstudio.io/pricing).

Jika Anda tidak mampu membeli lisensi, silakan gunakan versi gratis, itulah mengapa kami membuat versi gratis!

Terima kasih atas dukungan berkelanjutan Anda!


## Dokumentasi

Kunjungi [docs.beekeeperstudio.io](https://docs.beekeeperstudio.io) untuk panduan pengguna, FAQ, tips troubleshooting, dan lainnya.

## Lisensi

Beekeeper Studio Community Edition (kode di repositori ini) dilisensikan di bawah lisensi GPLv3.

Beekeeper Studio Ultimate Edition berisi fitur tambahan dan dilisensikan di bawah [perjanjian lisensi pengguna akhir komersial (EULA)](https://beekeeperstudio.io/legal/commercial-eula/).

Merek dagang Beekeeper Studio (word mark dan logo) bukan open source. Lihat [pedoman merek dagang](https://beekeeperstudio.io/legal/trademark/) kami untuk informasi lebih lanjut.

## Pedoman Merek Dagang

Merek dagang bisa rumit dengan proyek open source, jadi kami telah mengadopsi serangkaian pedoman standar untuk penggunaan merek kami yang umum di banyak proyek open source.

Jika Anda hanya menggunakan aplikasi Beekeeper Studio, dan tidak melakukan fork atau mendistribusikan kode Beekeeper Studio dengan cara apa pun, ini mungkin tidak berlaku untuk Anda.

👉 [Pedoman Merek Dagang Beekeeper Studio](https://beekeeperstudio.io/legal/trademark/)

## Berkontribusi pada Beekeeper Studio

Kami menyukai *segala* keterlibatan komunitas. Bahkan jika Anda mengeluh karena tidak menyukai sesuatu tentang aplikasi!


### Perjanjian Kontributor

- Membangun komunitas yang inklusif dan ramah penting bagi kami, jadi harap ikuti [kode etik](code_of_conduct.md) kami saat Anda terlibat dengan proyek.

- Dengan berkontribusi pada proyek Anda menyetujui ketentuan [pedoman kontributor](CONTRIBUTING.md) kami.

### Berkontribusi tanpa coding

Kami siap membantu, baca [panduan berkontribusi dalam 10 menit tanpa coding](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

### Mengompilasi dan Menjalankan Beekeeper Studio Secara Lokal

Ingin menulis kode dan memperbaiki Beekeeper Studio? Pengaturannya mudah di Mac, Linux, atau Windows.

```bash
# Pertama: Instal NodeJS 20, NPM, dan Yarn
# ...

# 1. Fork Repositori Beekeeper Studio (klik tombol fork di kanan atas layar ini)
# 2. Checkout fork Anda:
git clone git@github.com:<username-anda>/beekeeper-studio.git beekeeper-studio
cd beekeeper-studio/
yarn install # menginstal dependensi


# Sekarang Anda dapat memulai aplikasi:
yarn run electron:serve ## aplikasi akan mulai berjalan
```

**Jika Anda mendapat `error:03000086:digital envelope routines::initialization error`, Anda perlu mengupdate openssl.**

- Di Ubuntu/Debian:
```
sudo apt-get update
sudo apt-get upgrade openssl
```

- Di CentOS/RHEL:
```
sudo yum update openssl
```

- Di macOS (menggunakan Homebrew):
```
brew update
brew upgrade openssl
```

### Di mana membuat perubahan?

Repositori ini sekarang adalah monorepo, kami memiliki beberapa tempat dengan kode, tetapi hanya beberapa entry point penting.

Semua kode aplikasi ada di `apps/studio`, beberapa kode bersama ada di `shared/src`. Ini dibagikan dengan aplikasi lain.

Beekeeper Studio memiliki dua entry point:
- `background.js` - ini adalah kode sisi Electron yang mengontrol hal-hal native seperti menampilkan jendela.
- `main.js` - ini adalah entry point untuk aplikasi Vue.js. Anda dapat mengikuti breadcrumb komponen Vue dari `App.vue` untuk menemukan layar yang Anda butuhkan.

**Secara umum kami memiliki dua 'layar':**
- ConnectionInterface - menghubungkan ke DB
- CoreInterface - berinteraksi dengan database

### Bagaimana cara mengirimkan perubahan?


- Push perubahan Anda ke repositori Anda dan buka Pull Request dari halaman GitHub kami (halaman ini)
- Pastikan untuk menulis beberapa catatan tentang apa yang dilakukan perubahan Anda! Gif selalu diterima untuk perubahan visual.

## Catatan Maintainer (pembaca biasa dapat mengabaikan ini)

### Pertimbangan Upgrade Electron

Ini selalu sangat menyakitkan dan akan merusak build 9 dari 10 kali.

Beberapa hal yang perlu dipertimbangkan saat mengupgrade Electron:

1. Apakah menggunakan versi node yang berbeda? Mis. Electron-18 menggunakan node 14, 22 menggunakan node 16. Jadi semua orang perlu mengupgrade
2. Apakah node-abi perlu diupgrade agar dapat memahami versi Electron? Ini digunakan dalam build untuk mengambil paket prebuilt. Anda perlu mengupdate ini di root/package.json#resolutions
3. Apakah ada API yang deprecated atau dihapus? Pastikan semua fitur yang berinteraksi dengan API Electron masih berfungsi, hal-hal seperti - memilih file, memaksimalkan jendela, menjalankan query, dll.


### Proses Release

1. Naikkan nomor versi di package.json
2. Ganti `build/release-notes.md` dengan catatan release terbaru. Ikuti format yang ada.
  - jalankan `git log <last-tag>..HEAD --oneline | grep 'Merge pull'` untuk menemukan PR yang di-merge
2. Commit
3. Push ke master
4. Buat tag `git tag v<version>`. Harus dimulai dengan 'v'
5. `git push origin <tagname>`
  - Sekarang tunggu action build/publish selesai di Github
6. Publikasikan release baru
  - Pergi ke release 'draft' baru di tab releases GitHub, edit catatan, publikasikan
  - Login ke snapcraft.io, seret release yang diupload ke channel 'stable' untuk setiap arsitektur.

Ini juga harus mempublikasikan dokumentasi terbaru

Pasca Release:
1. Salin catatan release ke posting blog, publikasikan di website
2. Tweet linknya
3. Bagikan di LinkedIn
4. Kirim ke mailing list di SendInBlue


## Terima Kasih Banyak

Beekeeper Studio tidak akan ada tanpa [Sqlectron-core](https://github.com/sqlectron/sqlectron-core), library database inti dari [proyek Sqlectron](https://github.com/sqlectron/sqlectron-gui). Beekeeper Studio dimulai sebagai fork eksperimental dari repositori itu. Terima kasih banyak kepada @maxcnunes dan komunitas Sqlectron lainnya.

Lisensi asli dari sqlectron-core disertakan di sini:

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
