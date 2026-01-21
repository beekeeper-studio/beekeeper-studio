<!-- Target languages: ["en", "pt-BR", "es", "de", "fr", "el", "ja", "it", "ko", "id"] -->
🌐 [EN](README.md) | [ES](README-es.md) | [PT-BR](README.pt-br.md) | [DE](README-de.md) | [FR](README-fr.md) | [EL](README-el.md) | [IT](README-it.md) | [KO](README-ko.md) | [ID](README-id.md)

# Beekeeper Studio

Beekeeper Studioは、Linux、Mac、Windows向けのクロスプラットフォームSQLエディタ＆データベースマネージャーです。

[Beekeeper Studioをダウンロード](https://beekeeperstudio.io/get-community)

MacOS、Windows、Linux用のバイナリを公開しています。

[![image](https://user-images.githubusercontent.com/279769/203650152-4a34af1f-8a38-47cf-a273-d34d1c84feeb.png)](https://beekeeperstudio.io/get)


Beekeeper Studioは無料でダウンロードでき、サインアップ、登録、クレジットカードなしで多くの機能を無料で提供しています。アプリは適正なライセンス料金でいくつかのプレミアム機能を提供しています。[詳細はこちら](https://beekeeperstudio.io/pricing)


このリポジトリのコードの大部分はGPLv3ライセンスのオープンソースです。有料機能もこのリポジトリにあり、商用ソースアベイラブルライセンスの下にあります。

コミュニティからの貢献を歓迎します！


## サポートされているデータベース

<!-- Don't edit this, it gets built automatically from docs/includes/supported_databases.md -->
<!-- SUPPORT_BEGIN -->

| データベース                                              | サポート                     | Community | 有料版 |                             Beekeeperリンク |
| :------------------------------------------------------- | :--------------------------- | :-------: | :------: | -----------------------------------------: |
| [PostgreSQL](https://postgresql.org)                     | ⭐ フルサポート              |    ✅     |    ✅    |  [機能](https://beekeeperstudio.io/db/postgres-client) |
| [MySQL](https://www.mysql.com/)                          | ⭐ フルサポート              |    ✅     |    ✅    |  [機能](https://beekeeperstudio.io/db/mysql-client)|
| [SQLite](https://sqlite.org)                             | ⭐ フルサポート              |    ✅     |    ✅    |   [機能](https://beekeeperstudio.io/db/sqlite-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/sqlite) |
| [SQL Server](https://www.microsoft.com/en-us/sql-server) | ⭐ フルサポート              |    ✅     |    ✅    |   [機能](https://beekeeperstudio.io/db/sql-server-client)  |
| [Amazon Redshift](https://aws.amazon.com/redshift/)      | ⭐ フルサポート              |    ✅     |    ✅    |    [機能](https://beekeeperstudio.io/db/redshift-client) |
| [CockroachDB](https://www.cockroachlabs.com/)            | ⭐ フルサポート              |    ✅     |    ✅    | [機能](https://beekeeperstudio.io/db/cockroachdb-client)|
| [MariaDB](https://mariadb.org/)                          | ⭐ フルサポート              |    ✅     |    ✅    |     [機能](https://beekeeperstudio.io/db/mariadb-client) |
| [TiDB](https://pingcap.com/products/tidb/)               | ⭐ フルサポート              |    ✅     |    ✅    |        [機能](https://beekeeperstudio.io/db/tidb-client) |
| [Google BigQuery](https://cloud.google.com/bigquery)     | ⭐ フルサポート              |    ✅      |    ✅    |    [機能](https://beekeeperstudio.io/db/google-big-query-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/bigquery) |
| [Redis](https://redis.io/)                               | ⭐ フルサポート              |    ✅    |    ✅    |       [機能](https://www.beekeeperstudio.io/db/redis-client/) |
| [Oracle Database](https://www.oracle.com/database/)      | ⭐ フルサポート              |           |    ✅    |      [機能](https://beekeeperstudio.io/db/oracle-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/oracle) |
| [Cassandra](http://cassandra.apache.org/)                | ⭐ フルサポート              |           |    ✅    |   [機能](https://beekeeperstudio.io/db/cassandra-client) |
| [Firebird](https://firebirdsql.org/)                     | ⭐ フルサポート              |           |    ✅    |    [機能](https://beekeeperstudio.io/db/firebird-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/firebird) |
| [LibSQL](https://libsql.org/)                            | ⭐ フルサポート              |          |    ✅    |      [機能](https://beekeeperstudio.io/db/libsql-client) |
| [ClickHouse](https://clickhouse.tech/)                   | ⭐ フルサポート              |         |    ✅    |  [機能](https://www.beekeeperstudio.io/db/clickhouse-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/clickhouse) |
| [DuckDB](https://duckdb.org/)                            | ⭐ フルサポート              |         |    ✅    |      [機能](https://www.beekeeperstudio.io/db/duckdb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/duckdb) |
| [SQL Anywhere](https://www.sap.com/products/technology-platform/sql-anywhere.html)  | ⭐ フルサポート    |           |    ✅    |      [機能](https://www.beekeeperstudio.io/db/sql-anywhere-client/) |
| [MongoDB](https://www.mongodb.com/)                      | ⭐ フルサポート              |          |    ✅    |     [機能](https://www.beekeeperstudio.io/db/mongodb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/mongodb) |
| [Trino](https://trino.io/) / [Presto](https://prestodb.io/) | ⭐ フルサポート           |           |    ✅    |    [機能](https://www.beekeeperstudio.io/db/trino-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/trino/) |
| [Snowflake](https://www.snowflake.com/)                  | ⏳ 近日公開                  |           |    ✅    |   -- |
| [DynamoDB](https://aws.amazon.com/dynamodb/)             | 🗓️ 計画中                   |           |    ✅    |       -- |




<!-- SUPPORT_END -->

## Beekeeper Studioのエディション

Beekeeper Studioは単一のダウンロードで、プレミアム機能へのアプリ内アップグレードが可能です。

Beekeeper Studioを完全に無料にしたいと思っていますが、良いソフトウェアを作ることは大変で費用がかかります。私たちの有料エディションは適正な価格だと考えています。

👉 [Beekeeper Studioエディションを比較](https://beekeeperstudio.io/pricing)

## Beekeeper Studioの機能

トップ機能：スムーズ 🍫、高速 🏎、そして本当に使うのが楽しい 🥰

- 真のクロスプラットフォーム：Windows、MacOS、Linux
- オートコンプリートとシンタックスハイライト付きSQLクエリエディタ
- マルチタスク用のタブインターフェース
- 必要なものを正確に見つけるためのテーブルデータのソートとフィルタ
- 使いやすいキーボードショートカット
- 後で使うためにクエリを保存
- クエリ実行履歴で3日前に動いたあのクエリを見つける
- 素晴らしいダークテーマ
- インポート/エクスポート
- バックアップ/リストア
- JSONとしてデータを表示
- その他多数

## UXへのアプローチ

他のオープンソースSQLエディタやデータベースマネージャーに対する不満の1つは、機能に対して「全部入り」のアプローチを取り、UIが乱雑でナビゲートしにくくなるほど多くの機能を追加していることです。パワフルでありながら使いやすい、見た目の良いオープンソースSQLワークベンチが欲しかったのです。見つからなかったので、Beekeeper Studioを作りました！

一般的に私たちの指針は「使い心地の良い」ソフトウェアだけを作ることです。つまり最低限、Beekeeperが高速で、使いやすく、モダンであることを重視しています。新機能がこのビジョンを損なう場合は、その機能を廃止します。


## Beekeeper Studioをサポート

Beekeeper Studioの開発が大好きで、永遠に成長させ改善し続けたいと思っています。そのためにはあなたの助けが必要です。

Beekeeper Studioをサポートする最良の方法は、有料[ライセンス](https://beekeeperstudio.io/pricing)を購入することです。すべての購入がBeekeeper Studioでの私たちの仕事を直接サポートします。

企業でBeekeeper Studioを仕事に使っている場合は、上司に[ライセンス購入](https://beekeeperstudio.io/pricing)をお願いすべきでしょう。

ライセンスを購入できない場合は、無料版をお使いください。そのために無料版を提供しています！

継続的なサポートをありがとうございます！


## ドキュメント

ユーザーガイド、FAQ、トラブルシューティングのヒントなどは[docs.beekeeperstudio.io](https://docs.beekeeperstudio.io)をご覧ください。

## ライセンス

Beekeeper Studio Community Edition（このリポジトリのコード）はGPLv3ライセンスです。

Beekeeper Studio Ultimate Editionは追加機能を含み、[商用エンドユーザーライセンス契約（EULA）](https://beekeeperstudio.io/legal/commercial-eula/)の下でライセンスされています。

Beekeeper Studioの商標（ワードマークとロゴ）はオープンソースではありません。詳細は[商標ガイドライン](https://beekeeperstudio.io/legal/trademark/)をご覧ください。

## 商標ガイドライン

オープンソースプロジェクトでは商標が複雑になることがあるため、多くのオープンソースプロジェクトで一般的な商標使用のための標準的なガイドラインを採用しています。

Beekeeper Studioアプリを使用するだけで、Beekeeper Studioのコードをフォークしたり配布したりしていない場合は、これらはおそらく適用されません。

👉 [Beekeeper Studio商標ガイドライン](https://beekeeperstudio.io/legal/trademark/)

## Beekeeper Studioへの貢献

*あらゆる*コミュニティの関与を歓迎します。アプリの何かが気に入らないという苦情でも！


### 貢献者契約

- 包括的で歓迎的なコミュニティを構築することは私たちにとって重要です。プロジェクトに参加する際は[行動規範](code_of_conduct.md)に従ってください。

- プロジェクトに貢献することで、[貢献ガイドライン](CONTRIBUTING.md)の条件に同意したことになります。

### コーディングなしで貢献

お任せください。[コーディングなしで10分で貢献するガイド](https://github.com/beekeeper-studio/beekeeper-studio/issues/287)をお読みください。

### Beekeeper Studioをローカルでコンパイル＆実行

コードを書いてBeekeeper Studioを改善したいですか？Mac、Linux、Windowsでセットアップは簡単です。

```bash
# まず：NodeJS 20、NPM、Yarnをインストール
# ...

# 1. Beekeeper Studioリポジトリをフォーク（画面右上のforkボタンをクリック）
# 2. フォークをチェックアウト：
git clone git@github.com:<あなたのユーザー名>/beekeeper-studio.git beekeeper-studio
cd beekeeper-studio/
yarn install # 依存関係をインストール


# これでアプリを起動できます：
yarn run electron:serve ## アプリが起動します
```

**`error:03000086:digital envelope routines::initialization error`が出た場合は、opensslを更新する必要があります。**

- Ubuntu/Debianの場合：
```
sudo apt-get update
sudo apt-get upgrade openssl
```

- CentOS/RHELの場合：
```
sudo yum update openssl
```

- macOSの場合（Homebrewを使用）：
```
brew update
brew upgrade openssl
```

### どこを変更すればいいですか？

このリポジトリは現在モノレポです。コードは複数の場所にありますが、重要なエントリーポイントは数か所だけです。

すべてのアプリコードは`apps/studio`にあり、共有コードは`shared/src`にあります。これは他のアプリと共有されています。

Beekeeper Studioには2つのエントリーポイントがあります：
- `background.js` - これはウィンドウの表示などのネイティブな処理を制御するElectron側のコードです。
- `main.js` - これはVue.jsアプリのエントリーポイントです。`App.vue`からVueコンポーネントのパンくずリストをたどって必要な画面を見つけることができます。

**一般的に2つの「画面」があります：**
- ConnectionInterface - DBへの接続
- CoreInterface - データベースとのやり取り

### 変更を提出する方法


- あなたのリポジトリに変更をプッシュし、GitHubページ（このページ）からPull Requestを開いてください
- 変更内容についてメモを書いてください！視覚的な変更にはgifが歓迎されます。

## メンテナーノート（一般の読者は無視してください）

### Electronアップグレードの注意点

これは常に大変で、10回中9回はビルドが壊れます。

Electronをアップグレードする際に考慮すべき点：

1. 異なるnodeバージョンを使用していますか？例：Electron-18はnode 14を使用、22はnode 16を使用。したがって全員がアップグレードする必要があります
2. node-abiをアップグレードしてElectronバージョンを理解できるようにする必要がありますか？これはビルドでプリビルトパッケージを取得するために使用されます。root/package.json#resolutionsでこれを更新する必要があります
3. APIが非推奨または削除されましたか？Electron APIと対話するすべての機能がまだ動作することを確認してください - ファイルの選択、ウィンドウの最大化、クエリの実行など。


### リリースプロセス

1. package.jsonのバージョン番号を上げる
2. `build/release-notes.md`を最新のリリースノートに置き換える。既存のフォーマットに従う。
  - `git log <last-tag>..HEAD --oneline | grep 'Merge pull'`を実行してマージされたPRを見つける
2. コミット
3. masterにプッシュ
4. タグを作成 `git tag v<version>`。'v'で始まる必要があります
5. `git push origin <tagname>`
  - Githubでbuild/publishアクションが完了するのを待つ
6. 新しいリリースを公開
  - GitHubのreleasesタブで新しい'draft'リリースに移動し、ノートを編集して公開
  - snapcraft.ioにログインし、アップロードされたリリースを各アーキテクチャの'stable'チャンネルにドラッグ

これにより最新のドキュメントも公開されるはずです

リリース後：
1. リリースノートをブログ投稿にコピーし、ウェブサイトに公開
2. リンクをツイート
3. LinkedInでシェア
4. SendInBlueのメーリングリストに送信


## 大きな感謝

Beekeeper Studioは[Sqlectron-core](https://github.com/sqlectron/sqlectron-core)なしには存在しませんでした。これは[Sqlectronプロジェクト](https://github.com/sqlectron/sqlectron-gui)のコアデータベースライブラリです。Beekeeper Studioはそのリポジトリの実験的なフォークとして始まりました。@maxcnunesとSqlectronコミュニティの皆さんに大きな感謝を。

sqlectron-coreのオリジナルライセンスはここに含まれています：

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
