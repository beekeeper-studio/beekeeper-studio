---
title: Guia para Iniciantes
summary: "Este guia irá ajudá-lo a configurar e usar o Beekeeper Studio pela primeira vez. Não se preocupe, é bem tranquilo. :-)"
old_url: "https://docs.beekeeperstudio.io/docs/getting-started-guide"
---

👋 Olá e bem-vindo à comunidade do Beekeeper Studio. Acho que você vai gostar daqui.

O Beekeeper Studio é mais que um aplicativo, venha nos dizer oi:

- [Junte-se ao grupo Slack da comunidade](https://beekeeperstudio.io/slack)
- [Explore solicitações de recursos no Github](https://github.com/beekeeper-studio/beekeeper-studio)



!!! note "Olá!"
    Esta página irá ajudá-lo a se familiarizar com o Beekeeper Studio. Se você já usou aplicativos similares no passado, fique à vontade para explorar o resto do site de documentação, ou simplesmente comece a usar o Beekeeper Studio (é bem intuitivo!)


Se você é novo em aplicativos de gerenciamento de banco de dados em geral, pode ser útil assistir a este tour pelo Beekeeper Studio, onde explico várias funcionalidades importantes

<iframe width="100%" height="315" src="https://www.youtube-nocookie.com/embed/id37-ZRZNkQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

👉  [Assista ao Tour do Beekeeper Studio no YouTube](https://www.youtube.com/watch?v=id37-ZRZNkQ)

## Primeiro passo - instale o Beekeeper Studio


O Beekeeper Studio é um aplicativo desktop, então o primeiro passo é [Instalar o Beekeeper Studio](./installation/index.md)



## Vamos explorar o Beekeeper Studio com um banco de dados demo

Uma maneira rápida e fácil de explorar a funcionalidade do Beekeeper Studio é com o banco de dados demo `Sakila` -- é um banco de dados de exemplo que modela uma locadora de DVDs old-school, como uma Blockbuster.


!!! tip "Especialistas podem pular para o final"
    Se você já tem um banco de dados que quer visualizar, editar e consultar, vá em frente!

    Estes tópicos irão ajudá-lo a começar com as funcionalidades mais comumente usadas do Beekeeper Studio

    - [Conectar a um banco de dados](./user_guide/connecting/connecting.md)
    - [Escrever SQL](./user_guide/sql_editor/editor.md)
    - [Navegar e editar dados de tabelas](./user_guide/editing-data.md)
    - [Criar e modificar tabelas](./user_guide/modify-tables.md)


### Começando com Sakila e Beekeeper Studio

1. Certifique-se de ter o Beekeeper Studio [baixado e instalado](./installation/index.md)
1. [Baixe o banco de dados Sakila](https://github.com/ivanceras/sakila/raw/master/sqlite-sakila-db/sakila.db) - este é um arquivo `.db` - um arquivo de banco de dados SQLite auto-contido.
2. Clique duas vezes no arquivo `sakila.db` que você acabou de baixar.

O Beekeeper irá abrir, mostrando o conteúdo do banco de dados:

![Abrindo o banco de dados demo no Beekeeper Studio](./assets/images/getting-started-guide-60.gif)

### Abra uma tabela e altere alguns dados

Clique duas vezes na tabela `film` na barra lateral esquerda. Isso abrirá a visualização de dados para essa tabela.

Lembre-se - este é apenas um banco de dados demo, você pode fazer o que quiser com ele sem nenhum risco. Tente clicar na célula `title` de um filme e alterar o nome do filme. Você pode salvar suas alterações clicando no botão `apply` no rodapé.


![Clique em apply para salvar as alterações](./assets/images/getting-started-guide-61.gif)

### Escreva sua primeira consulta SQL

Agora você sabe como visualizar e editar dados de tabelas, que tal escrever SQL personalizado para extrair alguns dados interessantes do banco de dados.

Aqui está uma consulta de exemplo para contar o número de filmes no banco de dados agrupados por classificação (como PG-13):

```sql
SELECT
    film.rating, COUNT(DISTINCT inventory.film_id) AS film_count
    FROM film JOIN inventory
    ON film.film_id = inventory.film_id
    GROUP BY film.rating
    ORDER BY COUNT(inventory.film_id) DESC
```

Executar isso produz o resultado abaixo:

| rating | film_count |
|--------|------------|
| PG-13  | 213        |
| NC-17  | 202        |
| PG     | 183        |
| R      | 189        |
| G      | 171        |

### Explore outras funcionalidades do Beekeeper Studio

É hora de voar por conta própria e explorar o Beekeeper Studio 🕊.

- Tente [criar uma nova tabela](./user_guide/modify-tables.md)
- Talvez [exportar alguns dados para Excel](./user_guide/data-export.md)
- Também confira [embelezar seus resultados com Query Magics](./user_guide/query-magics.md)


## Entre em contato se precisar de ajuda

Travado? Confuso? Nos envie um email e nós ajudaremos - [support@beekeeperstudio.io](mailto:support@beekeeperstudio.io)