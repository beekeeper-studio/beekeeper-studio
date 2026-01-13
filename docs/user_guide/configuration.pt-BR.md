---
title: Configuração
summary: "Customize o comportamento do Beekeeper Studio com arquivos de configuração INI - ajuste atalhos, timeouts, configurações de segurança e mais."
old_url: ""
icon: material/cog
---

# Configuração

O Beekeeper Studio usa um sistema de configuração `ini` que permite customizar o app para combinar com seu fluxo de trabalho e preferências. Usando arquivos de configuração INI simples, você pode ajustar tudo desde atalhos de teclado e timeouts de conexão de banco de dados até configurações de segurança como proteção por PIN.

!!! tip "Início Rápido"
    Novo em configuração? Pule para a [seção Começando](#getting-started-with-configuration) para um passo a passo simples, ou confira nossas [configurações de exemplo](#example-configurations) para ver customizações comuns.

## Arquivos de Configuração

O Beekeeper Studio usa um sistema de configuração de três camadas que lhe dá controle flexível sobre configurações. Configurações são carregadas na ordem abaixo.

| Configuração | Propósito                                       | Ordem de Carregamento |
| ------------------- | --------------------------------------------- | ---- |
| **Padrão**         | Configurações baseline que vêm com o app      | Primeiro |
| **Usuário**            | Suas customizações pessoais                  | Segundo |
| **Administrador**   | Configurações para toda a máquina (controladas por admin)      | Terceiro |

Isso significa: Configurações de Admin sobrescrevem configurações de usuário, configurações de usuário sobrescrevem configurações padrão. Administradores de TI podem impor políticas fornecendo uma configuração de Administrador para toda a máquina.

{% include-markdown '../includes/config_file_directories.md'%}


## Como Usar Arquivos de Configuração

### Passo 1: Crie Seu Arquivo de Configuração

Decida qual arquivo alterar (usuário ou administrador). Se o arquivo ainda não existe, crie-o usando qualquer editor de texto. Aqui está uma configuração inicial simples. Posso colocar isso na minha **configuração de Usuário**:

```ini
; Minha Configuração do Beekeeper Studio
; Linhas começando com ponto e vírgula são comentários

[ui.tableTable]
pageSize = 200                          ; Mostrar mais linhas por página

```

### Passo 2: Salvar e Reiniciar

1. Salve seu arquivo de configuração
2. Reinicie o Beekeeper Studio
3. Suas novas configurações entrarão em efeito


!!! warning "Configuração Não Funcionando?"
    Se suas mudanças não estão tendo efeito:

    - **Localização do arquivo**: Garanta que seu arquivo de configuração está no diretório correto para seu OS
    - **Erros de sintaxe**: Verifique sintaxe INI (cabeçalhos de seção em `[colchetes]`, espaços ao redor de `=`)
    - **Reinicialização necessária**: Mudanças de configuração requerem uma reinicialização completa da aplicação
    - **Nomes de configuração**: Verifique por erros de digitação em nomes de seção ou chaves de configuração
    - **Permissões de arquivo**: Garanta que o arquivo de configuração é legível pelo Beekeeper Studio
    - **Verificar logs**: Habilite logging de debug para ver detalhes de carregamento de configuração

## Referência de Configuração

Abaixo estão os valores padrão de configuração para o Beekeeper Studio, copie e modifique conforme necessário.
{% ini-include %}