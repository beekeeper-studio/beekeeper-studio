---
title: Publicando Plugins
summary: "Aprenda como empacotar, distribuir e publicar seus plugins do Beekeeper Studio."
icon: material/publish
---

# Publicando Plugins

!!! warning "Funcionalidade Beta"
    O sistema de plugins está em beta (disponível no Beekeeper Studio 5.3+). As coisas podem mudar, mas adoraríamos seu feedback!

## Processo de Publicação

### 1. Criar um Repositório GitHub

Crie um repositório GitHub público. Ele deve conter pelo menos um arquivo `README.md`.

### 2. Criar uma Release GitHub

!!! important "Correspondência de Versão"
    Certifique-se de que a versão da sua tag git corresponde à versão no seu arquivo `manifest.json`. Por exemplo, se seu manifest mostra `"version": "1.0.0"`, use a tag `v1.0.0`.

#### Usando o Template Starter

Se você criou seu projeto usando nosso template starter, você já tem um workflow GitHub que automatiza este processo! Simplesmente crie e envie uma tag semver com prefixo "v":

```bash
git tag v1.0.0
git push origin v1.0.0
```

O workflow automaticamente:
- Constrói seu plugin
- Cria o arquivo ZIP
- Gera uma release rascunho com os assets necessários

!!! important "Publique o Rascunho"
    O workflow cria uma **release rascunho**. Você ainda precisa ir ao GitHub, revisar o rascunho e clicar **"Publish release"** para torná-la pública e marcá-la como a release mais recente.

#### Processo de Release Manual

Se você não está usando o template starter, crie uma release **latest** manualmente com uma **tag semver** prefixada com "v" (ex: `v1.0.0`) e **dois assets obrigatórios**:

1. **`manifest.json`** - Seu arquivo manifest do plugin
2. **`{pluginId}-{version}.zip`** - Arquivo ZIP contendo todos os arquivos do plugin

Por exemplo, um plugin com:
- **Plugin ID**: `my-awesome-plugin`
- **Versão**: `1.0.0` (no manifest.json)
- **Tag Git**: `v1.0.0` (deve corresponder à versão do manifest)

Sua release deve incluir:
- `manifest.json`
- `my-awesome-plugin-1.0.0.zip`

!!! example "Exemplo Real"
    Veja o [repositório AI Shell](https://github.com/beekeeper-studio/bks-ai-shell) para um exemplo funcionando.

### 3. Submeter ao Registro de Plugins

1. **Fork** o repositório de registro: [beekeeper-studio-plugins](https://github.com/beekeeper-studio/beekeeper-studio-plugins)

2. **Edite `plugins.json`** e adicione a entrada do seu plugin:
   ```diff
   [
     {
       // Outros plugins...
     },
   + {
   +   "id": "my-awesome-plugin",
   +   "name": "My Awesome Plugin",
   +   "author": "Seu Nome",
   +   "description": "Breve descrição do que seu plugin faz",
   +   "repo": "seuusuario/my-awesome-plugin"
   + }
   ]
   ```

3. **Crie um pull request** com suas mudanças

### 4. Revisão e Aprovação

Uma vez que você submeter seu PR:

1. **Processo de revisão** - Os mantenedores revisarão seu plugin quanto à qualidade e segurança
2. **Aprovação e merge** - Após aprovação, seu PR será mergeado
3. **Disponibilidade pública** - Seu plugin se torna disponível no Plugin Manager do Beekeeper Studio

Os usuários podem então descobrir e instalar seu plugin diretamente de dentro do Beekeeper Studio! 🎉