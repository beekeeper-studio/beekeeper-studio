---
title: Como Conectar ao SQLite
summary: "Conecte a um banco de dados SQLite dando duplo clique, da linha de comando, ou do app. Você também pode opcionalmente carregar extensões de runtime"
description: Conecte ao SQLite dando duplo clique, da linha de comando, ou do app. Funciona no Mac, Linux e Windows.
old_url: "https://docs.beekeeperstudio.io/docs/sqlite"
icon: simple/sqlite
---

# Como Conectar ao SQLite

Conectar a um banco de dados SQLite do app é bem fácil, simplesmente selecione `SQLite` do dropdown, escolha seu arquivo SQLite, então clique `connect`.

## Conectar ao SQLite dando duplo clique

Quando você instala o Beekeeper Studio ele criará uma associação para arquivos com as seguintes extensões: `.db`, `.sqlite3`, e `.sqlite`.

Contanto que o Beekeeper Studio permaneça o app padrão para esses tipos de arquivo, você pode agora apenas dar duplo clique em qualquer arquivo SQLite para abri-lo no Beekeeper Studio.

## Abrindo arquivos SQLite da linha de comando

Você também pode usar seu terminal para abrir um banco de dados no Beekeeper Studio contanto que tenha as associações de arquivo configuradas.

- **MacOS** `open ./path/to/example.db`
- **Linux** `xdg-open ./path/to/example.db`

## Habilitando Extensões de Runtime SQLite

SQLite suporta [extensões de runtime](https://www.sqlite.org/loadext.html). Isso fornece capacidades estendidas para interagir com SQLite.

Há muitas dessas extensões, muitas delas são open source. Por exemplo [sqlean](https://github.com/nalgeon/sqlean) é uma extensão que fornece uma variedade de novas funções e recursos desde funções de crypto, até manipulação de array.

O Beekeeper Studio fornece a habilidade de carregar uma extensão SQLite sempre que você conecta a um banco de dados SQLite.

Esta é uma configuração **global**, então se aplica a qualquer e todas as conexões SQLite na máquina.

Para adicionar uma extensão de runtime, expanda o bloco de configurações `Runtime Extension` e escolha o arquivo.

![SQLite runtime extensions loader](../../assets/images/sqlite-88.png)

### Requisitos de Extensão SQLite

1. A extensão de runtime deve ser compilada para o sistema operacional que você está usando atualmente
2. A extensão de runtime deve ter a extensão de arquivo correta
	- Windows: `.dll`
    - MacOS: `.dylib`
    - Linux: `.so`