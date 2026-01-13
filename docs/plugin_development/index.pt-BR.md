---
title: Introdução
summary: "Aprenda como desenvolver, distribuir e gerenciar plugins para o Beekeeper Studio para estender sua funcionalidade."
icon: material/puzzle
---

# Introdução

!!! warning "Funcionalidade Beta"
    O sistema de plugins está em beta (disponível no Beekeeper Studio 5.3+). As coisas podem mudar, mas adoraríamos seu feedback!

O Sistema de Plugins do Beekeeper Studio permite que desenvolvedores estendam a funcionalidade do aplicativo através da interface do usuário (UI). Plugins executam em um `<iframe>` o que significa que são isolados e se comunicam com o aplicativo principal através de uma API estruturada.

![Plugin Manager mostrando dois plugins instalados e informações detalhadas do plugin AI Shell](/assets/images/plugin-manager-modal.png)

## O Que São Plugins?

Plugins são aplicações web (HTML, CSS, JavaScript) que executam dentro do Beekeeper Studio para fornecer funcionalidade adicional.

## Como Plugins Funcionam

Plugins do Beekeeper Studio executam como aplicações web standalone incorporadas dentro de um `<iframe>`. Cada plugin é isolado e se comunica com o aplicativo host usando [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

Aqui está um resumo do fluxo interno:

### 1. Descoberta de Plugin

O Beekeeper Studio busca um índice de plugin (um arquivo JSON) do registro central de plugins:

```
https://raw.githubusercontent.com/beekeeper-studio/beekeeper-studio-plugins/main/plugins.json
```

Cada entrada neste arquivo aponta para um manifest de plugin, que contém metadados, configuração de UI e a URL do ponto de entrada do plugin.

Você pode explorar ou contribuir para o registro de plugins no GitHub: [beekeeper-studio/beekeeper-studio-plugins](https://github.com/beekeeper-studio/beekeeper-studio-plugins)

### 2. Instalação

Quando um plugin é instalado via Plugin Manager:

- O manifest do plugin é baixado.

- O manifest aponta para um arquivo `.zip` contendo o bundle do plugin (assets HTML/CSS/JS).

- O arquivo é descompactado e armazenado localmente dentro do diretório de plugins do Beekeeper Studio.

### 3. Execução Isolada

Cada plugin é carregado em um `<iframe>` com atributos `sandbox`, limitando o acesso ao ambiente host a menos que explicitamente permitido via API do plugin. O iframe é servido usando um protocolo Electron customizado: `plugin://`, que é definido especificamente para o Beekeeper Studio. Este protocolo ajuda a isolar plugins de conteúdo web externo e é acessível apenas dentro do aplicativo Beekeeper Studio.

### 4. Comunicação via Message-Passing

Plugins se comunicam com o Beekeeper Studio usando `postMessage`. Este sistema suporta dois tipos de mensagens: **requests** e **notifications**.

- Um **request** espera uma resposta. Por exemplo, chamar `getTables` retornará uma lista de tabelas.

- Uma **notification** envia dados sem esperar uma resposta. Por exemplo, quando o tema muda, o Beekeeper Studio notifica o plugin via uma notificação `themeChanged`.

O pacote [@beekeeperstudio/plugin](https://www.npmjs.com/package/@beekeeperstudio/plugin) fornece funções auxiliares para lidar com comunicação como `getTables()`, `runQuery()`, etc.

### 5. Integração de UI

Plugins declaram suas views (abas ou sidebars) no arquivo manifest. O Beekeeper Studio renderiza essas views dinamicamente e injeta o `<iframe>` correspondente no local designado na UI.

## Próximo Passo

-   **[Comece a Construir](creating-your-first-plugin.md)** - Crie seu primeiro plugin