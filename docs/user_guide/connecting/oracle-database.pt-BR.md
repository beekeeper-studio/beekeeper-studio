---
title: Oracle Database
summary: "Instruções específicas para fazer conexões com Oracle Database"
description: "O Beekeeper Studio suporta conectar a bancos de dados Oracle tanto em modo thin quanto thick. Este guia fornece instruções para configurar o Oracle Instant Client e conectar ao seu banco de dados."
old_url: "https://docs.beekeeperstudio.io/docs/oracle-database"
icon: material/database
---

# Como Conectar ao Oracle Database

O Beekeeper Studio suporta conectar a bancos de dados Oracle em dois modos:

1. **Modo Thin**: Este é o modo padrão e não requer configuração adicional. Nem todas as opções de conexão estão disponíveis neste modo. Se você receber um erro de `thin mode`, pode precisar usar `Modo Thick`.
2. **Modo Thick**: Este modo requer que o Oracle Instant Client esteja instalado em seu sistema. Permite opções de conexão mais avançadas e é recomendado para a maioria dos usuários.

Para uma comparação de como modo thin e thick diferem, veja a documentação do Oracle Database [no site da Oracle](https://node-oracledb.readthedocs.io/en/latest/user_guide/appendix_a.html#oracle-database-features-supported-by-node-oracledb)

## Requisitos do Modo Thick

1. Em todos os sistemas operacionais você deve ter o Oracle Instant Client instalado.
2. No Linux você deve ter `libaio-dev` (apt) / `libaio-devel` (yum/dnf) instalado.
3. Para Ubuntu 24.04+ Você também precisa fazer um symlink: `sudo ln -s /usr/lib/x86_64-linux-gnu/libaio.so.1t64 /usr/lib/x86_64-linux-gnu/libaio.so.1`

Abaixo estão instruções específicas para cada um dos requisitos acima

### Baixar Oracle Instant Client

Baixe o Instant Client [do site da Oracle](https://www.oracle.com/cis/database/technologies/instant-client/downloads.html).

Escolha o download para seu sistema operacional.

[![Oracle Instant Client download page](../../assets/images/instant-client-download.png)](https://www.oracle.com/cis/database/technologies/instant-client/downloads.html)


### Linux: Instalar libaio

```bash
sudo apt-get install libaio1 libaio-dev #debian/ubuntu
sudo yum install libaio #redhat/fedora
```

## Conectando a Bancos de Dados Oracle

Há várias maneiras de conectar a um banco de dados Oracle usando o Beekeeper Studio.

1. String de conexão PSA
1. String de conexão SID ou Service Name
2. Alias TSA
3. Host e porta

## Usando tnsnames.ora

Você pode especificar seu diretório 'config' ao adicionar uma conexão Oracle. O Beekeeper Studio usará isso para encontrar seu arquivo tnsnames.ora, você pode então usar um alias em sua string de conexão.

### Digite Sua String de Conexão Oracle

Se você está usando uma string de conexão para conectar ao seu banco de dados, o Beekeeper suporta todas as formas comuns de strings de conexão Oracle. Veja os exemplos abaixo, ou [mais no site da Oracle](https://docs.oracle.com/en/database/other-databases/essbase/21/essoa/connection-string-formats.html)

#### Exemplos de String de Conexão Oracle

```bash
# String de conexão PDB
<host>:<porta>/<PDB>

# exemplo simples com SID ou nome de serviço
<host>:<porta>/<SID ou servicename>

# Nome de serviço longo
(DESCRIPTION=(ADDRESS=(host=host_name)(protocol=protocol_name)(port=port_number))
      (CONNECT_DATA=(SERVICE_NAME=service_name)))

 # Versão longa com SID
 (DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(Host=host_name)(Port=port))(CONNECT_DATA=(SID=sid_here)))
```