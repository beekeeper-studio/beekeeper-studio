---
title: Consultas Salvas
summary: "Salve suas consultas SQL para usá-las mais tarde"
icon: material/content-save
---

Às vezes temos consultas que usamos repetitivamente. Para evitar perder nossas consultas SQL, podemos salvá-las em um arquivo, ou usar o painel Consultas Salvas.

## Salvar uma consulta

Você pode salvar uma consulta pressionando `Ctrl+S` ou clicando no botão `Save` no canto inferior direito do Editor de Consulta.

![Saving a query in Query Editor](../../assets/images/saving-queries-1.gif)

Depois disso, você pode digitar o nome da consulta (pode renomeá-la depois), e então clicar `Save`.

## Abrir as consultas salvas

Você pode abrir o painel Consultas Salvas clicando no ícone Consultas Salvas na barra lateral. Depois disso, abra a consulta com duplo clique.

![Opening Saved Queries](../../assets/images/saving-queries-2.gif)

## Importar arquivos SQL

Para importar arquivos de consulta, você pode clicar no botão import, e então clicar `Import .sql files`. Ou clicar `File > Import SQL Files`. Aceita múltiplos arquivos de `.sql` ou qualquer formato de arquivo de texto. Esteja ciente que isso fará uma cópia do seu arquivo para suas Consultas Salvas. Quaisquer mudanças dos arquivos originais não serão refletidas no Beekeeper Studio.

![Clicking import from Saved Queries](../../assets/images/saving-queries-3.png)

![Clicking import from File menu](../../assets/images/saving-queries-4.png)

## Onde o Beekeeper Studio salva minhas Consultas SQL?

Quando você salva consultas SQL no Beekeeper Studio elas são persistidas em um banco de dados SQLite em seu diretório de configuração local. Consulte [Localização de Armazenamento de Dados](../../support/data-location.md) para mais detalhes.