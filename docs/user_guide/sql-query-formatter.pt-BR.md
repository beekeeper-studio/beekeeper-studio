---
title: Formatador de Consulta SQL
summary: "Um formatador completo para salvar e usar presets para formatar seu SQL"
icon: material/format-align-center
---

O Formatador de Consulta SQL do Beekeeper é uma ótima maneira de garantir que seu SQL atenda requisitos rigorosos de formatação tanto do seu chefe quanto só de você mesmo. O Formatador de Consulta SQL traz as opções do [Pacote NPM SQL Formatter](https://www.npmjs.com/package/sql-formatter) às suas pontas dos dedos para definir, salvar e usar presets de formatação.

## Começando

Clique com o botão direito na janela do editor e selecione **Open Query Formatter** ou clique no botão ao lado de **Save** e **Run** para abrir o formatador. De lá, você pode selecionar e atualizar qualquer dos presets disponíveis.

![Formatter](../assets/images/sql-query-formatter/formatter-modal.png)

### Presets Incorporados
1. bk-default (padrão)
2. pgFormatter
3. prettier-sql

### Atualizar Preset Padrão
Você pode definir o formatador padrão para suas consultas usando o [sistema de configuração](./configuration.md) do Beekeeper Studio. Fora da caixa isso será **bk-default**.

```ini
[ui.queryEditor]
defaultFormatter = bk-default
```

## Como Formatar Consultas

![format-query](../assets/images/sql-query-formatter/format-query.gif)

1. Abra o Formatador de Consulta SQL
2. Selecione um preset do dropdown para usar como base
3. Selecione opções e garanta que configurações estão como deseja da prévia à direita
4. Clique em Apply

*Nota, aplicar não salva essas configurações no preset selecionado.*


## Como Salvar um Preset

Siga as instruções para formatar uma consulta, mas em vez de clicar **Apply**, clique **Save Preset**

*Nota: Salvar não aplica automaticamente as atualizações. Clique Apply para as configurações serem aplicadas à sua consulta.*

## Criando um Novo Preset

![create-new-preset](../assets/images/sql-query-formatter/formatter-new-preset.gif)

1. Abra o Formatador de Consulta SQL
2. Selecione um preset do dropdown para usar como base
3. Clique no botão + ao lado do dropdown de presets
4. Digite um nome para o formato (deve ser um nome único)
5. Selecione opções e garanta que configurações estão como deseja da prévia à direita
6. Clique **Save Preset**

*Nota: Para aplicar o preset ao seu SQL, clique Apply.*

## Deletar um Preset

1. Abra o Formatador de Consulta SQL
2. Selecione o preset do dropdown que deseja deletar
3. Clique no botão **Delete Config** ao lado

*Nota: Os 3 presets incorporados não podem ser deletados. Eles podem ser editados no entanto.*

## Formatar Consultas Usando Presets

![select-preset](../assets/images/sql-query-formatter/formatter-select-preset.gif)

1. Clique com o botão direito na sua janela do editor
2. Paire sobre **Format Query**
3. Selecione um preset dos seus presets salvos.