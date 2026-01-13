---
title: Exportação de Dados
summary: "Exporte ou copie dados do seu banco de dados para CSV, JSON, Excel e mais com alguns cliques."
old_url: "https://docs.beekeeperstudio.io/docs/data-export"
icon: material/export
---

Há duas formas de exportar dados de banco de dados no Beekeeper Studio.

1. Exportando os resultados de uma consulta SQL
2. Exportando uma tabela(s) inteira, ou uma visualização filtrada de tabela
3. Copiando linhas individuais

## Formatos de Exportação

O Beekeeper suporta salvar dados em vários formatos


## Exportando resultados de consulta SQL

Após executar sua consulta no [Editor SQL](./sql_editor/editor.md), clique no botão `download` para exportar os resultados em um formato suportado.

![Click Download](../assets/images/data-export-24.png)

Você pode escolher tanto baixar como um arquivo, ou copiar o resultado para sua área de transferência.

### Formatos de Download Suportados

- CSV
- Excel
- JSON
- Markdown
- TSV amigável ao Excel para colar no Excel ou Google Sheets

### Limites em downloads de consulta SQL

Por padrão o Beekeeper Studio limita resultados de consulta a 20.000 registros (para não travar o app). Este limite também se aplica ao download.

Para acessar o conjunto de resultados completo Você pode selecionar `Download full results` no menu de download para buscar todo o resultado da consulta, e enviá-lo diretamente para um arquivo JSON ou CSV.

## Exportando uma tabela ou tabelas

Exportar uma tabela é um pouco mais complexo, porque uma tabela pode conter milhões de registros.

Quando você exporta uma tabela, tabelas, ou visualização filtrada de tabela, o Beekeeper Studio executará a consulta e então transmitirá os resultados para o arquivo de download.

Há algumas opções para começar:
- Vá para a visualização do explorador de tabela, clique no ícone ⚙ no canto inferior direito, e escolha `Export`.
- Clique com o botão direito na tabela e selecione `Export to File`.
- [Selecione `Export Data` da barra de ferramentas do app.](#multitable)

![Export Modal](../assets/images/data-export-157.png)

Você pode escolher a localização do arquivo final, e o formato da exportação, junto com algumas opções avançadas, quando apropriado (como impressão bonita de exportações JSON).

Daqui, simplesmente clique run para iniciar o processo e gerar sua exportação.

Exportar uma tabela grande pode levar muito tempo. Você verá uma notificação no canto inferior direito do app para indicar o progresso conforme executa.

### Exportação Multi-Tabela

Selecione `Export multiple tables` no modal de exportação ou vá através da barra de ferramentas do app (tools -> export).

![Multiple Table Export](../assets/images/data-export-156.gif)

Todas as tabelas no banco de dados serão mostradas agrupadas por esquemas (se o banco de dados os suporta) e você tem a habilidade de selecionar todas as tabelas em um esquema (ou todas elas realmente) com um simples clique ou escolher o que quiser.

Cada tabela é armazenada como um arquivo separado com um formato determinado de `tablename.{sql,csv,json}`.

!!! note
    O processo de exportação pode levar muito tempo dependendo do tamanho da tabela e número de tabelas sendo exportadas.

### Formatos de exportação de tabela

- CSV
- SQL (insert)
- JSON
- JSON delimitado por nova linha (JSONL)

## Copiando linhas individuais

Para qualquer tabela no Beekeeper Studio, seja no explorador de tabela ou nos resultados da consulta, você pode clicar com o botão direito em uma célula e escolher exportar a linha inteira em vários formatos.

![Image Alt Tag](../assets/images/data-export-26.png)

### Formatos de cópia de linha

- [TSV amigável ao Excel](#tsv)
- JSON
- Markdown
- SQL Insert


## Facilmente Exportar Para Excel Ou Google Sheets

O formato de cópia de linha do Beekeeper Studio é projetado para permitir a colagem rápida e fácil de dados no Google Sheets e Microsoft Excel.

Colar dados em uma planilha usando este formato permitirá que seu software de planilha automaticamente analise os dados e os distribua corretamente através das colunas.

Adicionei esta funcionalidade porque este é um dos meus aborrecimentos ao copiar dados de outras ferramentas.
![Image Alt Tag](../assets/images/data-export-27.gif)