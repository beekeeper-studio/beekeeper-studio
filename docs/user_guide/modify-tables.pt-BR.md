---
title: Visualização de Estrutura
icon: material/hammer-wrench
summary: "O Criador de Tabela SQL do Beekeeper Studio permite que você construa visualmente uma tabela SQL sem ter que lembrar a sintaxe correta."
old_url: "https://docs.beekeeperstudio.io/docs/editing-data"
---

O Beekeeper Studio permite que você **CRIE** e **ALTERE** tabelas de banco de dados com uma UI amigável **sem ter que escrever SQL**.

## Criando novas Tabelas SQL

No topo da lista de entidades na barra lateral esquerda, clique no botão `+` para abrir a interface de criação de tabela.

![Image Alt Tag](../assets/images/editing-data-19.png)

Nesta tela você pode adicionar e remover colunas da sua nova tabela, então clique em `create table` no canto inferior direito

![Image Alt Tag](../assets/images/editing-data-20.gif)

### Adicionando uma coluna autoincrement

Para novas tabelas incluímos automaticamente uma coluna de chave primária `autoincrement` para simplificar o processo de criar uma tabela com uma chave primária que incrementa automaticamente. Isso é consistente entre todos os tipos de banco de dados.

Você pode adicionar quantas dessas quiser.

### Adicionando uma chave primária

Você provavelmente vai querer definir uma chave primária na sua nova tabela, por padrão selecionamos a coluna `id` como chave primária, mas você pode marcar múltiplas colunas e o Beekeeper Studio criará uma chave primária composta.

### Criando índices e relações

Após criar sua tabela você poderá adicionar índices e relações, mas isso não está disponível até após criar inicialmente a tabela.

### Finalmente - criando sua tabela

Clique em `CREATE TABLE` no canto inferior direito para criar sua nova tabela de banco de dados automaticamente.

Você também pode clicar em `Copy to SQL` em vez de `create table` para abrir a sintaxe `CREATE TABLE` gerada em uma nova aba do editor sql, para que possa editá-la antes de aplicá-la.

## Alterando uma tabela existente

Clique com o botão direito em qualquer tabela na barra lateral e clique em `View Structure` para visualizar e editar o esquema da tabela.

![Image Alt Tag](../assets/images/editing-data-21.png)

Esta visualização funciona da mesma forma que a visualização de criação de tabela, exceto que você também tem opções para modificar índices, relações e triggers.

![Image Alt Tag](../assets/images/editing-data-22.png)

**Nota**: Alguns engines de banco de dados não suportam alguns tipos de modificações de esquema, nestes casos o Beekeeper Studio fornecerá um aviso e essa funcionalidade será desabilitada

## Prévia do Criador de Tabela SQL

Quer brincar com o código do nosso criador de tabelas? Você pode usar a versão online do criador de tabelas no [site SQL Tools aqui](https://sqltools.beekeeperstudio.io/build). Esta é uma versão simplificada do nosso criador de tabelas incorporado e não pode criar sua nova tabela, mas sim fornece o SQL gerado para download.