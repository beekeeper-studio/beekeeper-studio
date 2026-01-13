---
title: Gerenciamento de Transação Manual
summary: "Um guia sobre como funciona o Gerenciamento de Transação Manual do Beekeeper Studio"
icon: octicons/git-commit-16
---

O Modo de Transação Manual do Beekeeper permite que você garanta que tem controle total sobre quando transações são commitadas, enquanto também garante que não deixe transações abertas por acidente.

Você encontrará esta opção no canto inferior esquerdo do Editor SQL

![A screenshot of the Beekeeper SQL Editor, showcasing the new Auto/Manual Commit toggle.](../../assets/images/auto-commit-editor.png)

## Começar Transação
Uma vez que você entrou neste modo, toda consulta estará dentro de uma transação e deve ser commitada ou revertida para que essas mudanças sejam refletidas em seu banco de dados. Você pode iniciar uma transação clicando no botão `Begin` no canto inferior esquerdo do editor, ou apenas executando uma consulta, caso em que o Beekeeper automaticamente adicionará uma declaração begin à sua consulta.

![A screenshot of the Beekeeper SQL Editor with manual commit activated](../../assets/images/manual-commit-editor.png)

## Transações Ativas
Quando uma transação começa, reservamos uma conexão para aquela aba para que nenhum contexto seja perdido, e você terá acesso aos botões `Commit` e `Rollback`. Como precaução, há também um timeout definido para todas as transações. O padrão é 10 minutos, com um período de aviso de 1 minuto. Isso significa que por padrão, após 9 minutos você será notificado que uma transação ainda está aberta, e será instruído a finalizar a transação, ou mantê-la viva por mais 10 minutos.

![A screenshot of the Beekeeper SQL Editor with an active transaction](../../assets/images/active-transaction.png)

## Configuração
Você pode alterar alguns dos padrões para este sistema usando o [arquivo de configuração](../configuration.md) (para todo banco de dados, ou apenas um sistema de banco de dados específico).

```ini
[db.default]
; Número máximo de transações manuais para permitir de uma vez
; Isso deve ser mantido abaixo do tamanho máximo do pool para o banco de dados, já que essas conexões
; são retiradas desse pool
maxReservedConnections = 2 ; Permitir duas transações ativas de uma vez
; Por quanto tempo manter uma transação aberta sem qualquer atividade antes de automaticamente revertê-la no modo de commit manual
manualTransactionTimeout = 600000 ; 10 Minutos
; A quantidade de tempo antes de um rollback automático para avisar o usuário que está prestes a acontecer
autoRollbackWarningWindow = 60000 ; 1 Minuto

[db.postgres]
maxReservedConnections = 4 ; Permitir 4 transações ativas de uma vez (apenas para postgres)
```

Esta funcionalidade está atualmente disponível apenas para Postgres, CockroachDB, Redshift, MySQL, MariaDB, SQLServer, Firebird e Oracle.