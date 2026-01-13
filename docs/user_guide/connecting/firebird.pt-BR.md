---
title: Firebird
summary: "Como conectar ao Firebird 3+ do Beekeeper Studio com Autenticação Legada"
icon: material/database
---

O Beekeeper Studio ainda não suporta o protocolo wire do firebird 3+, então seu servidor firebird precisa permitir conexões legadas.

!!! Warning
    Se segurança é uma preocupação, você não deve usar o plugin de autenticação Legacy_Auth. O método de conexão legado envia passwords pela rede sem criptografia, não suporta criptografia de protocolo wire, e também limita (trunca!) o comprimento utilizável da password para 8 bytes.


## Localizar Firebird.conf

`firebird.conf` é geralmente localizado no diretório de instalação do seu servidor firebird. Pode variar por distribuição mas tipicamente parece com isso:

| SO             | Caminho Padrão                                       |
|----------------|----------------------------------------------------|
| Linux ou MacOS | /opt/firebird/firebird.conf                        |
| Windows        | %ProgramFiles%\Firebird\Firebird_5_0\firebird.conf |


## Configurando autenticação legada de cliente

Para configurar autenticação legada no Firebird 3, você precisa adicionar o seguinte em `firebird.conf`:

```
AuthServer = Srp, Legacy_Auth
WireCrypt = Enabled # ou Disabled
UserManager = Legacy_UserManager
```

Para configurar autenticação legada no Firebird 4+, você precisa adicionar o seguinte em `firebird.conf`:

```
AuthServer = Srp256, Srp, Legacy_Auth
WireCrypt = Enabled # ou Disabled
UserManager = Legacy_UserManager
```