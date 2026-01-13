---
title: Google Big Query
summary: "Como conectar ao Google Big Query do Beekeeper Studio, executar consultas, modificar tabelas e mais!"
old_url: "https://docs.beekeeperstudio.io/docs/google-bigquery"
icon: simple/googlebigquery
---


Conectar ao Google BigQuery requer que você configure um usuário IAM (seja um 'user' ou um 'service account', não importa) e baixe o arquivo json de chave privada para esse usuário.

## Papel IAM Mínimo Requerido

**BigQuery User**

(ou BigQuery Data Viewer + BigQuery Job User)

No mínimo usuários precisam ter o papel `BigQuery User`. Isso fornece acesso à maioria dos recursos do Beekeeper Studio.

Isso *não* fornecerá acesso à funcionalidade completa do seu cluster BigQuery. Se você precisar de acesso mais avançado recomendamos usar `BigQuery Admin` para desbloquear modificação de esquema e dados.

Seu administrador Google Cloud pode provavelmente fornecer controles mais granulares se necessário.


## Conectando do Beekeeper Studio

Uma vez que você configurou seu usuário IAM e baixou seu arquivo JSON de chave privada, você só precisa das seguintes informações para conectar à sua instância Big Query:

1. ID do Projeto Google Cloud
2. Dataset padrão Big Query para usar uma vez conectado
3. Caminho para o arquivo de chave primária JSON

![Image Alt Tag](../../assets/images/google-bigquery-101.png)


## Pegadinha: Use datasets específicos de região apenas

Ao configurar um dataset no BigQuery tenha certeza de especificar explicitamente uma região.

![Image Alt Tag](../../assets/images/google-bigquery-100.png)

Se você escolher 'Multi-Region' muitas funções comuns não funcionarão, tanto no Beekeeper Studio quanto no console Google Cloud.

Exemplos de tarefas que não funcionarão com multi-região habilitado:

- Fazer upload de um CSV
- Visualizar estrutura de tabela
- Importar dados
- Linkar dados de um bucket de storage
- Linkar dados do S3
- Copiar dados do S3 ou de um bucket de storage



Ao conectar ao BigQuery do Beekeeper Studio, forneça o caminho para este arquivo JSON de chave privada para se autenticar com o Google Cloud. Este é o único método de autenticação atualmente suportado pelo Beekeeper Studio.