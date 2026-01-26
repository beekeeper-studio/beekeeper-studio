<!-- Target languages: ["en", "pt-BR", "es", "de", "fr", "el", "ja", "it", "ko", "id"] -->
🌐 [EN](README.md) | [ES](README-es.md) | [PT-BR](README.pt-br.md) | [DE](README-de.md) | [FR](README-fr.md) | [EL](README-el.md) | [JA](README-ja.md) | [IT](README-it.md) | [ID](README-id.md)

# Beekeeper Studio

Beekeeper Studio는 Linux, Mac, Windows에서 사용할 수 있는 크로스 플랫폼 SQL 편집기 및 데이터베이스 관리자입니다.

[Beekeeper Studio 다운로드](https://beekeeperstudio.io/get-community)

MacOS, Windows, Linux용 바이너리를 제공합니다.

[![image](https://user-images.githubusercontent.com/279769/203650152-4a34af1f-8a38-47cf-a273-d34d1c84feeb.png)](https://beekeeperstudio.io/get)


Beekeeper Studio는 무료로 다운로드할 수 있으며, 가입, 등록, 신용카드 없이 많은 기능을 무료로 제공합니다. 앱은 합리적인 라이선스 비용으로 일부 프리미엄 기능을 제공합니다. [자세히 알아보기](https://beekeeperstudio.io/pricing)


이 저장소의 대부분의 코드는 GPLv3 라이선스 하의 오픈 소스입니다. 유료 기능도 이 저장소에 상업용 소스 공개 라이선스로 포함되어 있습니다.

커뮤니티 기여를 환영합니다!


## 지원되는 데이터베이스

<!-- Don't edit this, it gets built automatically from docs/includes/supported_databases.md -->
<!-- SUPPORT_BEGIN -->

| 데이터베이스                                              | 지원                         | Community | 유료 버전 |                             Beekeeper 링크 |
| :------------------------------------------------------- | :--------------------------- | :-------: | :------: | -----------------------------------------: |
| [PostgreSQL](https://postgresql.org)                     | ⭐ 완전 지원                 |    ✅     |    ✅    |  [기능](https://beekeeperstudio.io/db/postgres-client) |
| [MySQL](https://www.mysql.com/)                          | ⭐ 완전 지원                 |    ✅     |    ✅    |  [기능](https://beekeeperstudio.io/db/mysql-client)|
| [SQLite](https://sqlite.org)                             | ⭐ 완전 지원                 |    ✅     |    ✅    |   [기능](https://beekeeperstudio.io/db/sqlite-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/sqlite) |
| [SQL Server](https://www.microsoft.com/en-us/sql-server) | ⭐ 완전 지원                 |    ✅     |    ✅    |   [기능](https://beekeeperstudio.io/db/sql-server-client)  |
| [Amazon Redshift](https://aws.amazon.com/redshift/)      | ⭐ 완전 지원                 |    ✅     |    ✅    |    [기능](https://beekeeperstudio.io/db/redshift-client) |
| [CockroachDB](https://www.cockroachlabs.com/)            | ⭐ 완전 지원                 |    ✅     |    ✅    | [기능](https://beekeeperstudio.io/db/cockroachdb-client)|
| [MariaDB](https://mariadb.org/)                          | ⭐ 완전 지원                 |    ✅     |    ✅    |     [기능](https://beekeeperstudio.io/db/mariadb-client) |
| [TiDB](https://pingcap.com/products/tidb/)               | ⭐ 완전 지원                 |    ✅     |    ✅    |        [기능](https://beekeeperstudio.io/db/tidb-client) |
| [Google BigQuery](https://cloud.google.com/bigquery)     | ⭐ 완전 지원                 |    ✅      |    ✅    |    [기능](https://beekeeperstudio.io/db/google-big-query-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/bigquery) |
| [Redis](https://redis.io/)                               | ⭐ 완전 지원                 |    ✅    |    ✅    |       [기능](https://www.beekeeperstudio.io/db/redis-client/) |
| [Oracle Database](https://www.oracle.com/database/)      | ⭐ 완전 지원                 |           |    ✅    |      [기능](https://beekeeperstudio.io/db/oracle-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/oracle) |
| [Cassandra](http://cassandra.apache.org/)                | ⭐ 완전 지원                 |           |    ✅    |   [기능](https://beekeeperstudio.io/db/cassandra-client) |
| [Firebird](https://firebirdsql.org/)                     | ⭐ 완전 지원                 |           |    ✅    |    [기능](https://beekeeperstudio.io/db/firebird-client), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/firebird) |
| [LibSQL](https://libsql.org/)                            | ⭐ 완전 지원                 |          |    ✅    |      [기능](https://beekeeperstudio.io/db/libsql-client) |
| [ClickHouse](https://clickhouse.tech/)                   | ⭐ 완전 지원                 |         |    ✅    |  [기능](https://www.beekeeperstudio.io/db/clickhouse-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/clickhouse) |
| [DuckDB](https://duckdb.org/)                            | ⭐ 완전 지원                 |         |    ✅    |      [기능](https://www.beekeeperstudio.io/db/duckdb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/duckdb) |
| [SQL Anywhere](https://www.sap.com/products/technology-platform/sql-anywhere.html)  | ⭐ 완전 지원    |           |    ✅    |      [기능](https://www.beekeeperstudio.io/db/sql-anywhere-client/) |
| [MongoDB](https://www.mongodb.com/)                      | ⭐ 완전 지원                 |          |    ✅    |     [기능](https://www.beekeeperstudio.io/db/mongodb-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/mongodb) |
| [Trino](https://trino.io/) / [Presto](https://prestodb.io/) | ⭐ 완전 지원              |           |    ✅    |    [기능](https://www.beekeeperstudio.io/db/trino-client/), [Docs](https://docs.beekeeperstudio.io/user_guide/connecting/trino/) |
| [Snowflake](https://www.snowflake.com/)                  | ⏳ 곧 출시                   |           |    ✅    |   -- |
| [DynamoDB](https://aws.amazon.com/dynamodb/)             | 🗓️ 계획됨                   |           |    ✅    |       -- |




<!-- SUPPORT_END -->

## Beekeeper Studio 에디션

Beekeeper Studio는 프리미엄 기능을 위한 인앱 업그레이드가 포함된 단일 다운로드입니다.

Beekeeper Studio를 모두에게 완전히 무료로 제공하고 싶지만, 좋은 소프트웨어를 만드는 것은 어렵고 비용이 많이 드는 작업입니다. 우리의 유료 에디션이 합리적인 가격이라고 생각하며, 여러분도 동의하시길 바랍니다.

👉 [Beekeeper Studio 에디션 비교](https://beekeeperstudio.io/pricing)

## Beekeeper Studio 기능

최고의 기능: 부드럽고 🍫, 빠르고 🏎, 정말 사용하기 즐거워요 🥰

- 진정한 크로스 플랫폼: Windows, MacOS, Linux
- 자동완성과 구문 강조 기능이 있는 SQL 쿼리 편집기
- 멀티태스킹을 위한 탭 인터페이스
- 필요한 것을 정확히 찾기 위한 테이블 데이터 정렬 및 필터링
- 합리적인 키보드 단축키
- 나중을 위해 쿼리 저장
- 3일 전에 작동했던 쿼리를 찾을 수 있는 쿼리 실행 기록
- 훌륭한 다크 테마
- 가져오기/내보내기
- 백업/복원
- JSON으로 데이터 보기
- 그 외 다수

## UX에 대한 우리의 접근 방식

다른 오픈 소스 SQL 편집기와 데이터베이스 관리자에 대한 불만 중 하나는 기능에 대해 "모든 것을 넣는" 접근 방식을 취해 UI가 복잡해지고 탐색하기 어려워진다는 것입니다. 우리는 강력하면서도 사용하기 쉬운, 보기 좋은 오픈 소스 SQL 워크벤치를 원했습니다. 찾을 수 없어서 Beekeeper Studio를 만들었습니다!

일반적으로 우리의 지침은 "사용하기 좋은 느낌"의 소프트웨어만 만드는 것입니다. 이는 최소한 Beekeeper가 빠르고, 사용하기 간단하고, 현대적이어야 한다는 것을 의미합니다. 새로운 기능이 이 비전을 해치면 제거합니다.


## Beekeeper Studio 지원하기

Beekeeper Studio 작업을 좋아하며, 영원히 성장시키고 개선하고 싶습니다. 그러기 위해서는 여러분의 도움이 필요합니다.

Beekeeper Studio를 지원하는 가장 좋은 방법은 유료 [라이선스](https://beekeeperstudio.io/pricing)를 구매하는 것입니다. 모든 구매는 Beekeeper Studio 작업을 직접 지원합니다.

기업에서 Beekeeper Studio를 업무에 사용하고 있다면, 상사에게 [라이선스 구매](https://beekeeperstudio.io/pricing)를 요청해야 할 것입니다.

라이선스를 구매할 여유가 없다면, 무료 버전을 사용해 주세요. 그래서 무료 버전을 만드는 것입니다!

지속적인 지원에 감사드립니다!


## 문서

사용자 가이드, FAQ, 문제 해결 팁 등은 [docs.beekeeperstudio.io](https://docs.beekeeperstudio.io)를 확인하세요.

## 라이선스

Beekeeper Studio Community Edition(이 저장소의 코드)은 GPLv3 라이선스입니다.

Beekeeper Studio Ultimate Edition은 추가 기능을 포함하며 [상업용 최종 사용자 라이선스 계약(EULA)](https://beekeeperstudio.io/legal/commercial-eula/)에 따라 라이선스됩니다.

Beekeeper Studio의 상표(워드마크 및 로고)는 오픈 소스가 아닙니다. 자세한 내용은 [상표 가이드라인](https://beekeeperstudio.io/legal/trademark/)을 참조하세요.

## 상표 가이드라인

오픈 소스 프로젝트에서 상표는 복잡할 수 있으므로, 많은 오픈 소스 프로젝트에서 일반적인 상표 사용에 대한 표준 가이드라인을 채택했습니다.

Beekeeper Studio 앱만 사용하고 있고 Beekeeper Studio 코드를 포크하거나 배포하지 않는다면, 이 가이드라인은 아마 적용되지 않을 것입니다.

👉 [Beekeeper Studio 상표 가이드라인](https://beekeeperstudio.io/legal/trademark/)

## Beekeeper Studio에 기여하기

*어떤* 커뮤니티 참여도 환영합니다. 앱에 대해 마음에 들지 않는 것이 있어서 불평하는 것도요!


### 기여자 계약

- 포용적이고 환영하는 커뮤니티를 만드는 것이 중요하므로, 프로젝트에 참여할 때 [행동 강령](code_of_conduct.md)을 따라주세요.

- 프로젝트에 기여함으로써 [기여 가이드라인](CONTRIBUTING.md)의 조건에 동의하게 됩니다.

### 코딩 없이 기여하기

걱정 마세요. [코딩 없이 10분 만에 기여하는 가이드](https://github.com/beekeeper-studio/beekeeper-studio/issues/287)를 읽어보세요.

### Beekeeper Studio 로컬에서 컴파일 및 실행하기

코드를 작성하고 Beekeeper Studio를 개선하고 싶으신가요? Mac, Linux, Windows에서 설정이 쉽습니다.

```bash
# 먼저: NodeJS 20, NPM, Yarn 설치
# ...

# 1. Beekeeper Studio 저장소 포크하기 (이 화면 오른쪽 상단의 fork 버튼 클릭)
# 2. 포크 체크아웃:
git clone git@github.com:<your-username>/beekeeper-studio.git beekeeper-studio
cd beekeeper-studio/
yarn install # 의존성 설치


# 이제 앱을 시작할 수 있습니다:
yarn run electron:serve ## 앱이 시작됩니다
```

**`error:03000086:digital envelope routines::initialization error`가 발생하면 openssl을 업데이트해야 합니다.**

- Ubuntu/Debian:
```
sudo apt-get update
sudo apt-get upgrade openssl
```

- CentOS/RHEL:
```
sudo yum update openssl
```

- macOS (Homebrew 사용):
```
brew update
brew upgrade openssl
```

### 어디서 변경해야 하나요?

이 저장소는 이제 모노레포입니다. 코드가 여러 곳에 있지만 중요한 진입점은 몇 개뿐입니다.

모든 앱 코드는 `apps/studio`에 있고, 일부 공유 코드는 `shared/src`에 있습니다. 이것은 다른 앱과 공유됩니다.

Beekeeper Studio에는 두 가지 진입점이 있습니다:
- `background.js` - 창 표시 같은 네이티브 기능을 제어하는 Electron 측 코드입니다.
- `main.js` - Vue.js 앱의 진입점입니다. `App.vue`에서 Vue 컴포넌트 브레드크럼을 따라가면 필요한 화면을 찾을 수 있습니다.

**일반적으로 두 개의 '화면'이 있습니다:**
- ConnectionInterface - DB에 연결
- CoreInterface - 데이터베이스와 상호작용

### 변경 사항을 제출하는 방법?


- 변경 사항을 저장소에 푸시하고 GitHub 페이지(이 페이지)에서 Pull Request를 여세요
- 변경 사항이 무엇을 하는지 메모를 작성하세요! 시각적 변경에는 gif가 항상 환영됩니다.

## 메인테이너 노트 (일반 독자는 무시해도 됩니다)

### Electron 업그레이드 고려사항

이것은 항상 매우 힘들고 10번 중 9번은 빌드가 깨집니다.

Electron 업그레이드 시 고려할 사항:

1. 다른 node 버전을 사용하나요? 예: Electron-18은 node 14, 22는 node 16을 사용합니다. 따라서 모두 업그레이드해야 합니다
2. node-abi가 Electron 버전을 이해하도록 업그레이드해야 하나요? 이것은 빌드에서 미리 빌드된 패키지를 가져오는 데 사용됩니다. root/package.json#resolutions에서 업데이트해야 합니다
3. API가 더 이상 사용되지 않거나 제거되었나요? Electron API와 상호작용하는 모든 기능이 여전히 작동하는지 확인하세요 - 파일 선택, 창 최대화, 쿼리 실행 등.


### 릴리스 프로세스

1. package.json의 버전 번호 올리기
2. `build/release-notes.md`를 최신 릴리스 노트로 교체. 기존 형식을 따르세요.
  - `git log <last-tag>..HEAD --oneline | grep 'Merge pull'`을 실행하여 병합된 PR 찾기
2. 커밋
3. master에 푸시
4. 태그 생성 `git tag v<version>`. 'v'로 시작해야 합니다
5. `git push origin <tagname>`
  - Github에서 build/publish 액션이 완료될 때까지 대기
6. 새 릴리스 게시
  - GitHub의 releases 탭에서 새 'draft' 릴리스로 이동, 노트 편집, 게시
  - snapcraft.io에 로그인, 업로드된 릴리스를 각 아키텍처의 'stable' 채널로 드래그

이것은 또한 최신 문서를 게시해야 합니다

릴리스 후:
1. 릴리스 노트를 블로그 게시물로 복사, 웹사이트에 게시
2. 링크 트윗
3. LinkedIn에 공유
4. SendInBlue의 메일링 리스트로 전송


## 감사의 말

Beekeeper Studio는 [Sqlectron-core](https://github.com/sqlectron/sqlectron-core), [Sqlectron 프로젝트](https://github.com/sqlectron/sqlectron-gui)의 핵심 데이터베이스 라이브러리 없이는 존재하지 않았을 것입니다. Beekeeper Studio는 그 저장소의 실험적 포크로 시작되었습니다. @maxcnunes와 Sqlectron 커뮤니티 모두에게 큰 감사를 드립니다.

sqlectron-core의 원본 라이선스가 여기에 포함되어 있습니다:

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
