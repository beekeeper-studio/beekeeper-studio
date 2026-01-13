---
title: Localização de Armazenamento de Dados
summary: "Onde o Beekeeper Studio armazena suas consultas SQL e conexões quando você as salva."
old_url: "https://docs.beekeeperstudio.io/docs/deep-dive-overview"
---

Quando você salva conexões e consultas SQL no Beekeeper Studio elas são persistidas para um banco de dados SQLite no diretório de configuração do aplicativo.

## Localização do Banco de Dados

O banco de dados se chama `app.db` e é armazenado na pasta `userData` que o sistema operacional fornece para o Beekeeper Studio armazenar configurações e preferências.

### Localizações do diretório userData:

- Windows: `<User Directory>\AppData\Roaming\beekeeper-studio`
- MacOS: `~/Library/Application Support/Beekeeper Studio`
    - Nota: O diretório ~/Library é tipicamente oculto no Finder. No entanto, você pode usar Ir -> Ir para Pasta para abrir este diretório.
- Linux: `~/.config/beekeeper-studio`

## Acesse o Banco de Dados do Beekeeper Studio....Do Beekeeper Studio

Se você navegar para `Ajuda -> Adicionar Banco de Dados do Beekeeper` o aplicativo adicionará uma nova conexão de banco de dados para você usar - o próprio banco de dados do Beekeeper.

Você pode usar esta conexão para explorar seus dados salvos, exportar consultas SQL, ou fazer o que precisar.