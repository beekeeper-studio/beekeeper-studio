---
title: Como Conectar ao ClickHouse
# meta:
#     title: Como conectar ao ClickHouse
description: Conectar ao ClickHouse é super fácil, mesmo sobre um túnel SSH ou com TLS/SSL, no Windows, Mac e Linux.
# summary: Conectar ao ClickHouse é super fácil, mesmo sobre um túnel SSH ou com TLS/SSL, no Windows, Mac e Linux.
icon: simple/clickhouse
---

# Como Conectar ao ClickHouse

Conectar a um banco de dados ClickHouse do Beekeeper Studio é direto. Simplesmente selecione ClickHouse do dropdown, e preencha os campos host, porta, username e password, então clique Connect.

## Detalhes de Conexão ClickHouse

Para conectar a um banco de dados ClickHouse, você precisará das seguintes informações:

- Host: O endereço IP ou hostname do seu servidor ClickHouse.
- Porta: A porta padrão é 9000, mas isso pode ser customizado se seu servidor usa uma porta diferente.
- Username: Seu username ClickHouse, com padrão sendo o default típico.
- Password: Sua password ClickHouse, se aplicável.

## Testando Sua Conexão ClickHouse

Antes de salvar os detalhes da sua conexão, o Beekeeper Studio permite testar a conexão:

1. Digite os detalhes da sua conexão.
2. Clique no botão Test Connection.
3. Se o teste for bem-sucedido, você está pronto para conectar. Caso contrário, verifique seus detalhes e tente novamente.

## Salvando Sua Conexão ClickHouse

Uma vez que os detalhes da sua conexão foram verificados, você pode escolher salvá-los inserindo um nome, marcando a caixa `Save Passwords` se desejado, e então clicando save.

![Saving connection form](../../assets/images/saving-connection.png)

## Configurações Avançadas ClickHouse (Opcional)

Para usuários que precisam de configurações avançadas:

- Configurações TLS/SSL: Se seu servidor ClickHouse requer uma conexão segura, expanda as configurações TLS/SSL e configure os certificados e chaves necessários se necessário.
- Túnel SSH: Se você precisa conectar ao seu servidor ClickHouse via um túnel SSH, pode configurar as configurações SSH expandindo as configurações SSH Tunnel e configurando os detalhes necessários do servidor SSH.