---
title: Backup e Restauração
summary: "Faça backup de todo seu banco de dados (ou apenas uma parte) - esquemas, dados, ou ambos."
old_url: "https://docs.beekeeperstudio.io/docs/backup-restore"
icon: material/backup-restore
---

O Beekeeper Studio fornece uma interface para ferramentas nativas para facilmente fazer backup e restaurar seus bancos de dados.

## Ferramentas Suportadas
- Postgres
	- `pg_dump` e `pg_restore`
- MySQL/MariaDb
	- `mysqldump` e `mysql`
- SQLite
	- `sqlite3`

## Fazer Backup ou Restaurar um Banco de Dados
Backup e Restauração podem ambos ser encontrados na seção de ferramentas do menu do app:
![The tools section of the app menu](../assets/images/backup-restore-89.png)

Após selecionar Backup ou Restore, você será guiado através de uma série de passos para gerar o comando para a ferramenta de banco de dados fornecida pelo fornecedor.

A aba Backup:
1. Escolher Entidades
2. Configurar Backup
3. Revisar e Executar

A aba Restore:
1. Configurar Restore
2. Revisar e Executar

### Escolher Entidades
Aqui você pode escolher o que quer fazer backup do seu banco de dados. Para todos os dialetos suportados, não selecionar nenhuma entidade resultará em um backup completo do banco de dados.

![The first step of the backup wizard: selecting objects to backup](../assets/images/backup-restore-91.png)

### Configurar Backup/Restore
É aqui que você configurará exatamente como a ferramenta nativa de backup/restore se comportará. Temos uma seleção de configurações comumente usadas que podemos colocar para você com o clique de uma checkbox ou uma seleção de um dropdown.

![The second step of the backup wizard: configuring command line flags](../assets/images/backup-restore-92.png)

### Argumentos Customizados
Se uma opção que você precisa não é suportada, também fornecemos a você a habilidade de adicionar flags customizadas ao comando.

![The box for setting custom command line flags for backup/restore](../assets/images/backup-restore-93.png)

### Revisar e Executar
Finalmente você pode ver o comando gerado que será executado (menos qualquer informação sensível, que é fornecida em variáveis de ambiente).

![The review of the command that has been generated for backup/restore.](../assets/images/backup-restore-94.png)

Se você preferir executar este comando no terminal você mesmo, pode copiá-lo para sua área de transferência aqui também! Você pode ter que definir algumas variáveis de ambiente para permitir que a ferramenta se conecte adequadamente ao seu banco de dados.

Caso contrário, você pode nos deixar executar o comando para você e assistir acontecer dentro do app.

## Monitorando Progresso de Backup/Restore
Se você escolher executar o processo dentro do app, pode monitorar o progresso do comando conforme executa desta tela:
![Command Progress screen](../assets/images/backup-restore-154.png)

Mostramos as últimas 100 linhas ou mais dos logs para você ler enquanto a ferramenta faz sua coisa, mas se algo der muito errado, também despejamos todos os logs em um arquivo temporário para todas suas necessidades de debug.