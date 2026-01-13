---
title: Solução de Problemas
summary: "Como depurar problemas com o Beekeeper Studio"
old_url: "https://docs.beekeeperstudio.io/docs/troubleshooting"
---


Esperamos que você possa resolver seus problemas com os detalhes abaixo. Se não, por favor [Entre em Contato com o Suporte](./contact-support.md) e faremos nosso melhor para ajudar.


## Não seja tímido, diga oi!

Sinta-se à vontade para abrir um issue ou iniciar uma discussão, mesmo que não tenha certeza se algo está errado. Somos uma comunidade super legal, e todos nos ajudamos.

- [Abrir um issue](https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose)
- [Iniciar uma discussão](https://github.com/beekeeper-studio/beekeeper-studio/discussions/new)


## Ferramentas para fazer gravações de tela ao reportar problemas.

Gravações de tela são SUPER úteis quando um problema é difícil para eu replicar.

Aqui estão as ferramentas que recomendo para fazer capturas de tela rápidas e fáceis como arquivos GIF ou MKV:

1. MacOS: [Kap](https://getkap.co/) - é totalmente open source. Funciona muito bem. Eu uso isto.
2. Linux: [Peek](https://github.com/phw/peek) - também totalmente open source. Funciona muito bem. Eu uso isto.
3. Windows: [Captura](https://github.com/MathewSachin/Captura) - Também open source, também funciona muito bem.

Apenas copie/cole a gravação de tela no seu issue do GitHub e o GitHub descobrirá o resto.


## Como Depurar o Beekeeper Studio

### Verificar Ferramentas do Desenvolvedor para erros

Clique em `help -> show developer tools`, então no canto superior direito do console altere o dropdown 'levels' para 'errors' apenas.

Há algum erro aqui? Faça uma captura de tela e anexe-os a um novo issue!

### Ativar Modo de Debug e Coletar Logs

Você pode encontrar logs para o Beekeeper nestes diretórios:

Linux: ~/.config/beekeeper-studio/logs/{process type}.log
MacOS: ~/Library/Logs/beekeeper-studio/{process type}.log
Windows: %USERPROFILE%\AppData\Roaming\beekeeper-studio\logs\{process type}.log

Por padrão eles conterão apenas erros não capturados.

Você pode habilitar logging estendido iniciando o Beekeeper Studio com a flag de debug `DEBUG=*`.

No linux, apenas execute o app assim: `DEBUG=* beekeeper-studio`


## MySQL

* Esta seção também se aplica ao MariaDB

### Não consigo criar um índice decrescente

Antes da versão 8.0 o MySQL não suportava índices `DESC`, mas suportava a sintaxe.

Esta é uma 'funcionalidade' do MySQL para torná-lo mais compatível com outros engines.

Se você editar seus índices no Beekeeper Studio e criar um índice `DESC` ele simplesmente criará um índice `ASC` em vez disso.

A partir da versão 8.0 este problema foi resolvido.

### Recebo um erro de sintaxe SQL ao tentar criar um procedimento armazenado

Ao usar o cliente de linha de comando `mysql` você precisa remapear delimitadores usando `DELIMITER`, porém esta sintaxe não é suportada pelo próprio servidor MySQL, então retorna erro quando executado através do Beekeeper Studio.

Você provavelmente receberá um erro como `You have an error in your SQL syntax`. Simplesmente remova as declarações de delimiter para corrigi-lo.

Por exemplo, altere isto:
```sql
DELIMITER //

CREATE PROCEDURE simpleproc (OUT param1 INT)
 BEGIN
  SELECT COUNT(*) INTO param1 FROM t;
 END;
//

DELIMITER ;
```

Para isto:

```sql
CREATE PROCEDURE simpleproc (OUT param1 INT)
 BEGIN
  SELECT COUNT(*) INTO param1 FROM t;
 END;
```


## SQLite

### No such column: x

Se você estiver escrevendo uma consulta SQL para SQLite e receber o erro `no such column`, o problema é que você está usando aspas duplas `"` para identificar strings em vez de aspas simples `'`.

- Aspas duplas são para identificadores (tabelas, colunas, funções, etc)
- Aspas simples são para strings.


SQLite originalmente permitia tanto strings com aspas simples (`'some string'`) quanto com aspas duplas (`"some string"`) para manter compatibilidade com MySQL, mas os mantenedores desde então declararam que se arrependem desta decisão, e agora recomendam que [sqlite seja compilado com esta funcionalidade desligada](https://www.sqlite.org/compile.html#recommended_compile_time_options). O Beekeeper Studio segue as opções de compilação recomendadas.

Para corrigir este problema, altere suas strings com aspas duplas para strings com aspas simples:

```sql
-- isto não funcionará
select "string" as my_column from foo

-- isto funcionará
select 'string' as my_column from foo

```



### Recebo 'permission denied' ao tentar acessar um banco de dados em uma unidade externa

Se você está no Linux e usando a versão `snap` do Beekeeper você precisa dar ao app uma permissão extra.

```bash
sudo snap connect beekeeper-studio:removable-media :removable-media
```

Se você está em outra plataforma, por favor [abra um ticket][bug] e tentaremos ajudar você a depurar o problema.

[bug]: https://github.com/beekeeper-studio/beekeeper-studio/issues/new?template=bug_report.md&title=BUG:

## PostgreSQL

Por favor note que o Beekeeper Studio oficialmente suporta apenas Postgres 9.3+, embora versões mais antigas possam funcionar principalmente.

### Recebo um erro `column does not exist`, mas a coluna existe!

Postgres é estranho com sensibilidade a maiúsculas/minúsculas. Esta é geralmente a causa do temido erro `column does not exist`.

Postgres tem dois comportamentos com nomes de colunas:
- Se você definir seu nome de coluna sem aspas duplas postgres deixa o nome em minúsculas.
- Se você definir seu nome de coluna COM aspas duplas, você precisa usar aspas duplas para sempre.

Por exemplo:

Nesta tabela:

```sql
CREATE table foo("myColumn" int);
```

- Isto não funcionará: `select myColumn from foo`
- Isto funcionará: `select "myColumn" from foo`

Veja [esta resposta do StackOverflow](https://stackoverflow.com/a/20880247/18818) ou [esta seção no manual do PostgreSQL](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)

## Linux (Snap)

### O Filepicker mostra 'pequenos retângulos' ao invés de uma fonte
![Image Alt Tag](../assets/images/troubleshooting-58.png)

Este é um problema com o próprio `snapd` e como ele isola apps da configuração de fontes (ou não, neste caso). Isto parece aparecer com Arch, Manjaro e Fedora, eu acho porque a equipe do snap se importa principalmente com snaps funcionando no Ubuntu.

Solução alternativa:

```bash
sudo rm -f /var/cache/fontconfig/*
rm -f ~/.cache/fontconfig
```

Veja para referência:
- [Bug relatado com snapd](https://bugs.launchpad.net/snappy/+bug/1916816)
- [Discussão nos fóruns snapcraft](https://forum.snapcraft.io/t/snap-store-fonts-on-arch-linux-are-merely-empty-rectangles/15373/9)

## Windows

### O App está preso executando em segundo plano
Se você acabou de instalar o app no Windows e o app se recusa a iniciar (com seu gerenciador de tarefas relatando que está executando), você pode precisar instalar os [Redistributables MSVC](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170) para sua arquitetura.

Este é um problema com uma de nossas dependências nativas, e estamos trabalhando em uma correção mais permanente para este problema no instalador.