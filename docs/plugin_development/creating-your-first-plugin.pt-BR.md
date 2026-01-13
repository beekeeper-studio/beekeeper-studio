---
title: Criando Seu Primeiro Plugin
summary: "Guia passo a passo para criar seu primeiro plugin do Beekeeper Studio."
icon: material/hammer-wrench
---

# Criando Seu Primeiro Plugin

!!! warning "Funcionalidade Beta"
    O sistema de plugins está em beta (disponível no Beekeeper Studio 5.3+). As coisas podem mudar, mas adoraríamos seu feedback!

Vamos construir um simples plugin "Hello World"! Você criará uma nova aba que mostra "Hello World!" e aprenderá como interagir com bancos de dados. Perfeito para começar! 🚀

## O Que Você Precisa

-   Conhecimento básico de HTML, CSS e JavaScript
-   Node.js e npm/yarn instalados
-   Beekeeper Studio instalado

## Início Rápido (3 Opções)

### Opção 1: Projeto Vite ⭐ *Recomendado*

**Por que Vite?** Vite fornece uma boa experiência de desenvolvimento com Hot Module Replacement (HMR). Quando você faz alterações no código do seu plugin, verá atualizações refletidas no Beekeeper Studio sem precisar recarregar manualmente o plugin ou reiniciar o aplicativo. Isso ajuda a agilizar o processo de desenvolvimento.

Vite também é bem direto de configurar. Com um `vite.config.ts` simples e nosso plugin oficial, você obtém suporte TypeScript, recursos JavaScript modernos, empacotamento de assets e builds de produção.

#### 1. Crie um projeto Vite

=== "npm"
    ```bash
    npm create vite@latest hello-world-plugin
    cd hello-world-plugin
    ```

=== "yarn"
    ```bash
    yarn create vite hello-world-plugin
    cd hello-world-plugin
    ```

#### 2. Instale o plugin Vite do Beekeeper Studio

=== "npm"
    ```bash
    npm install @beekeeperstudio/vite-plugin
    ```

=== "yarn"
    ```bash
    yarn add @beekeeperstudio/vite-plugin
    ```

#### 3. Crie o arquivo manifest

Crie `manifest.json` para definir seu plugin:

```json
{
    "id": "hello-world-plugin",
    "name": "Hello World Plugin",
    "author": {
        "name": "Seu Nome",
        "url": "https://seusite.com"
    },
    "description": "Meu primeiro plugin incrível!",
    "version": "1.0.0",
    "capabilities": {
        "views": [
            {
                "id": "hello-world-tab",
                "name": "Hello World",
                "type": "shell-tab",
                "entry": "dist/index.html"
            }
        ]
    }
}
```

#### 4. Crie/atualize `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import bks from '@beekeeperstudio/vite-plugin'

export default defineConfig({
  plugins: [bks()],
})
```

#### 5. Link ao Beekeeper Studio

Crie um link simbólico para que o Beekeeper Studio possa encontrar seu plugin:

=== "Linux"
    ```bash
    ln -s $(pwd) ~/.config/beekeeper-studio/plugins/hello-world-plugin
    ```

=== "macOS"
    ```bash
    ln -s $(pwd) "~/Library/Application Support/beekeeper-studio/plugins/hello-world-plugin"
    ```

=== "Windows"
    ```cmd
    mklink /D "%APPDATA%\beekeeper-studio\plugins\hello-world-plugin" "%CD%"
    ```

=== "Versão Portátil"
    ```bash
    ln -s $(pwd) /path/to/beekeeper-studio/beekeeper-studio-data/plugins/hello-world-plugin
    ```

!!! tip "Por que linkar ao invés de copiar diretamente?"
    Isso mantém seu código seguro! Se você desinstalar acidentalmente o plugin, seu código fonte não será deletado.

#### 6. Execute o servidor de desenvolvimento

=== "npm"
    ```bash
    npm run dev
    ```

=== "yarn"
    ```bash
    yarn dev
    ```

Agora você tem hot reload! Mudanças no seu código serão automaticamente atualizadas no Beekeeper Studio.

---

### Opção 2: Use o Template Starter (sem Vite)

#### 1. Clone nosso template pronto para uso

```bash
git clone https://github.com/beekeeper-studio/bks-plugin-starter.git hello-world-plugin
cd hello-world-plugin
```

#### 2. Linke à pasta de plugins do Beekeeper Studio

=== "Linux"
    ```bash
    ln -s $(pwd) ~/.config/beekeeper-studio/plugins/hello-world-plugin
    ```

=== "macOS"
    ```bash
    ln -s $(pwd) "~/Library/Application Support/beekeeper-studio/plugins/hello-world-plugin"
    ```

=== "Windows"
    ```cmd
    mklink /D "%APPDATA%\beekeeper-studio\plugins\hello-world-plugin" "%CD%"
    ```

!!! tip "Por que linkar ao invés de copiar diretamente?"
    Isso mantém seu código seguro! Se você desinstalar acidentalmente o plugin, seu código fonte não será deletado.

---

### Opção 3: Construir do Zero

Quer entender cada pedaço? Vamos construir passo a passo:

#### Passo 1: Crie Sua Pasta do Plugin

Primeiro, crie uma pasta em qualquer lugar que você goste para seu plugin:

```bash
mkdir hello-world-plugin
cd hello-world-plugin
```

Então linke ao diretório de plugins do Beekeeper Studio:

=== "Linux"
    ```bash
    ln -s $(pwd) ~/.config/beekeeper-studio/plugins/hello-world-plugin
    ```

=== "macOS"
    ```bash
    ln -s $(pwd) "~/Library/Application Support/beekeeper-studio/plugins/hello-world-plugin"
    ```

=== "Windows"
    ```cmd
    mklink /D "%APPDATA%\beekeeper-studio\plugins\hello-world-plugin" "%CD%"
    ```

=== "Versão Portátil"
    ```bash
    ln -s $(pwd) /path/to/beekeeper-studio/beekeeper-studio-data/plugins/hello-world-plugin
    ```

!!! tip "Por que linkar ao invés de copiar diretamente?"
    Isso mantém seu código seguro! Se você desinstalar acidentalmente o plugin, seu código fonte não será deletado.

#### Passo 2: Crie o Manifest

Crie `manifest.json` - isso diz ao Beekeeper Studio sobre seu plugin:

```json
{
    "id": "hello-world-plugin",
    "name": "Hello World Plugin",
    "author": {
        "name": "Seu Nome",
        "url": "https://seusite.com"
    },
    "description": "Meu primeiro plugin incrível!",
    "version": "1.0.0",
    "capabilities": {
        "views": [
            {
                "id": "hello-world-tab",
                "name": "Hello World",
                "type": "shell-tab",
                "entry": "index.html"
            }
        ]
    }
}
```

#### Passo 3: Crie a Interface

Crie `index.html` - a página principal do seu plugin:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World Plugin</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 2rem;
            background: #f8f9fa;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            text-align: center;
        }
        h1 {
            color: #2d3748;
            margin-bottom: 1rem;
        }
        p {
            color: #4a5568;
            margin-bottom: 1.5rem;
        }
        button {
            background: #3182ce;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
        }
        button:hover { background: #2c5aa0; }
        .tables {
            margin-top: 1rem;
            padding: 1rem;
            background: #e6fffa;
            border-radius: 0.5rem;
            display: none;
        }
        .tables.show { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Seu plugin funciona!</h1>
        <p>Edite este HTML e recarregue para ver as mudanças.</p>
    </div>
</body>
</html>
```

Agora você deve ter:
```
hello-world-plugin/
├── manifest.json
└── index.html
```

## Teste! 🧪

!!! note "Para Usuários do Vite"
    Se você está usando Vite, certifique-se de que seu servidor de desenvolvimento esteja rodando primeiro!

1. **Abra o Beekeeper Studio**
2. **Vá para Ferramentas → Gerenciar Plugins**
3. **Procure por "Hello World Plugin"** - se estiver lá, você está ótimo! ✨

    ![Plugin Manager mostrando plugin instalado](../../assets/images/plugin-manager.png)

4. **Conecte a qualquer banco de dados**
5. **Clique na seta dropdown** ao lado do botão +
6. **Selecione "Hello World"** do menu
7. **Pronto!** Seu plugin abre em uma nova aba 🎯

![Menu dropdown de nova aba](../../assets/images/new-tab-dropdown.png)
![Aba do plugin rodando](../../assets/images/plugin-tab.png)

## Torne Interativo! 🎮

Vamos adicionar interação com banco de dados! Primeiro, instale a dependência do plugin:

=== "npm"
    ```bash
    npm install @beekeeperstudio/plugin
    ```

=== "yarn"
    ```bash
    yarn add @beekeeperstudio/plugin
    ```

Crie `main.js`:

```javascript
// Essencial: habilita manipulação adequada de eventos
import "./node_modules/@beekeeperstudio/plugin/dist/eventForwarder.js";
import { getTables } from "./node_modules/@beekeeperstudio/plugin/dist/index.js";

async function showTables() {
    try {
        const tables = await getTables();
        const tablesDiv = document.querySelector(".tables");
        tablesDiv.innerHTML = `<strong>Tabelas:</strong> ${tables.map(t => t.name).join(", ")}`;
        tablesDiv.classList.add("show");
    } catch (error) {
        console.error("Falhou ao obter tabelas:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#show-tables-btn")?.addEventListener("click", showTables);
});
```

Atualize seu HTML adicionando isso dentro da div container (depois da tag `<p>`):

```html
<button id="show-tables-btn">Mostrar Tabelas do Banco de Dados</button>
<div class="tables"></div>
<script type="module" src="main.js"></script>
```

![Plugin com botão interativo](../../assets/images/interactive-plugin.png)

## Sincronização de Tema (Opcional) 🎨

!!! note "Em Breve!"
    Sincronização automática de tema está planejada. Por enquanto, aqui está como fazer manualmente.

Faça seu plugin combinar com o tema do Beekeeper Studio:

**Adicione ao seu `main.js`:**

```javascript
import { addNotificationListener } from "./node_modules/@beekeeperstudio/plugin/dist/index.js";

// Sincronizar com tema do app
addNotificationListener("themeChanged", (args) => {
    const css = `:root { ${args.cssString} }`;
    let style = document.getElementById("bks-theme-style");

    if (style) {
        style.innerHTML = css;
    } else {
        style = document.createElement("style");
        style.id = "bks-theme-style";
        style.innerHTML = css;
        document.head.appendChild(style);
    }
});
```

**Atualize seu CSS para usar variáveis de tema:**

```css
body {
    background-color: var(--query-editor-bg, #f8f9fa);
    color: var(--text-dark, #333);
}

button {
    background-color: var(--theme-base, #3182ce);
    color: white;
}

.tables {
    background-color: var(--brand-success-light, #e6fffa);
}
```

Os valores de fallback (após a vírgula) garantem que seu plugin funcione mesmo antes da sincronização de tema ser inicializada.

## Resultado Final 🎉

**Seu `index.html` completo:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World Plugin</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 2rem;
            background-color: var(--query-editor-bg, #f8f9fa);
            color: var(--text-dark, #333);
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            text-align: center;
        }
        h1 {
            color: #2d3748;
            margin-bottom: 1rem;
        }
        p {
            color: #4a5568;
            margin-bottom: 1.5rem;
        }
        button {
            background: var(--theme-base, #3182ce);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
        }
        button:hover { opacity: 0.9; }
        .tables {
            margin-top: 1rem;
            padding: 1rem;
            background: var(--brand-success-light, #e6fffa);
            border-radius: 0.5rem;
            display: none;
        }
        .tables.show { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Seu plugin funciona!</h1>
        <p>Edite este HTML e recarregue para ver as mudanças.</p>

        <button id="show-tables-btn">Mostrar Tabelas do Banco de Dados</button>
        <div class="tables"></div>

        <script type="module" src="main.js"></script>
    </div>
</body>
</html>
```

**Seu `main.js` completo:**

```javascript
// Imports essenciais
import "./node_modules/@beekeeperstudio/plugin/dist/eventForwarder.js";
import {
    getTables,
    addNotificationListener,
} from "./node_modules/@beekeeperstudio/plugin/dist/index.js";

// Mostrar tabelas do banco de dados
async function showTables() {
    try {
        const tables = await getTables();
        const tablesDiv = document.querySelector(".tables");
        tablesDiv.innerHTML = `<strong>Tabelas:</strong> ${tables.map(t => t.name).join(", ")}`;
        tablesDiv.classList.add("show");
    } catch (error) {
        console.error("Falhou ao obter tabelas:", error);
    }
}

// Sincronização de tema
addNotificationListener("themeChanged", (args) => {
    const css = `:root { ${args.cssString} }`;
    let style = document.getElementById("bks-theme-style");

    if (style) {
        style.innerHTML = css;
    } else {
        style = document.createElement("style");
        style.id = "bks-theme-style";
        style.innerHTML = css;
        document.head.appendChild(style);
    }
});

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#show-tables-btn")?.addEventListener("click", showTables);
});
```

![Exemplo completo do plugin rodando](../../assets/images/complete-plugin-example.png)

## Qual é o Próximo? 🚀

-   **[Referência da API do Plugin](api-reference.md)** - Explore todas as funções disponíveis
-   **[Publicando Plugins](publishing-plugins.md)** - Compartilhe sua criação com o mundo!