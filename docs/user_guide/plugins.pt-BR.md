---
title: Plugins
summary: "Estenda o Beekeeper Studio com plugins poderosos que adicionam nova funcionalidade e melhoram seu fluxo de trabalho de banco de dados."
icon: material/puzzle
---

# Plugins

Plugins estendem o Beekeeper Studio com funcionalidade adicional, trazendo novas ferramentas e capacidades diretamente para seu fluxo de trabalho de banco de dados. Pense neles como add-ons especializados que melhoram o que você pode fazer com seus dados.

![Plugin Manager showing available plugins](../assets/images/plugin-manager-modal.png)

## O que são Plugins?

Plugins são mini-aplicações que executam dentro do Beekeeper Studio para fornecer funcionalidade especializada. Eles aparecem como novas abas ou painéis da barra lateral, integrando-se perfeitamente com o resto da interface.

Cada plugin opera em seu próprio ambiente seguro enquanto tem acesso às suas conexões de banco de dados e capacidades de consulta através de uma interface controlada.

## Quem Pode Usar Plugins?

Plugins estão disponíveis para **todos os usuários do Beekeeper Studio**, incluindo aqueles usando a Edição Comunitária gratuita.

No entanto, alguns plugins individuais podem ter seus próprios requisitos de acesso. Por exemplo, plugins premium desenvolvidos pela equipe do Beekeeper Studio podem requerer uma assinatura paga.

## Plugins Disponíveis

### AI Shell

**Requer Assinatura Paga**

![AI Shell answering user's question](../assets/images/ai-shell.png)

O plugin AI Shell traz inteligência artificial diretamente para seu fluxo de trabalho de banco de dados. Faça perguntas sobre seus dados em português simples e obtenha respostas inteligentes alimentadas por IA.

O AI Shell aparece como um novo tipo de aba que você pode abrir junto com suas abas de consulta regulares, com um visualizador de resultados incorporado para quaisquer consultas que executa.

## Instalando Plugins

1. Vá para Tools > Manage Plugins
2. Encontre o plugin que deseja instalar
3. Clique em **Install**

## Atualizando Plugins

O Beekeeper Studio verifica automaticamente por atualizações de plugins toda vez que você inicia a aplicação. Quando atualizações estão disponíveis, o Beekeeper Studio automaticamente baixará e instalará. Ou você pode desabilitar este comportamento:

1. Vá para Tools > Manage Plugins
2. Encontre o plugin
3. Desmarque **Auto-update**

## Desinstalando Plugins

1. Vá para Tools > Manage Plugins
2. Encontre o plugin
3. Clique em **Uninstall**

## Instalando uma Versão Específica de Plugin

Às vezes você pode precisar de uma versão específica de plugin - talvez o plugin mais recente requeira uma versão mais nova do Beekeeper Studio do que você tem, você não pode atualizar o app por alguma razão, ou você precisa fazer downgrade para uma versão mais antiga do plugin. Aqui está como instalar manualmente qualquer versão de plugin:

1. **Desabilite auto-update primeiro**
    - Vá para Tools > Manage Plugins
    - Encontre o plugin do qual deseja instalar uma versão específica
    - Desmarque **Auto-update** (isso previne o Beekeeper Studio de atualizá-lo de volta para a versão mais recente)

2. **Encontre o plugin no Plugin Manager**
    - Vá para Tools > Manage Plugins
    - Encontre seu plugin e clique no **link GitHub**

3. **Navegue para releases**
    - Vá para a página **Releases** no GitHub
    - Navegue pelas versões disponíveis

4. **Verifique compatibilidade de versão**
    - Clique em um release para ver seus assets
    - Procure por `manifest.json` nas notas do release ou assets
    - Verifique o campo `minAppVersion` para garantir compatibilidade com sua versão do Beekeeper Studio
    - Note o `id` do plugin do manifest

5. **Baixe o plugin**
    - Baixe o arquivo ZIP (ex., `bks-ai-shell-1.2.0.zip`, não o arquivo de código fonte)

6. **Instale manualmente**
    - Navegue para seu diretório de plugins:

        === "Linux"
            ```bash
            ~/.config/beekeeper-studio/plugins/
            ```

        === "macOS"
            ```bash
            ~/Library/Application Support/beekeeper-studio/plugins/
            ```

        === "Windows"
            ```
            %APPDATA%\beekeeper-studio\plugins\
            ```

        === "Portable"
            ```bash
            /path/to/beekeeper-studio/beekeeper-studio-data/plugins/
            ```

    - Encontre a pasta do plugin existente e delete-a
    - Crie uma nova pasta com o mesmo ID do plugin
    - Extraia o conteúdo do arquivo ZIP baixado para esta nova pasta

7. **Reinicie o Beekeeper Studio**

    A versão específica do plugin deve agora estar instalada e pronta para uso.

## Solicitações de Funcionalidades

Tem ideias para novos plugins ou funcionalidades? Adoraríamos ouvir de você:

-   Envie-nos um email através dos canais de suporte
-   Junte-se às nossas discussões da comunidade
-   Submeta solicitações de funcionalidades em nosso repositório GitHub

!!! tip
    Interessado em desenvolver seus próprios plugins? Confira nossa [documentação de Desenvolvimento de Plugins](../plugin_development/index.md) para começar!