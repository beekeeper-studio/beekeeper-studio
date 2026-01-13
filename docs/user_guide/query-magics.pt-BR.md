---
title: Query Magics
summary: "Use Query Magics para formatar os resultados da sua consulta SQL apenas renomeando suas colunas."
old_url: "https://docs.beekeeperstudio.io/docs/query-magics"
icon: material/magic-staff
---


Aqui está um passo a passo rápido sobre como usar Query Magics.
<iframe width="100%" height="400" src="https://www.youtube-nocookie.com/embed/27xYE423Xqw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

<br/>


![Query magics](../assets/images/query-magics-16.png)


## Use Query Magics para

- Linkar para outra tabela
- Tornar urls clicáveis
- Tornar endereços de email clicáveis
- Exibir uma url como uma imagem
- Exibir um número como uma classificação por estrelas
- Exibir um número como uma barra de progresso
- Exibir um número como dinheiro localizado

## Como Usar Query Magics

Você pode formatar os resultados de uma consulta SQL simplesmente adicionando algum texto ao final dos nomes de suas colunas.

Por exemplo, para formatar o campo `url` como um link você faria isto:

```sql
select url as url__format__link from some_table
```

Aqui está um exemplo rápido que exibe emails clicáveis, links para outra tabela, e renderiza um número como uma classificação por estrelas.


![Query Magics](../assets/images/query-magics-17.png)


## Query Magics Disponíveis

Em todas as descrições abaixo o texto em colchetes quadrados é opcional.


### Substitua valores com um enum personalizado

Substitua os valores em uma coluna baseado em enums definidos pelo usuário.

Enums são definidos em um arquivo chamado `enums.json`, que é encontrado no diretório userData.

Localizações do diretório UserData:

- Windows: `%APPDATA%\beekeeper-studio`
- Linux: `~/.config/beekeeper-studio`
- MacOS: `~/Library/Application Support/beekeeper-studio`

Faça um arquivo `enums.json` nesse diretório no formato abaixo:

```json
  [
    {
      "name": "user_type",
      "variants": [
        { "id": "1", "value": "Default" },
        { "id": "2", "value": "Admin" },
        { "id": "3", "value": "Editor" },
        { "id": "4", "value": "Viewer" },
        { "id": "5", "value": "Guest" }
      ]
    },
    {
      "name": "account_type",
      "variants": [
        { "id": "1", "value": "Personal" },
        { "id": "2", "value": "Business" },
        { "id": "3", "value": "Enterprise" },
        { "id": "4", "value": "Student" },
        { "id": "5", "value": "Trial" }
      ]
    },
  ]
```

Ao selecionar colunas em sua consulta, use o seguinte formato QueryMagic

```
select a as  columnname__format__enum__enumname

 --examples
select
  user as user__format__enum__user_type,
  account_id as account__format__enum__account_type
```
Na sua tabela de resultado isso substituirá `id` por `value`. Então no exemplo final, substituirá todos os valores onde account_id é `1` por `"Personal"`

Aqui estão os enums em ação:

![Image Alt Tag](../assets/images/query-magics-85.png)

![Image Alt Tag](../assets/images/query-magics-84.png)

![Image Alt Tag](../assets/images/query-magics-86.png)

### Formatar como um link clicável

Tornar URLs clicáveis

```
columnname__format__link`
```

### Formatar como um endereço de email clicável

Semelhante a links, torna emails clicáveis - isso abrirá uma janela de composição no seu cliente de email padrão.

```
columname__format__email`
```

### Formatar como um check/tick
Exibir um check ou cruz - 1 para check, 0 para cruz. Não há outras opções

```
columname__format__check
```

### Formatar como uma imagem (img)

Pega uma URL e a exibe como uma imagem. Você pode alterar a largura e altura se quiser.


```sql
columname__format__image[__width[__height]]

--examples
columname__format__image -- padrão
columname__format__image__50 -- define largura para 50
columnname__format__image__50__100 -- define largura para 50, altura 100
```

### Formatar como dinheiro
Exibir um número em uma moeda específica, padrão para USD.

```sql
columname__format__money[__currencyCode]
--examples
columname__format__money      -- USD (o padrão)
columname__format__money__gbp -- Libra Britânica
columname__format__money__cop -- Peso Colombiano

```

### Formatar como uma barra de progresso

Exibe um número como uma barra de progresso, por padrão isso assume um intervalo de 0 - 100.

```sql
columnname__format__progress[__max]
-- examples
columname__format__progress -- padrão 0-100
columname__format__progress_10 -- o intervalo é 0-10

```


### Formatar como uma classificação por estrelas

Exibe um número como uma classificação por estrelas (como você encontraria em um site de avaliação). O padrão assume uma classificação de 0-5 estrelas.

```sql
columname__format__stars[__max]
--examples
columname__format__stars__10 -- 0-10 estrelas

```

### Link para outra tabela (goto)

Esta mágica permite que você linke para outras tabelas baseado no valor no seu conjunto de resultados, assim como links de chave estrangeira funcionam na visualização de dados da tabela.

Seu link de tabela pode opcionalmente incluir um filtro de coluna.

```sql
columname__goto[__schema]__table[__column] -- sintaxe
--examples
columname__goto__users -- link para a chave primária da tabela users
columname__goto__public__users -- link para a chave primária da tabela users no esquema public
columname__goto__products__user_id -- link para a tabela products, filtrar por user_id
```

Porque você pode fornecer um filtro, pode usar isso para mais que links de chave estrangeira. Por exemplo você poderia linkar para todos os produtos comprados por um usuário específico.