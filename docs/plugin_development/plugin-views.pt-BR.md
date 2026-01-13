---
title: Views de Plugin
summary: "Aprenda sobre os diferentes tipos de views de plugin disponíveis no Beekeeper Studio e como implementá-las."
icon: material/view-dashboard
---

# Views de Plugin

!!! warning "Funcionalidade Beta"
    O sistema de plugins está em beta (disponível no Beekeeper Studio 5.3+). As coisas podem mudar, mas adoraríamos seu feedback!

Plugins podem se integrar com o Beekeeper Studio através de diferentes tipos de views, cada um projetado para casos de uso específicos. Views definem onde e como a interface do seu plugin aparece dentro do aplicativo.

## Views de Aba

Views de aba aparecem como abas na área principal do workspace, junto com abas de consulta e outro conteúdo.

### Plain (Planejado)

!!! info "Em Breve"
    Views plain estão planejadas para versões futuras e fornecerão espaço completo da aba para seu plugin.

Views plain oferecerão todo o espaço da aba para a interface do seu plugin, sem seções predefinidas.

### Shell

A view shell é perfeita para plugins que precisam exibir dados ou resultados. Ela fornece:

- **Seção Superior**: A interface iframe do seu plugin
- **Seção Inferior**: Uma tabela de resultados integrada para exibir dados

Este layout é ideal para plugins que consultam ou analisam dados, pois os usuários podem interagir com os controles do seu plugin no topo e ver os resultados no formato de tabela familiar abaixo.

![Exemplo de View Shell](/assets/images/plugin-shell-view.png)

**Exemplo de Manifest:**

```json
{
  "capabilities": {
    "views": [
      {
        "id": "data-analyzer",
        "name": "Data Analyzer",
        "type": "shell-tab",
        "entry": "index.html",
      }
    ]
  }
}
```

## Views de Sidebar (Planejado)

!!! info "Em Breve"
    Views de sidebar estão planejadas para versões futuras.

Views de sidebar aparecem como painéis persistentes na sidebar do aplicativo, permanecendo visíveis enquanto os usuários trabalham com outro conteúdo.

![Exemplo de View de Sidebar](/assets/images/plugin-sidebar-view.png)

**Exemplo de Manifest:**

```json
{
  "capabilities": {
    "views": [
      {
        "id": "quick-reference",
        "name": "SQL Reference",
        "type": "secondary-sidebar",
        "entry": "sidebar.html",
      }
    ]
  }
}
```

## Views Múltiplas

Um único plugin pode declarar múltiplas views:

```json
{
  "capabilities": {
    "views": [
      {
        "id": "main-interface",
        "name": "Data Processor",
        "type": "shell-tab",
        "entry": "main.html",
      },
      {
        "id": "quick-tools",
        "name": "Quick Tools",
        "type": "secondary-sidebar",
        "entry": "tools.html",
      }
    ]
  }
}
```

## Estado da View

Cada view de plugin pode armazenar e recuperar seu próprio estado usando os métodos da API `getViewState` e `setViewState`. Este estado persiste através de reinicializações do aplicativo.

### Isolamento de Estado

O estado da view é isolado por instância de view. Isso significa:

- Cada view mantém seu próprio estado separado
- Views não podem acessar o estado uma da outra
- Se um usuário abrir múltiplas abas do mesmo plugin, cada aba tem seu próprio estado independente

Por exemplo, se o usuário criar duas abas do AI Shell, cada aba manterá dados de estado completamente separados e não pode acessar as informações armazenadas da outra aba.

### Exemplo

```javascript
// Salvar estado quando usuário interage
await setViewState({
    conversations: [
        "Ai: Olá, como posso ajudá-lo hoje?",
        "Human: Faça uma receita de sanduíche simples usando SQL.",
    ]
});

// Restaurar estado quando view carrega
const state = await getViewState();
if (state) {
    setConversations(state.conversations);
}
```

## Próximos Passos

- **[Criando Plugins](creating-plugins.md)** - Aprenda como construir seu primeiro plugin
- **[Referência do Manifest](manifest.md)** - Documentação completa do arquivo manifest
- **[Referência da API](api-reference.md)** - APIs de plugin disponíveis