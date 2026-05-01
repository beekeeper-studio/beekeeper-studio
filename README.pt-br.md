<!-- Target languages: ["en", "pt-BR", "es", "de", "fr", "el", "ja", "it", "ko", "id"] -->
🌐 [EN](README.md) | [ES](README-es.md) | [DE](README-de.md) | [FR](README-fr.md) | [EL](README-el.md) | [JA](README-ja.md) | [IT](README-it.md) | [KO](README-ko.md) | [ID](README-id.md)

# Beekeeper Studio

Beekeeper Studio é um editor SQL multiplataforma e gerenciador de banco de dados disponível para Linux, Mac e Windows.

[Baixar Beekeeper Studio](https://beekeeperstudio.io/get-community)

Publicamos binários para MacOS, Windows e Linux.

[![image](https://user-images.githubusercontent.com/279769/203650152-4a34af1f-8a38-47cf-a273-d34d1c84feeb.png)](https://beekeeperstudio.io/get)


Beekeeper Studio é gratuito para baixar e oferece muitos recursos gratuitamente, sem necessidade de cadastro, registro ou cartão de crédito. O aplicativo oferece alguns recursos premium por um preço de licença razoável. [Saiba mais aqui](https://beekeeperstudio.io/pricing)


A maior parte do código neste repositório é open source sob a licença GPLv3. Recursos pagos também estão neste repositório sob uma licença comercial com código-fonte disponível.

Contribuições da comunidade são bem-vindas!


## Bancos de Dados Suportados

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

## Edições do Beekeeper Studio

Beekeeper Studio é um único download com upgrades dentro do aplicativo para recursos premium.

Adoraríamos tornar o Beekeeper Studio totalmente gratuito para todos, mas construir bom software é um trabalho difícil e caro. Acreditamos que nossas edições pagas têm preços justos, esperamos que você também ache.

👉 [Compare as Edições do Beekeeper Studio](https://beekeeperstudio.io/pricing)

## Recursos do Beekeeper Studio

Principal recurso: É suave 🍫, rápido 🏎, e você vai realmente gostar de usar 🥰

- Verdadeiramente multiplataforma: Windows, MacOS e Linux
- Editor de consultas SQL com autocomplete e destaque de sintaxe
- Interface com abas, para você poder fazer multitarefas
- Ordenar e filtrar dados da tabela para encontrar exatamente o que você precisa
- Atalhos de teclado sensatos
- Salvar consultas para depois
- Histórico de execução de consultas, para você encontrar aquela consulta que funcionou 3 dias atrás
- Excelente tema escuro
- Importar/exportar
- Backup/restauração
- Visualizar dados como JSON
- E muito mais

## Nossa Abordagem de UX

Uma de nossas frustrações com outros editores SQL e gerenciadores de banco de dados open source é que eles adotam uma abordagem de "colocar tudo" nos recursos, adicionando tantos recursos que a interface fica bagunçada e difícil de navegar. Queríamos um workbench SQL open source bonito, poderoso, mas também fácil de usar. Não conseguimos encontrar um, então criamos o Beekeeper Studio!

Geralmente nossa estrela guia é construir software que "sinta bem" de usar. Isso significa que no mínimo valorizamos que o Beekeeper seja rápido, direto de usar e moderno. Se um novo recurso compromete essa visão, nós o eliminamos.


## Apoiando o Beekeeper Studio

Adoramos trabalhar no Beekeeper Studio, e adoraríamos continuar crescendo e melhorando-o para sempre. Para fazer isso, precisamos da sua ajuda.

A melhor forma de apoiar o Beekeeper Studio é comprar uma [licença](https://beekeeperstudio.io/pricing) paga. Cada compra apoia diretamente nosso trabalho no Beekeeper Studio.

Se você está em uma empresa e usa o Beekeeper Studio para o seu trabalho, provavelmente deveria pedir ao seu chefe para [comprar uma licença](https://beekeeperstudio.io/pricing).

Se você não pode pagar uma licença, por favor use a versão gratuita, é por isso que fazemos uma versão gratuita!

Obrigado pelo seu apoio contínuo!


## Documentação

Confira [docs.beekeeperstudio.io](https://docs.beekeeperstudio.io) para guias do usuário, FAQs, dicas de solução de problemas e mais.

## Licença

Beekeeper Studio Community Edition (o código neste repositório) é licenciado sob a licença GPLv3.

Beekeeper Studio Ultimate Edition contém recursos extras e é licenciado sob um [acordo de licença de usuário final comercial (EULA)](https://beekeeperstudio.io/legal/commercial-eula/).

As marcas registradas do Beekeeper Studio (marcas de palavras e logos) não são open source. Veja nossas [diretrizes de marca registrada](https://beekeeperstudio.io/legal/trademark/) para mais informações.

## Diretrizes de Marca Registrada

Marcas registradas podem ser complicadas com projetos open source, então adaptamos um conjunto de diretrizes padrão para usar nossas marcas que são comuns em muitos projetos open source.

Se você está apenas usando o aplicativo Beekeeper Studio, e não está fazendo fork ou distribuindo código do Beekeeper Studio de nenhuma forma, estas provavelmente não se aplicam a você.

👉 [Diretrizes de Marca Registrada do Beekeeper Studio](https://beekeeperstudio.io/legal/trademark/)

## Contribuindo com o Beekeeper Studio

Adoramos *qualquer* engajamento da comunidade. Mesmo se você está reclamando porque não gosta de algo no aplicativo!


### Acordos do Contribuidor

- Construir uma comunidade inclusiva e acolhedora é importante para nós, então por favor siga nosso [código de conduta](code_of_conduct.md) enquanto você se envolve com o projeto.

- Ao contribuir com o projeto você concorda com os termos das nossas [diretrizes de contribuição](CONTRIBUTING.md).

### Contribuir sem código

Temos você coberto, leia nosso [guia para contribuir em 10 minutos sem código](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

### Compilando e Executando o Beekeeper Studio Localmente

Quer escrever código e melhorar o Beekeeper Studio? Configurar é fácil no Mac, Linux ou Windows.

```bash
# Primeiro: Instale NodeJS 20, NPM e Yarn
# ...

# 1. Faça um Fork do Repositório do Beekeeper Studio (clique no botão fork no topo direito desta tela)
# 2. Faça checkout do seu fork:
git clone git@github.com:<seu-usuario>/beekeeper-studio.git beekeeper-studio
cd beekeeper-studio/
yarn install # instala dependências


# Agora você pode iniciar o aplicativo:
yarn run electron:serve ## o aplicativo será iniciado
```

**Se você receber `error:03000086:digital envelope routines::initialization error`, você precisará atualizar o openssl.**

- No Ubuntu/Debian:
```
sudo apt-get update
sudo apt-get upgrade openssl
```

- No CentOS/RHEL:
```
sudo yum update openssl
```

- No macOS (usando Homebrew):
```
brew update
brew upgrade openssl
```

### Onde fazer mudanças?

Este repositório agora é um monorepo, temos vários lugares com código, mas apenas alguns pontos de entrada importantes.

Todo o código do aplicativo está em `apps/studio`, algum código compartilhado está em `shared/src`. Isso é compartilhado com outros aplicativos.

Beekeeper Studio tem dois pontos de entrada:
- `background.js` - este é o código do lado do Electron que controla coisas nativas como mostrar janelas.
- `main.js` - este é o ponto de entrada para o aplicativo Vue.js. Você pode seguir as migalhas de pão dos componentes Vue a partir de `App.vue` para encontrar a tela que você precisa.

**Geralmente temos duas 'telas':**
- ConnectionInterface - conectando a um BD
- CoreInterface - interagindo com um banco de dados

### Como submeter uma mudança?


- Faça push das suas mudanças para o seu repositório e abra um Pull Request da nossa página do GitHub (esta página)
- Certifique-se de escrever algumas notas sobre o que sua mudança faz! Um gif é sempre bem-vindo para mudanças visuais.

## Notas para Mantenedores (leitores casuais podem ignorar isso)

### Considerações ao Atualizar o Electron

Isso é sempre uma dor total e vai quebrar o build 9 em 10 vezes.

Algumas coisas que você precisa considerar ao atualizar o Electron:

1. Ele usa uma versão diferente do node? Ex: Electron-18 usa node 14, 22 usa node 16. Então todos precisam atualizar
2. O node-abi precisa ser atualizado para poder entender a versão do Electron? Isso é usado no build para buscar pacotes pré-compilados. Você precisa atualizar isso em root/package.json#resolutions
3. Alguma API foi depreciada ou removida? Certifique-se de que todos os recursos que interagem com as APIs do Electron ainda funcionam, coisas como - selecionar um arquivo, maximizar uma janela, executar uma consulta, etc.


### Processo de Release

1. Aumente o número da versão em package.json
2. Substitua `build/release-notes.md` com as últimas notas de release. Siga o formato que está lá.
  - execute `git log <last-tag>..HEAD --oneline | grep 'Merge pull'` para encontrar PRs mergeados
2. Commit
3. Push para master
4. Crie uma tag `git tag v<version>`. Deve começar com 'v'
5. `git push origin <tagname>`
  - Agora espere a ação de build/publish completar no Github
6. Publique a nova release
  - Vá para a nova release 'rascunho' na aba de releases do GitHub, edite as notas, publique
  - Faça login no snapcraft.io, arraste a release enviada para o canal 'stable' para cada arquitetura.

Isso também deve publicar a documentação mais recente

Pós Release:
1. Copie as notas de release para um post de blog, publique no site
2. Tweet do link
3. Compartilhe no LinkedIn
4. Envie para a lista de emails no SendInBlue


## Muito Obrigado

Beekeeper Studio não existiria sem [Sqlectron-core](https://github.com/sqlectron/sqlectron-core), as bibliotecas principais de banco de dados do [projeto Sqlectron](https://github.com/sqlectron/sqlectron-gui). Beekeeper Studio começou como um fork experimental daquele repositório. Um grande obrigado ao @maxcnunes e ao resto da comunidade Sqlectron.

A licença original do sqlectron-core está incluída aqui:

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
