---
title: Trino
summary: "O suporte Trino está atualmente em alpha inicial"
icon: simple/trino
description: "Conecte a um coordenador Trino para executar consultas usando o Beekeeper Studio"
---

# Suporte Trino

Volte frequentemente pois estamos fazendo atualizações contínuas ao nosso suporte Trino.

Super animado em ter suporte Trino aqui para vocês. Por favor tenham em mente que Trino está apenas nos estágios iniciais de implementação, mas queríamos lançar para vocês para teste.

O suporte foi limitado basicamente a um estado "apenas leitura" já que qualquer forma de escrita deve ser feita nos confins do próprio banco de dados.

## Como Conectar
Conectar a um banco de dados Trino do Beekeeper Studio é direto. Selecione Trino do dropdown, e preencha os campos host, porta, username e password do Cluster Trino (não de qualquer dos bancos de dados subjacentes), então clique Connect.

### Detalhes de Conexão Trino

Para conectar a um banco de dados Trino, você precisará das seguintes informações:

- **Host**: O endereço IP ou hostname do seu servidor Trino.
- **Porta**: A porta padrão é 8080, mas isso pode ser customizado se seu servidor usa uma porta diferente.
- **Username**: Seu username Trino, com padrão sendo o default típico.
- **Password**: Sua password Trino, se aplicável.
- **Catálogo Padrão (opcional)**: O catálogo ao qual quer se conectar inicialmente na inicialização

### Testando Sua Conexão Trino

Antes de salvar os detalhes da sua conexão, o Beekeeper Studio permite testar a conexão:

1. Digite os detalhes da sua conexão.
2. Clique no botão *Test Connection*.
3. Se o teste for bem-sucedido, você está pronto para conectar. Caso contrário, verifique seus detalhes e tente novamente.

### Salvando Sua Conexão Trino

Uma vez que os detalhes da sua conexão foram verificados, você pode escolher salvá-los inserindo um nome, marcando a caixa `Save Passwords` se desejado, e então clicando save.

## Recursos Suportados

- Visualização de dados de tabela
- Ordenação e filtragem de dados de tabela
- Visualização de estrutura de tabela
- Baixar resultados de consulta como JSON, CSV ou Markdown

## Ainda TBD

- Tunelamento SSH
- Executar consulta(s) diretamente para arquivo