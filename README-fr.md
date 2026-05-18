<!-- Target languages: ["en", "pt-BR", "es", "de", "fr", "el", "ja", "it", "ko", "id"] -->
🌐 [EN](README.md) | [ES](README-es.md) | [PT-BR](README.pt-br.md) | [DE](README-de.md) | [EL](README-el.md) | [JA](README-ja.md) | [IT](README-it.md) | [KO](README-ko.md) | [ID](README-id.md)

# Beekeeper Studio

Beekeeper Studio est un éditeur SQL et gestionnaire de bases de données multiplateforme disponible pour Linux, Mac et Windows.

[Télécharger Beekeeper Studio](https://beekeeperstudio.io/get-community)

Nous publions des binaires pour MacOS, Windows et Linux.

[![image](https://user-images.githubusercontent.com/279769/203650152-4a34af1f-8a38-47cf-a273-d34d1c84feeb.png)](https://beekeeperstudio.io/get)


Beekeeper Studio est gratuit à télécharger et offre de nombreuses fonctionnalités gratuitement, sans inscription, enregistrement ou carte de crédit. L'application propose certaines fonctionnalités premium pour un prix de licence raisonnable. [En savoir plus ici](https://beekeeperstudio.io/pricing)


La plupart du code de ce dépôt est open source sous licence GPLv3. Les fonctionnalités payantes sont également dans ce dépôt sous une licence commerciale à code source disponible.

Les contributions de la communauté sont les bienvenues !


## Bases de données prises en charge

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

## Éditions de Beekeeper Studio

Beekeeper Studio est un téléchargement unique avec des mises à niveau intégrées pour les fonctionnalités premium.

Nous aimerions rendre Beekeeper Studio totalement gratuit pour tous, mais développer un bon logiciel est un travail difficile et coûteux. Nous pensons que nos éditions payantes sont proposées à un prix équitable, et nous espérons que vous pensez de même.

👉 [Comparer les éditions de Beekeeper Studio](https://beekeeperstudio.io/pricing)

## Fonctionnalités de Beekeeper Studio

Fonctionnalité principale : C'est fluide 🍫, rapide 🏎, et vous allez vraiment apprécier l'utiliser 🥰

- Vraiment multiplateforme : Windows, MacOS et Linux
- Éditeur de requêtes SQL avec autocomplétion et coloration syntaxique
- Interface à onglets pour le multitâche
- Trier et filtrer les données des tables pour trouver exactement ce dont vous avez besoin
- Raccourcis clavier sensés
- Sauvegarder les requêtes pour plus tard
- Historique d'exécution des requêtes, pour retrouver cette requête qui fonctionnait il y a 3 jours
- Excellent thème sombre
- Import/export
- Sauvegarde/restauration
- Voir les données en JSON
- Et bien plus encore

## Notre approche UX

L'une de nos frustrations avec les autres éditeurs SQL et gestionnaires de bases de données open source est qu'ils adoptent une approche "fourre-tout" pour les fonctionnalités, ajoutant tellement de fonctionnalités que l'interface devient encombrée et difficile à naviguer. Nous voulions un environnement SQL open source beau, puissant, mais aussi facile à utiliser. Nous n'en avons pas trouvé, alors nous avons créé Beekeeper Studio !

Généralement, notre étoile guide est de ne construire que des logiciels qui sont "agréables" à utiliser. Cela signifie qu'au minimum, nous valorisons que Beekeeper soit rapide, simple à utiliser et moderne. Si une nouvelle fonctionnalité compromet cette vision, nous l'abandonnons.


## Soutenir Beekeeper Studio

Nous adorons travailler sur Beekeeper Studio, et nous aimerions continuer à le développer et l'améliorer pour toujours. Pour cela, nous avons besoin de votre aide.

La meilleure façon de soutenir Beekeeper Studio est d'acheter une [licence](https://beekeeperstudio.io/pricing) payante. Chaque achat soutient directement notre travail sur Beekeeper Studio.

Si vous êtes dans une entreprise et utilisez Beekeeper Studio pour votre travail, vous devriez probablement demander à votre patron de vous [acheter une licence](https://beekeeperstudio.io/pricing).

Si vous ne pouvez pas vous permettre une licence, veuillez utiliser la version gratuite, c'est pourquoi nous proposons une version gratuite !

Merci pour votre soutien continu !


## Documentation

Consultez [docs.beekeeperstudio.io](https://docs.beekeeperstudio.io) pour les guides utilisateur, FAQ, conseils de dépannage, et plus encore.

## Licence

Beekeeper Studio Community Edition (le code de ce dépôt) est sous licence GPLv3.

Beekeeper Studio Ultimate Edition contient des fonctionnalités supplémentaires et est sous [accord de licence utilisateur final commercial (EULA)](https://beekeeperstudio.io/legal/commercial-eula/).

Les marques de Beekeeper Studio (marques verbales et logos) ne sont pas open source. Consultez nos [directives sur les marques](https://beekeeperstudio.io/legal/trademark/) pour plus d'informations.

## Directives sur les marques

Les marques peuvent être compliquées avec les projets open source, nous avons donc adopté un ensemble de directives standard pour l'utilisation de nos marques qui sont communes à de nombreux projets open source.

Si vous utilisez simplement l'application Beekeeper Studio et que vous ne forkez pas ou ne distribuez pas le code de Beekeeper Studio de quelque manière que ce soit, ces directives ne s'appliquent probablement pas à vous.

👉 [Directives sur les marques de Beekeeper Studio](https://beekeeperstudio.io/legal/trademark/)

## Contribuer à Beekeeper Studio

Nous aimons *tout* engagement de la communauté. Même si vous vous plaignez parce que vous n'aimez pas quelque chose dans l'application !


### Accords des contributeurs

- Construire une communauté inclusive et accueillante est important pour nous, alors veuillez suivre notre [code de conduite](code_of_conduct.md) lorsque vous participez au projet.

- En contribuant au projet, vous acceptez les termes de nos [directives de contribution](CONTRIBUTING.md).

### Contribuer sans coder

Nous avons ce qu'il vous faut, lisez notre [guide pour contribuer en 10 minutes sans coder](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

### Compiler et exécuter Beekeeper Studio localement

Vous voulez écrire du code et améliorer Beekeeper Studio ? La configuration est facile sur Mac, Linux ou Windows.

```bash
# D'abord : Installez NodeJS 20, NPM et Yarn
# ...

# 1. Forkez le dépôt Beekeeper Studio (cliquez sur le bouton fork en haut à droite de cet écran)
# 2. Clonez votre fork :
git clone git@github.com:<votre-nom-utilisateur>/beekeeper-studio.git beekeeper-studio
cd beekeeper-studio/
yarn install # installe les dépendances


# Maintenant vous pouvez démarrer l'application :
yarn run electron:serve ## l'application va maintenant démarrer
```

**Si vous obtenez `error:03000086:digital envelope routines::initialization error`, vous devrez mettre à jour openssl.**

- Sur Ubuntu/Debian :
```
sudo apt-get update
sudo apt-get upgrade openssl
```

- Sur CentOS/RHEL :
```
sudo yum update openssl
```

- Sur macOS (avec Homebrew) :
```
brew update
brew upgrade openssl
```

### Où faire les modifications ?

Ce dépôt est maintenant un monorepo, nous avons plusieurs endroits avec du code, mais seulement quelques points d'entrée importants.

Tout le code de l'application se trouve dans `apps/studio`, du code partagé se trouve dans `shared/src`. Celui-ci est partagé avec d'autres applications.

Beekeeper Studio a deux points d'entrée :
- `background.js` - c'est le code côté Electron qui contrôle les choses natives comme l'affichage des fenêtres.
- `main.js` - c'est le point d'entrée de l'application Vue.js. Vous pouvez suivre le fil d'Ariane des composants Vue depuis `App.vue` pour trouver l'écran dont vous avez besoin.

**Généralement nous avons deux 'écrans' :**
- ConnectionInterface - connexion à une BD
- CoreInterface - interaction avec une base de données

### Comment soumettre une modification ?


- Poussez vos modifications vers votre dépôt et ouvrez une Pull Request depuis notre page GitHub (cette page)
- Assurez-vous d'écrire quelques notes sur ce que fait votre modification ! Un gif est toujours bienvenu pour les changements visuels.

## Notes pour les mainteneurs (les lecteurs occasionnels peuvent ignorer ceci)

### Considérations pour la mise à jour d'Electron

C'est toujours très pénible et ça va casser le build 9 fois sur 10.

Quelques points à considérer lors de la mise à jour d'Electron :

1. Utilise-t-il une version de node différente ? Ex : Electron-18 utilise node 14, 22 utilise node 16. Donc tout le monde doit mettre à jour
2. Est-ce que node-abi doit être mis à jour pour comprendre la version d'Electron ? Ceci est utilisé dans le build pour récupérer les packages précompilés. Vous devez mettre à jour cela dans root/package.json#resolutions
3. Des APIs ont-elles été dépréciées ou supprimées ? Assurez-vous que toutes les fonctionnalités qui interagissent avec les APIs Electron fonctionnent toujours, des choses comme - sélectionner un fichier, maximiser une fenêtre, exécuter une requête, etc.


### Processus de release

1. Augmentez le numéro de version dans package.json
2. Remplacez `build/release-notes.md` par les dernières notes de release. Suivez le format existant.
  - exécutez `git log <last-tag>..HEAD --oneline | grep 'Merge pull'` pour trouver les PRs fusionnées
2. Commit
3. Push vers master
4. Créez un tag `git tag v<version>`. Il doit commencer par 'v'
5. `git push origin <tagname>`
  - Attendez maintenant que l'action build/publish soit terminée sur Github
6. Publiez la nouvelle release
  - Allez sur la nouvelle release 'brouillon' dans l'onglet releases de GitHub, éditez les notes, publiez
  - Connectez-vous à snapcraft.io, faites glisser la release uploadée vers le canal 'stable' pour chaque architecture.

Ceci devrait également publier la documentation la plus récente

Après la release :
1. Copiez les notes de release dans un article de blog, publiez sur le site web
2. Tweet du lien
3. Partagez sur LinkedIn
4. Envoyez à la liste de diffusion sur SendInBlue


## Un grand merci

Beekeeper Studio n'existerait pas sans [Sqlectron-core](https://github.com/sqlectron/sqlectron-core), les bibliothèques de base de données principales du [projet Sqlectron](https://github.com/sqlectron/sqlectron-gui). Beekeeper Studio a commencé comme un fork expérimental de ce dépôt. Un grand merci à @maxcnunes et au reste de la communauté Sqlectron.

La licence originale de sqlectron-core est incluse ici :

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
