---
title: Referência do Manifest do Plugin
summary: "Referência completa para o arquivo manifest.json que define a estrutura e capacidades do seu plugin."
icon: material/code-json
---

# Referência do Manifest do Plugin

!!! warning "Funcionalidade Beta"
    O sistema de plugins está em beta (disponível no Beekeeper Studio 5.3+). As coisas podem mudar, mas adoraríamos seu feedback!

O arquivo `manifest.json` define os metadados, capacidades, configurações e permissões do seu plugin. Este arquivo deve estar localizado na raiz do seu diretório de plugin.

## Manifest

| Propriedade         | Tipo                   | Obrigatório | Descrição                                                                                                                |
| ---------------- | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `string`               | Sim      | Identificador único para seu plugin. Use apenas letras minúsculas, números e hífens.                                      |
| `name`           | `string`               | Sim      | Nome de exibição mostrado aos usuários no Plugin Manager e UI.                                                                 |
| `author`         | `string \| AuthorInfo` | Sim      | Nome do autor do plugin ou organização.                                                                                        |
| `description`    | `string`               | Sim      | Breve descrição do que seu plugin faz.                                                                               |
| `version`        | `string`               | Sim      | Versão semântica do seu plugin (ex: "1.0.0", "2.1.5").                                                                |
| `icon`           | `string`               | Não       | Nome do ícone Material UI. Veja [Material Icons](https://fonts.google.com/icons?icon.set=Material+Icons) para opções disponíveis. |
| `capabilities`   | `Capabilities`         | Sim      | Define quais views seu plugin fornece.                                                                                  |
| `pluginEntryDir` | `string`               | Não       | Caminho para os arquivos construídos do seu plugin relativo à raiz do plugin. Padrão é a raiz do projeto.                                 |

<details>
<summary>Manifest Ainda Não Implementado</summary>
<table>
    <thead>
        <tr>
            <th>Propriedade</th>
            <th>Tipo</th>
            <th>Obrigatório</th>
            <th>Descrição</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>minAppVersion</code></td>
            <td><code>string</code></td>
            <td>Não</td>
            <td>Versão mínima do Beekeeper Studio necessária.</td>
        </tr>
        <tr>
            <td><code>settings</code></td>
            <td><code>Setting[]</code></td>
            <td>Não</td>
            <td>Opções de configuração que podem ser definidas via arquivos de configuração.</td>
        </tr>
        <tr>
            <td><code>permissions</code></td>
            <td><code>Permission[]</code></td>
            <td>Não</td>
            <td>Lista de permissões que seu plugin requer.</td>
        </tr>
    </tbody>
</table>
</details>

## AuthorInfo

| Propriedade | Tipo     | Obrigatório | Descrição                   |
| -------- | -------- | -------- | ----------------------------- |
| `name`   | `string` | Sim      | Nome do autor ou organização.  |
| `url`    | `string` | Sim      | URL do autor ou organização.   |

## Capabilities

| Propriedade | Tipo     | Obrigatório | Descrição                               |
| -------- | -------- | -------- | ----------------------------------------- |
| `views`  | `View[]` | Sim      | Array de definições de view para seu plugin. |

## View

| Propriedade | Tipo       | Obrigatório | Descrição                                       |
| -------- | ---------- | -------- | ------------------------------------------------- |
| `id`     | `string`   | Sim      | Identificador único para esta view.                  |
| `name`   | `string`   | Sim      | Nome de exibição mostrado em abas/sidebar.              |
| `type`   | `ViewType` | Sim      | Tipo da view.                                     |
| `entry`  | `string`   | Sim      | Caminho para o arquivo HTML relativo à raiz do plugin.   |

## ViewType

| Valor                 | Descrição                                                                            |
| --------------------- | -------------------------------------------------------------------------------------- |
| `"shell-tab"`         | Aba com o iframe do seu plugin no topo e uma tabela de resultados colapsável na base. |
| `"base-tab"`          | Interface de aba completa.                                                                    |
| `"primary-sidebar"`   | Painel da sidebar primária. _(Planejado para versões futuras)_                                 |
| `"secondary-sidebar"` | Painel da sidebar secundária. _(Planejado para versões futuras)_                               |


## Exemplo Básico

```json
{
    "id": "my-database-plugin",
    "name": "Database Analyzer",
    "author": "Seu Nome",
    "description": "Analisa performance do banco de dados e fornece sugestões de otimização",
    "version": "1.0.0",
    "icon": "analytics",
    "capabilities": {
        "views": [
            {
                "id": "analyzer-tab",
                "name": "Analyzer",
                "type": "shell-tab",
                "entry": "index.html"
            }
        ]
    }
}
```

### Formato Legado (Depreciado)

Para compatibilidade com versões anteriores, o formato antigo `tabTypes` ainda é suportado:

```json
{
    "capabilities": {
        "views": {
            "tabTypes": [
                {
                    "id": "data-visualizer",
                    "name": "Data Visualizer",
                    "kind": "shell",
                    "entry": "tab.html"
                }
            ]
        }
    }
}
```