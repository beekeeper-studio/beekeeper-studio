---
title: SurrealDB
summary: "O suporte SurrealDB está atualmente em alpha inicial"
icon: simple/surrealdb
description: "Conectando ao SurrealDB sobre websocket ou http"
---

# Como Conectar ao SurrealDB

Conectar a uma instância SurrealDB é simples. Selecione SurrealDB do dropdown, e preencha os campos protocolo, host, porta, username e password, então clique Connect.

## Detalhes de Conexão SurrealDB

Para conectar a uma instância SurrealDB, você precisará das seguintes informações:

- Protocolo: O protocolo sobre o qual deseja se comunicar. Atualmente suportamos ws, wss, http e https.
- Host: O endereço IP ou hostname da sua instância SurrealDB
- Porta: A porta padrão é 8000, mas isso pode ser customizado se seu servidor usa uma porta diferente.
- Método de Autenticação: Escolha dos vários métodos de autenticação fornecidos pelo Surreal
- Username: Seu username SurrealDB.
- Password: Sua password SurrealDB.

# Suporte SurrealDB

Esta ainda é uma implementação inicial do nosso suporte para SurrealDB. Volte frequentemente pois estamos fazendo atualizações contínuas ao nosso suporte SurrealDB.

## Recursos Suportados

- Visualização de dados de tabela
- Ordenação e filtragem de dados de tabela
- Visualização de estrutura de tabela (para tabelas com esquema)
- Barra lateral de entidades
- Editando dados
- Executando consultas contra seu banco de dados
- Export
- Tunelamento SSH

## Ainda TBD
- Import
- Edição de Esquema
- Backup/Restore