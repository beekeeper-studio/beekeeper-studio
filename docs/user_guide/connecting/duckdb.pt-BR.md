---
title: DuckDB
summary: "Conecte a um banco de dados DuckDB dando duplo clique, da linha de comando, ou do app."
icon: simple/duckdb
---

Conectar a um banco de dados DuckDB do app é direto. Simplesmente selecione DuckDB do dropdown, escolha seu arquivo DuckDB, e clique `connect`.

## Dar duplo clique em arquivos .duckdb

Quando você instala o Beekeeper Studio ele criará uma associação para arquivos com a extensão `.duckdb`.

Contanto que o Beekeeper Studio permaneça o app padrão para esses tipos de arquivo, você pode agora apenas dar duplo clique em qualquer arquivo DuckDB para abri-lo no Beekeeper Studio.

## Abrindo da linha de comando

Você também pode usar seu terminal para abrir um banco de dados no Beekeeper Studio contanto que tenha as associações de arquivo configuradas.

- **MacOS** `open ./path/to/example.duckdb`
- **Linux** `xdg-open ./path/to/example.duckdb`

## Criando um novo banco de dados

Para criar um novo banco de dados, você pode clicar no botão `Create` ou especificar a localização do arquivo do banco de dados no campo de entrada `Database File`.

## Arquivos de consulta

![Query a parquet file](../../assets/images/duckdb-2.gif)

DuckDB permite importar e consultar dados de vários formatos de arquivo, como CSV, Parquet e JSON, usando comandos SQL.

Por exemplo, para consultar um arquivo CSV sem importá-lo para o banco de dados:

```sql
SELECT * FROM 'path/to/data.csv';
```

Para criar uma tabela e importar dados de um arquivo CSV:

```sql
CREATE TABLE my_table AS FROM 'path/to/data.csv';
```

Para mais detalhes, consulte a [documentação DuckDB](https://duckdb.org/docs/stable/data/overview).