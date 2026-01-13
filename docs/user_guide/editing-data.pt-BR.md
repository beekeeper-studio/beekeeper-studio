---
title: Visualização de Tabela
summary: "Visualize, pesquise e modifique os dados da sua tabela de banco de dados usando nosso explorador de tabela incorporado."
old_url: "https://docs.beekeeperstudio.io/docs/creating-tables"
icon: material/table
---

Dê duplo clique em uma tabela na barra lateral esquerda para abrir uma interface semelhante ao Excel para visualizar e editar os dados. Nós chamamos isso de **Visualização de Tabela**

![Image Alt Tag](../assets/images/creating-tables-14.png)


Esta visualização permite que você:
- Interaja com sua tabela como se fosse uma planilha
- Filtre a visualização para ver registros específicos
- Edite dados facilmente
- Copie/Cole dados de outros lugares
- Exporte a tabela toda ou parcial para uma variedade de formatos


## Interação

A visualização de tabela fornece uma experiência semelhante a planilha para selecionar, copiar e colar dados. O Beekeeper suporta muitos primitivos de interação similares a planilhas.

1. Selecione intervalos arbitrários de células usando clicar e arrastar, ctrl-clique e shift-clique.
2. Oculte colunas clicando com o botão direito no cabeçalho e escolhendo `hide column`
3. Redimensione colunas, uma de cada vez, ou juntas
4. Copie e cole intervalos de células do Excel ou Google Sheets com atalhos de teclado nativos


## Filtrando a Visualização de Tabela

No topo da tabela estão filtros de dados. Você pode usar esses para pesquisar sua tabela pelos dados específicos que deseja.

Há dois tipos de filtro que você pode usar - a GUI de filtro, e o filtro SQL bruto

### GUI de Filtro

![Database table filter GUI](../assets/images/table-view-filters.png)

A GUI de filtro permite verificar qualquer coluna na tabela por uma variedade de condições:
- Igualdade
- Maior que / menor que
- Like
- IN

!!! warning
    Ao usar `LIKE` em seus filtros, não esqueça de usar `%`. Por exemplo para encontrar todos os títulos que contêm `foo` você escreveria: `%foo%`, não `foo`

### Filtros SQL brutos

Clique no pequeno ícone `<>` à esquerda dos filtros para inserir um filtro sql. Você pode digitar qualquer coisa aqui que apareceria na cláusula `WHERE` de uma declaração sql.

![Table view SQL filter](../assets/images/table-view-sql-filters.png)


## Editando Dados

Na visualização de tabela você pode facilmente editar qualquer célula que gostar. Simplesmente dê duplo clique na célula para editar.

!!! note
    O Beekeeper só suporta edição de tabelas com chaves primárias.

### Editando JSON e Outros Valores Grandes

Editar um documento JSON em uma pequena célula de tabela não é uma ótima experiência. Em vez disso você pode clicar com o botão direito na célula e selecionar `Edit in Modal`. Isso fornecerá um modal pop-out com destaque de sintaxe e verificação.

![Editing JSON values in SQL Database using Beekeeper Studio](../assets/images/table-view-modal-edit.png)

### Editando tabelas que não têm chaves primárias

O Beekeeper Studio tipicamente não permite que você edite uma tabela que não contém uma chave primária, mas outras GUIs de banco de dados permitem isso, então qual é o problema?

Em geral, se você não tem uma chave primária na sua tabela não há **forma confiável de identificar uma linha específica**. Algumas GUIs suportam edição nesta situação, mas usam uma *heurística* para determinar qual linha atualizar. Uma técnica comum é corresponder todos os valores da linha para executar a atualização, ou usar um identificador de linha secreto.

#### Uma nota sobre identificadores de linha secretos/internos

Alguns bancos de dados fornecem um identificador interno para linhas, mas nem sempre são estáveis.

O [ctid](https://www.postgresql.org/docs/current/ddl-system-columns.html#DDL-SYSTEM-COLUMNS-CTID) do PostgreSQL identifica a localização física de uma linha, mas pode mudar durante um vacuum, tornando-o inadequado como um identificador real de linha em certas situações.

O [ROWID](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/ROWID-Pseudocolumn.html#GUID-F6E0FBD2-983C-495D-9856-5E113A17FAF1) do Oracle é similar, mas a documentação explicitamente declara que `You should not use ROWID as the primary key of a table.`.

#### Bom-o-suficiente não é bom o suficiente

Nunca queremos que o Beekeeper Studio seja a razão de você atualizar a linha errada em um banco de dados de produção. Nunca. Uma solução que funciona 99% das vezes, ou mesmo 99.9% das vezes *não é boa o suficiente* quando lidando com dados de produção.

Por essa razão a edição de dados de tabela é desabilitada a menos que sua tabela tenha uma chave primária.

#### Exceções

- SQLite sempre dá às linhas uma chave primária, seja especificada ou não. Este `rowid` é usado pelo Beekeeper Studio no SQLite para habilitar edição de dados onde você não especificou uma chave primária.


### Aplicando Mudanças

O Beekeeper tem um design único que 'encena' mudanças antes de aplicá-las, então você pode fazer múltiplas mudanças para serem aplicadas dentro de uma única transação.

Tipos de mudança encenados são indicados por cor:

- Verde - novos dados a serem adicionados
- Vermelho - dados a serem deletados
- Laranja - dados a serem atualizados

Para confirmar uma mudança, clique em `Apply` no canto inferior direito da tela. Para descartar a mudança, clique em `Reset`. Você também pode clicar em `Copy To Sql` se quiser fazer mudanças manuais às operações.

!!! warning
    Ordenar ou filtrar a tabela durante a edição descartará suas mudanças encenadas.

### Editando linhas inteiras

Você pode clonar, deletar e criar novas linhas de dados bem facilmente.

Clique com o botão direito em uma linha (ou múltiplas linhas) para deletar ou clonar.
Clique no botão `+` no canto inferior direito para adicionar uma nova linha. Novas linhas serão adicionadas ao final da tabela, mesmo que apareçam no topo da UI para conveniência.

## Copiando Dados

A visualização de tabela permite que você copie

- Uma célula individual
- Uma linha inteira
- Um conjunto arbitrário de células selecionadas.

Se você pressionar o atalho de teclado `copy` (`ctrl+c` ou `cmd+c`), copiará os dados em um formato amigável à planilha (colará lindamente no Google Sheets ou Excel)

Alternativamente, clique com o botão direito em qualquer célula para copiar essa linha (ou todas as células selecionadas) em uma variedade de formatos como CSV, JSON e Markdown.

![Image Alt Tag](../assets/images/creating-tables-95.png)

### Exportando a tabela inteira

Clique no ícone ⚙ no canto inferior direito e selecione `export` para exportar uma tabela inteira, ou a visualização filtrada da tabela.

Daqui você pode obter um instantâneo completo da tabela, pronto para compartilhar com outros.