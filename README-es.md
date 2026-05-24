<!-- Target languages: ["en", "pt-BR", "es", "de", "fr", "el", "ja", "it", "ko", "id"] -->
🌐 [EN](README.md) | [PT-BR](README.pt-br.md) | [DE](README-de.md) | [FR](README-fr.md) | [EL](README-el.md) | [JA](README-ja.md) | [IT](README-it.md) | [KO](README-ko.md) | [ID](README-id.md)

# Beekeeper Studio

Beekeeper Studio es un editor de SQL multiplataforma y gestor de bases de datos disponible para Linux, Mac y Windows.

[Descarga Beekeeper Studio](https://beekeeperstudio.io/get-community)

Publicamos binarios para MacOS, Windows y Linux.

[![image](https://user-images.githubusercontent.com/279769/203650152-4a34af1f-8a38-47cf-a273-d34d1c84feeb.png)](https://beekeeperstudio.io/get)


Beekeeper Studio es gratis para descargar y ofrece muchas funciones de forma gratuita, sin necesidad de registro, inscripción ni tarjeta de crédito. La aplicación ofrece algunas funciones premium por un precio de licencia razonable. [Más información aquí](https://beekeeperstudio.io/pricing)


La mayor parte del código en este repositorio es de código abierto bajo la licencia GPLv3. Las funciones de pago también están en este repositorio bajo una licencia comercial con código fuente disponible.

¡Las contribuciones de la comunidad son bienvenidas!


## Bases de datos compatibles

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

## Ediciones de Beekeeper Studio

Beekeeper Studio es una única descarga con actualizaciones dentro de la aplicación para funciones premium.

Nos encantaría hacer Beekeeper Studio totalmente gratis para todos, pero crear buen software es un trabajo difícil y costoso. Creemos que nuestras ediciones de pago tienen un precio justo, esperamos que tú también lo pienses.

👉 [Compara las ediciones de Beekeeper Studio](https://beekeeperstudio.io/pricing)

## Características de Beekeeper Studio

Lo mejor: Es fluido 🍫, rápido 🏎, y realmente disfrutarás usándolo 🥰

- Verdaderamente multiplataforma: Windows, MacOS y Linux
- Editor de consultas SQL con autocompletado y resaltado de sintaxis
- Interfaz con pestañas para que puedas hacer varias tareas a la vez
- Ordena y filtra los datos de las tablas para encontrar exactamente lo que necesitas
- Atajos de teclado sensatos
- Guarda consultas para más tarde
- Historial de ejecución de consultas, para que puedas encontrar esa consulta que funcionó hace 3 días
- Excelente tema oscuro
- Importar/exportar
- Copia de seguridad/restauración
- Ver datos como JSON
- Y mucho más

## Nuestro enfoque de UX

Una de nuestras frustraciones con otros editores de SQL y gestores de bases de datos de código abierto es que adoptan un enfoque de "echar todo" con las funciones, añadiendo tantas que la interfaz se vuelve desordenada y difícil de navegar. Queríamos un entorno SQL de código abierto con buen aspecto, potente pero también fácil de usar. No pudimos encontrar uno, ¡así que creamos Beekeeper Studio!

Generalmente nuestra estrella guía es construir software que "se sienta bien" al usarlo. Eso significa que como mínimo valoramos que Beekeeper sea rápido, directo de usar y moderno. Si una nueva función compromete esta visión, la eliminamos.


## Apoyar a Beekeeper Studio

Nos encanta trabajar en Beekeeper Studio, y nos encantaría seguir haciéndolo crecer y mejorándolo para siempre. Para eso necesitamos tu ayuda.

La mejor manera de apoyar a Beekeeper Studio es comprar una [licencia](https://beekeeperstudio.io/pricing) de pago. Cada compra apoya directamente nuestro trabajo en Beekeeper Studio.

Si estás en una empresa y usas Beekeeper Studio para tu trabajo, probablemente deberías pedirle a tu jefe que te [compre una licencia](https://beekeeperstudio.io/pricing).

Si no puedes permitirte una licencia, por favor usa la versión gratuita, ¡para eso hacemos una versión gratuita!

¡Gracias por tu apoyo continuo!


## Documentación

Visita [docs.beekeeperstudio.io](https://docs.beekeeperstudio.io) para guías de usuario, preguntas frecuentes, consejos de resolución de problemas y más.

## Licencia

Beekeeper Studio Community Edition (el código en este repositorio) está licenciado bajo la licencia GPLv3.

Beekeeper Studio Ultimate Edition contiene funciones adicionales y está licenciado bajo un [acuerdo de licencia de usuario final comercial (EULA)](https://beekeeperstudio.io/legal/commercial-eula/).

Las marcas registradas de Beekeeper Studio (marcas de palabras y logotipos) no son de código abierto. Consulta nuestras [directrices de marcas](https://beekeeperstudio.io/legal/trademark/) para más información.

## Directrices de Marcas

Las marcas registradas pueden ser complicadas con proyectos de código abierto, por lo que hemos adoptado un conjunto de directrices estándar para el uso de nuestras marcas que son comunes en muchos proyectos de código abierto.

Si solo estás usando la aplicación Beekeeper Studio, y no estás bifurcando o distribuyendo código de Beekeeper Studio de ninguna manera, estas probablemente no se aplican a ti.

👉 [Directrices de Marcas de Beekeeper Studio](https://beekeeperstudio.io/legal/trademark/)

## Contribuir a Beekeeper Studio

Nos encanta *cualquier* participación de la comunidad. ¡Incluso si te estás quejando porque no te gusta algo de la aplicación!


### Acuerdos del Colaborador

- Construir una comunidad inclusiva y acogedora es importante para nosotros, así que por favor sigue nuestro [código de conducta](code_of_conduct.md) mientras participas en el proyecto.

- Al contribuir al proyecto aceptas los términos de nuestras [directrices de contribución](CONTRIBUTING.md).

### Contribuir sin programar

Te tenemos cubierto, lee nuestra [guía para contribuir en 10 minutos sin programar](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

### Compilar y Ejecutar Beekeeper Studio Localmente

¿Quieres escribir algo de código y mejorar Beekeeper Studio? Configurar es fácil en Mac, Linux o Windows.

```bash
# Primero: Instala NodeJS 20, NPM y Yarn
# ...

# 1. Haz un fork del repositorio de Beekeeper Studio (haz clic en el botón fork en la parte superior derecha de esta pantalla)
# 2. Clona tu fork:
git clone git@github.com:<tu-usuario>/beekeeper-studio.git beekeeper-studio
cd beekeeper-studio/
yarn install # instala las dependencias


# Ahora puedes iniciar la aplicación:
yarn run electron:serve ## la aplicación se iniciará
```

**Si obtienes `error:03000086:digital envelope routines::initialization error`, necesitarás actualizar openssl.**

- En Ubuntu/Debian:
```
sudo apt-get update
sudo apt-get upgrade openssl
```

- En CentOS/RHEL:
```
sudo yum update openssl
```

- En macOS (usando Homebrew):
```
brew update
brew upgrade openssl
```

### ¿Dónde hacer cambios?

Este repositorio es ahora un monorepo, tenemos varios lugares con código, pero solo un par de puntos de entrada importantes.

Todo el código de la aplicación está en `apps/studio`, algo de código compartido está en `shared/src`. Esto se comparte con otras aplicaciones.

Beekeeper Studio tiene dos puntos de entrada:
- `background.js` - este es el código del lado de Electron que controla cosas nativas como mostrar ventanas.
- `main.js` - este es el punto de entrada para la aplicación Vue.js. Puedes seguir las migas de pan de los componentes Vue desde `App.vue` para encontrar la pantalla que necesitas.

**Generalmente tenemos dos 'pantallas':**
- ConnectionInterface - conectarse a una BD
- CoreInterface - interactuar con una base de datos

### ¿Cómo enviar un cambio?


- Sube tus cambios a tu repositorio y abre un Pull Request desde nuestra página de GitHub (esta página)
- ¡Asegúrate de escribir algunas notas sobre lo que hace tu cambio! Un gif siempre es bienvenido para cambios visuales.

## Notas para mantenedores (los lectores casuales pueden ignorar esto)

### Consideraciones al Actualizar Electron

Esto siempre es un dolor total y romperá la compilación 9 de cada 10 veces.

Algunas cosas que debes considerar al actualizar Electron:

1. ¿Usa una versión diferente de node? Por ejemplo, Electron-18 usa node 14, 22 usa node 16. Así que todos necesitan actualizar
2. ¿Necesita actualizarse node-abi para poder entender la versión de Electron? Esto se usa en la compilación para obtener paquetes precompilados. Necesitas actualizar esto en root/package.json#resolutions
3. ¿Se deprecaron o eliminaron algunas APIs? Asegúrate de que todas las funciones que interactúan con las APIs de Electron aún funcionen, cosas como - seleccionar un archivo, maximizar una ventana, ejecutar una consulta, etc.


### Proceso de Lanzamiento

1. Aumenta el número de versión en package.json
2. Reemplaza `build/release-notes.md` con las últimas notas de lanzamiento. Sigue el formato que está ahí.
  - ejecuta `git log <last-tag>..HEAD --oneline | grep 'Merge pull'` para encontrar PRs fusionados
2. Commit
3. Push a master
4. Crea una etiqueta `git tag v<version>`. Debe empezar con 'v'
5. `git push origin <tagname>`
  - Ahora espera a que se complete la acción de build/publish en Github
6. Publica el nuevo lanzamiento
  - Ve al nuevo lanzamiento 'borrador' en la pestaña de releases de GitHub, edita las notas, publica
  - Inicia sesión en snapcraft.io, arrastra el lanzamiento subido al canal 'stable' para cada arquitectura.

Esto también debería publicar la documentación más reciente

Post Lanzamiento:
1. Copia las notas de lanzamiento a un post de blog, publica en el sitio web
2. Tweet del enlace
3. Comparte en LinkedIn
4. Envía a la lista de correo en SendInBlue


## Un Gran Agradecimiento

Beekeeper Studio no existiría sin [Sqlectron-core](https://github.com/sqlectron/sqlectron-core), las bibliotecas de base de datos principales del [proyecto Sqlectron](https://github.com/sqlectron/sqlectron-gui). Beekeeper Studio comenzó como un fork experimental de ese repositorio. Un gran agradecimiento a @maxcnunes y al resto de la comunidad de Sqlectron.

La licencia original de sqlectron-core se incluye aquí:

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
