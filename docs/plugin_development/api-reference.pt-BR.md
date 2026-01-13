---
title: Referência da API do Plugin
summary: "Referência completa da API para desenvolvimento de plugins do Beekeeper Studio."
icon: material/api
---

# Referência da API do Plugin

!!! warning "Funcionalidade Beta"
    O sistema de plugins está em beta (disponível no Beekeeper Studio 5.3+). As coisas podem mudar, mas adoraríamos seu feedback!

A API do Plugin do Beekeeper Studio é acessível através do pacote `@beekeeperstudio/plugin`. A API fornece comunicação entre seu plugin e o aplicativo principal.

## Instalação

=== "npm"
    ```bash
    npm install @beekeeperstudio/plugin
    ```

=== "yarn"
    ```bash
    yarn add @beekeeperstudio/plugin
    ```

## Funções Principais

| Função | Descrição |
|----------|-------------|
| `request(name, args?)` | Envia solicitações para o Beekeeper Studio para recuperar dados ou executar ações. Retorna uma Promise. |
| `notify(name, args)` | Envia notificações unidirecionais para o aplicativo principal sem esperar uma resposta. |
| `addNotificationListener(name, callback)` | Escuta notificações do aplicativo principal (como mudanças de tema). |
| `setDebugComms(enabled)` | Habilita ou desabilita o log de debug para comunicação do plugin. Útil para desenvolvimento. |

## Debugging

### setDebugComms

Habilita o log de debug para ver toda a comunicação entre seu plugin e o Beekeeper Studio. Isso é útil ao desenvolver plugins para entender quais mensagens estão sendo enviadas e recebidas.

**Uso:**
```javascript
// Habilita log de debug
setDebugComms(true);

// Agora toda comunicação será logada no console do navegador
const tables = await getTables();

// Desabilita log de debug
setDebugComms(false);
```

**Esquema de Argumentos:**
```typescript
{ enabled: boolean }
```

!!! tip "Fluxo de Trabalho de Desenvolvimento"
    Habilite comunicações de debug no início do seu processo de desenvolvimento para ver exatamente quais dados estão sendo trocados. Isso torna muito mais fácil solucionar problemas e entender o comportamento da API do plugin.

## Métodos de Solicitação

### getTables

Obter uma lista de tabelas do banco de dados atual.

**Uso:**
```javascript
// Obter todas as tabelas
const tables = await getTables();

// Obter tabelas de esquema específico
const tables = await getTables({ schema: 'public' });
```

**Exemplo de Resposta:**
```javascript
[
  {
    name: "users",
    schema: "public"
  },
  {
    name: "orders",
    schema: "public"
  }
]
```

**Esquema de Argumentos:**
```typescript
{ schema?: string }
```

**Esquema de Resposta:**
```typescript
{ name: string; schema?: string }[]
```

### getColumns

Obter informações de colunas para uma tabela específica.

**Uso:**
```javascript
const columns = await getColumns({
  table: 'users',
  schema: 'public'
});
```

**Exemplo de Resposta:**
```javascript
[
  {
    name: "id",
    type: "integer"
  },
  {
    name: "email",
    type: "varchar"
  }
]
```

**Esquema de Argumentos:**
```typescript
{ table: string; schema?: string }
```

**Esquema de Resposta:**
```typescript
{ name: string; type: string }[]
```

### runQuery

Executar uma consulta SQL no banco de dados atual.

!!! warning "Nenhuma Sanitização de Consulta"
    A consulta será executada exatamente como fornecida sem modificação ou sanitização. Sempre valide e sanitize a entrada do usuário antes de incluí-la em consultas para prevenir ações indesejadas.

**Uso:**
```javascript
const result = await runQuery({
  query: 'SELECT * FROM users WHERE active = true LIMIT 10'
});
```

**Exemplo de Resposta:**
```javascript
{
  results: [
    {
      fields: [
        { id: "1", name: "id", dataType: "integer" },
        { id: "2", name: "email", dataType: "varchar" }
      ],
      rows: [
        { id: 1, email: "user1@example.com" },
        { id: 2, email: "user2@example.com" }
      ]
    }
  ]
}
```

**Esquema de Argumentos:**
```typescript
{ query: string }
```

**Esquema de Resposta:**
```typescript
{
  results: {
    fields: { id: string; name: string; dataType?: string }[];
    rows: Record<string, unknown>[];
  }[];
  error?: unknown;
}
```

### getConnectionInfo

Obter informações sobre a conexão atual do banco de dados.

**Uso:**
```javascript
const connectionInfo = await getConnectionInfo();
```

**Exemplo de Resposta:**
```javascript
{
  connectionType: "postgresql",
  databaseName: "myapp_production",
  defaultSchema: "public",
  readOnlyMode: false
}
```

**Esquema de Resposta:**
```typescript
{
  connectionType: string;
  databaseName: string;
  defaultSchema?: string;
  readOnlyMode: boolean;
}
```

**Tipos de Conexão Suportados:**

| Valor | Banco de Dados |
|-------|----------|
| `postgresql` | PostgreSQL |
| `mysql` | MySQL |
| `mariadb` | MariaDB |
| `sqlite` | SQLite |
| `sqlserver` | SQL Server |
| `oracle` | Oracle Database |
| `mongodb` | MongoDB |
| `cassandra` | Apache Cassandra |
| `clickhouse` | ClickHouse |
| `firebird` | Firebird |
| `bigquery` | Google BigQuery |
| `redshift` | Amazon Redshift |
| `duckdb` | DuckDB |
| `libsql` | LibSQL |

### setTabTitle

Definir o título da aba atual do plugin.

**Uso:**
```javascript
await setTabTitle({ title: 'Ferramenta de Análise de Dados' });
```

**Esquema de Argumentos:**
```typescript
{ title: string }
```

### expandTableResult

Exibir resultados de consulta no painel de tabela inferior (apenas abas tipo shell).

**Uso:**
```javascript
await expandTableResult({
  results: [
    {
      fields: [
        { id: "1", name: 'id', dataType: 'integer' },
        { id: "2", name: 'name', dataType: 'varchar' }
      ],
      rows: [
        { id: 1, name: 'John', age: 30 }
      ]
    }
  ]
});
```

**Esquema de Argumentos:**
```typescript
{
  results: {
    fields: { id: string; name: string; dataType?: string }[];
    rows: Record<string, unknown>[];
  }[]
}
```

!!! tip "Dicas de Exibição de Tabela"
    - Os resultados substituirão quaisquer dados de tabela existentes
    - Os conjuntos de dados não são paginados. Cuidado com grandes conjuntos de dados!

### getViewState

Obter o estado atual da sua instância de visualização.

!!! tip "Saiba mais sobre State da View [aqui](plugin-views.md#view-state)."

**Uso:**
```javascript
const state = await getViewState();
console.log('Estado atual:', state);
```

**Esquema de Resposta:**
```typescript
any
```

### setViewState

Armazenar estado para sua instância de visualização.

!!! tip "Saiba mais sobre State da View [aqui](plugin-views.md#view-state)."

**Uso:**
```javascript
await setViewState({
  state: {
    selectedTable: 'users',
    filters: ['active = true']
  }
});
```

**Esquema de Argumentos:**
```typescript
any
```

## Notificações

### themeChanged

Disparado quando o tema do aplicativo muda.

**Uso:**
```javascript
addNotificationListener('themeChanged', (args) => {
  // Aplicar novo tema ao seu plugin
  document.documentElement.style.setProperty('--primary-color', args.palette.primary);
  document.body.className = `theme-${args.type}`;
});
```

**Esquema:**
```typescript
{
  palette: Record<string, string>;
  cssString: string;
  type: "dark" | "light";
}
```

### windowEvent

!!! info "Uso Interno"
    Esta notificação é principalmente para uso interno.

Disparado para vários eventos de janela.

**Uso:**
```javascript
addNotificationListener('windowEvent', (args) => {
  if (args.eventType === 'resize') {
    // Lidar com redimensionamento da janela
    adjustLayout();
  }
});
```

**Esquema:**
```typescript
{
  eventType: string;
  eventClass: "MouseEvent" | "KeyboardEvent" | "PointerEvent" | "Event";
  eventInitOptions: MouseEventInit | KeyboardEventInit | PointerEventInit;
}
```

## Definições de Tipos

### Result

| Propriedade      | Tipo       | Descrição |
|---------------|------------|-------------|
| `rows`        | `object[]` | Array de linhas de resultado |
| `fields`      | `Field[]`  | Array de definições de campo |
| `rowCount`    | `number`   | Número de linhas retornadas |
| `affectedRows`| `number`   | Número de linhas afetadas (para INSERT/UPDATE/DELETE) |

### Field

| Propriedade   | Tipo     | Descrição |
|------------|----------|-------------|
| `name`     | `string` | Nome da coluna |
| `dataType` | `string` | Tipo de dados da coluna |

### Column

| Propriedade       | Tipo      | Descrição |
|----------------|-----------|-------------|
| `name`         | `string`  | Nome da coluna |
| `dataType`     | `string`  | Tipo de dados da coluna |
| `nullable`     | `boolean` | Se a coluna permite valores NULL |
| `primaryKey`   | `boolean` | Se a coluna é parte da chave primária |
| `defaultValue` | `any`     | Valor padrão para a coluna |

### Table

| Propriedade     | Tipo     | Descrição |
|--------------|----------|-------------|
| `name`       | `string` | Nome da tabela |
| `schema`     | `string` | Nome do esquema |
| `entityType` | `string` | Tipo da entidade (tipicamente "table") |

### Tab

| Propriedade | Tipo      | Descrição |
|----------|-----------|-------------|
| `id`     | `string`  | Identificador único da aba |
| `title`  | `string`  | Título de exibição da aba |
| `type`   | `string`  | Tipo da aba ("plugin", "query", etc.) |
| `active` | `boolean` | Se a aba está atualmente ativa |