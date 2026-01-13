---
title: Editor SQL
summary: "Um guia rápido sobre usar o Editor SQL de classe mundial do Beekeeper Studio"
old_url: "https://docs.beekeeperstudio.io/docs/using-the-sql-editor"
icon: material/code-tags
---

Escrever SQL é uma parte tão fundamental de interagir com um banco de dados relacional que colocamos essa funcionalidade na frente e no centro.

Você pode usar a aba de consulta SQL para escrever, e executar, consultas SQL rápida e facilmente.

## Completar código

Tentamos tornar nosso completar código útil mas não intrusivo.

Sugestões de código aparecerão automaticamente nas seguintes situações:

- `tabelas` serão sugeridas após digitar `from` ou `join`
- `colunas` serão sugeridas após digitar um nome de tabela, ou alias de tabela, seguido por um ponto, ex `film.`

Nessas situações, o Beekeeper resolverá automaticamente os nomes corretos de tabela e coluna para a entidade que você está consultando.

### Acionando autocompletar manualmente

A combinação de teclas padrão para acionar autocompletar manualmente é `Ctrl+Space`.

![Image Alt Tag](../../assets/images/using-the-sql-editor-11.gif)

## Contextos de Execução

Se você gosta de escrever grandes scripts SQL longos com múltiplas consultas no mesmo painel do editor (eu sei que gosto), pode querer executar apenas uma porção do seu script de cada vez.

O Beekeeper permite que você:

1. Execute tudo (este é o padrão)
2. Execute apenas a consulta 'atual' (o Beekeeper destaca esta consulta para você saber o que executará)
3. Execute apenas o que você selecionou.

![Image Alt Tag](../../assets/images/using-the-sql-editor-12.gif)

## Gerenciamento de Transação

Transações executadas dentro do editor de consulta serão automaticamente detectadas pelo Beekeeper, que então reservará uma conexão para sua aba de consulta atual até que essa transação seja commitada ou revertida.

Há também um [Modo de Transação Manual](./manual-transaction-management.md) que permite que você manuseie manualmente cada passo deste processo.

Esta funcionalidade está atualmente disponível apenas para Postgres, CockroachDB, Redshift, MySQL, MariaDB, SQLServer, Firebird e Oracle.

## Parâmetros de Consulta

Você pode parametrizar suas consultas e o Beekeeper solicitará valores quando você executá-la.

Você pode usar três tipos de sintaxe `:variable`, `$1`, ou `?` dependendo do engine de banco de dados que está consultando.

```sql
select * from table where foo = :one and bar = :two

select * from table where foo = $1 and bar = $2
```
![Image Alt Tag](../../assets/images/using-the-sql-editor-13.gif)

Você pode configurar qual sintaxe está ativa para seu engine de banco de dados usando o [arquivo de configuração](../configuration.md).

```ini
; Habilitar todos os tipos de parâmetro para postgres (não recomendado)
[db.postgres.paramTypes]
positional = true
named[] = ':'
named[] = '@'
named[] = '$'
numbered[] = '?'
numbered[] = ':'
numbered[] = '$'
quoted[] = ':'
quoted[] = '@'
quoted[] = '$'
```


## Baixando Resultados

Quando você executa uma consulta, os resultados aparecerão logo abaixo do editor SQL, simples!

![Image Alt Tag](../../assets/images/using-the-sql-editor-99.png)

Se você executar múltiplas consultas SQL, pode selecionar diferentes conjuntos de resultados com o dropdown na barra de status. Você receberá um pequeno popup para lhe informar sobre isso na primeira vez que fizer.

### Conjuntos de Resultados Grandes

Se você executar uma consulta que gera um conjunto de resultados de mais de 50.000 registros o Beekeeper truncará a tabela de resultado (para conservar memória).

Na edição comercial do Beekeeper Studio, você também pode selecionar `Run To File`, isso executará sua consulta SQL e enviará os resultados completos diretamente para um arquivo CSV.

## Modo Vim
Junto com o editor de consulta padrão, o Beekeeper suporta modo Vim, que permite escrever consultas em um editor de texto semelhante ao Vim.

Para habilitar isso, você pode clicar na engrenagem no canto inferior esquerdo do editor de consulta:

![editor mode selection](../../assets/images/using-the-sql-editor-155.png)

E então você está pronto para começar com um editor vim no Beekeeper!

Qualquer editor que você preferir será preservado entre todas as conexões/reinicializações/etc.

### Customização
Você também pode adicionar seus próprios keybindings e motions ao editor vim colocando um arquivo `.beekeeper.vimrc` no `userDirectory` para o Beekeeper Studio e escrevendo seus mapeamentos customizados.

Localizações do `userDirectory`:
- Windows: `%APPDATA%\beekeeper-studio`
- Linux: `~/.config/beekeeper-studio`
- MacOS: `~/Library/Application Support/beekeeper-studio`

Por exemplo, se você é um usuário Helix, pode adicionar comandos `gl` e `gh` assim:

```
nmap gl $
nmap gh ^
```

Estes comandos adicionam motions para `gl` ir para o final de uma linha, e `gh` para ir para o início de uma linha

Atualmente suportamos apenas os comandos `nmap`, `imap` e `vmap`, mas esperamos introduzir mais no futuro!