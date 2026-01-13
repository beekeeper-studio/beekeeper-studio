---
title: Workspaces em Nuvem
summary: "Armazene suas conexões e consultas na nuvem para trabalhar em múltiplas máquinas, ou colaborar com outros."
old_url: "https://docs.beekeeperstudio.io/docs/cloud-storage-team-workspaces"
icon: material/cloud-sync
---


Workspaces tornam fácil trabalhar em múltiplos computadores armazenando seus dados (conexões e consultas) na nuvem.

Ainda melhor, workspaces permitem que múltiplas pessoas trabalhem do mesmo conjunto de dados colaborativamente.

Consultas e Conexões armazenadas em um workspace estão disponíveis apenas para uso através do app Beekeeper Studio, não através de uma interface web.

![Image Alt Tag](../assets/images/cloud-storage-team-workspaces-28.png)

## Conceitos

1. **Workspace** - Um espaço colaborativo online para `membros` trabalharem em `consultas` e `conexões`. Você ganha um desses quando cria uma assinatura no [painel da conta](https://app.beekeeperstudio.io)
2. **Membro do Workspace** - Alguém com acesso para visualizar e editar consultas e conexões.
3. **Admin do Workspace** - Um membro do workspace com privilégios adicionais, incluindo a habilidade de convidar novos usuários para o workspace.
4. **Proprietário do Workspace** - A pessoa que criou o workspace. Proprietários podem adicionar e remover membros, promover membros a admins, e gerenciar o workspace.
5. **Pasta Pessoal** - Todo membro do workspace tem uma pasta `pessoal` onde novas consultas e conexões são salvas por padrão. Itens em sua pasta pessoal *não* são compartilhados com outros.
6. **Pasta da Equipe** - Se você quer compartilhar uma conexão ou consulta com colegas de equipe, mova-a para a pasta da equipe. Todos no workspace têm acesso a esta pasta.

## Acesso ao Workspace

Workspaces são gratuitos contanto que você mantenha uma assinatura ativa do Beekeeper Studio.

## Começando

Leva apenas alguns minutos para começar com workspaces.

Quando conectado a um Workspace, você só pode usar conexões e consultas que estão salvas nesse workspace (você não pode usar conexões ou consultas do seu workspace local). Isso torna workspaces em nuvem ótimos para segmentar tarefas de banco de dados por cliente, equipe, ou projeto.

Não se preocupe - Você pode facilmente importar consultas e conexões existentes para seu workspace.

<video controls>
    <source id="workspaces" type="video/mp4" src="https://assets.beekeeperstudio.io/workspaces-walkthrough.mp4" />
</video>
<small>Vídeo passo a passo de como usar workspaces</small>

### 1. Registre-se e crie um workspace

Clique no botão `(+)` na barra lateral global para criar um workspace. Dê qualquer nome que gostar! Se você ainda não tem uma conta de workspace do Beekeeper Studio será redirecionado para a interface web para criar uma.

### 2. Adicione conexões ao seu workspace

Clique em `import` para mover conexões do seu workspace local existente para seu workspace em nuvem, ou apenas crie novas conexões como normal.

Quaisquer conexões adicionadas ao workspace serão salvas na nuvem.

### 3. Conecte-se a um banco de dados e adicione consultas

Uma vez conectado a uma conexão do workspace você poderá usar o Beekeeper Studio como normal. A diferença é que você só pode usar consultas salvas que são parte do seu workspace em nuvem.

Como com conexões você pode `importar` suas consultas locais para seu workspace e opcionalmente compartilhá-las com sua equipe.

### 4. Compartilhe recursos com sua equipe

Por padrão quando você adiciona uma conexão ou consulta a um workspace elas serão armazenadas na pasta pessoal. Embora sejam salvas na nuvem, apenas você tem acesso a itens na pasta pessoal.

Se você quer compartilhar algo com sua equipe do workspace, clique com o botão direito na conexão/consulta e selecione `Move to team`.

Itens em sua pasta `team` são acessíveis por todos os membros do workspace.

## Gerenciando Membros do Workspace

### Convidando Usuários

Tanto proprietários quanto admins do workspace podem convidar novos usuários para juntar-se ao workspace:

1. Faça login no seu workspace no Beekeeper Studio
2. Clique no nome do workspace na barra lateral
3. Selecione "Invite Users" do menu
4. Digite o endereço de email da pessoa que deseja convidar
5. O convidado receberá um email com instruções para juntar-se ao seu workspace

### Gerenciando Privilégios de Admin

O proprietário do workspace pode promover membros regulares a admins:

1. Faça login no [painel do Beekeeper Studio][dashboard]
2. Navegue para as configurações do seu workspace
3. Encontre o membro na lista e clique em "Promote to Admin"

Admins podem convidar novos usuários mas não podem promover outros membros a status de admin ou remover o status de admin de outros membros. Apenas o proprietário do workspace tem esses privilégios.

## Deletando um Workspace

O proprietário do workspace pode deletá-lo do [painel][dashboard]. Se você deletar seu workspace, seus dados serão arquivados por 30 dias, então permanentemente deletados sem forma de recuperar.


[dashboard]: https://app.beekeeperstudio.io