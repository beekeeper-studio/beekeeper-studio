---
title: AI Shell
icon: octicons/sparkles
summary: SQL AI Pair programming - answer questions about your database or build something new.
icon: octicons/sparkles-fill-16
---
<!--
![AI Shell Video](https://placehold.co/600x400?text=AI_WALKTHROUGH_VIDEO) -->

![AI overview](../assets/images/ai/ai-overview-image.png)

The Beekeeper Studio AI Shell is modelled after [Claude Code](https://www.anthropic.com/claude-code) and [Aider](https://aider.chat/). It is designed to increase the productivity of technical users (like you!).



## Deep Coding and AI Self Learning

The AI Shell embeds your agent right inside Beekeeper Studio. It has deep SQL awareness and the ability to explore schemas, understand relations and constraints, and write and execute SQL (with permission), right inside the app.

[See our website](https://beekeeperstudio.io/features/ai-sql) for videos, screenshots, and more.

## How to use the AI Shell

1. Choose your AI provider of choice (in beta only Anthropic is available)
2. Enter your API key
3. Ask questions
4. The AI explores your data
5. Get results
6. Ask more questions

## AI Shell Pricing

The AI Shell **is included in all paid versions of Beekeeper Studio**, with no additional charge. Note that you are responsible for the costs incurred with your AI provider, as Beekeeper does not act as a middle-man in any way.

All downloads of Beekeeper Studio come with a 14 day free trial, [download Beekeeper Studio](https://beekeeperstudio.io/get) to try the AI Shell right now.

## AI Shell Tools

Your AI agent has access to the following tools from within Beekeeper Studio:

- [x] Listing schemas, tables, views, functions, and procedures
- [x] Viewing table relations and constraints
- [x] Looking at your saved queries for guidance
- [x] Checking your open tabs for guidance
- [x] Writing and executing SQL (with permission)

![AI Tools walkthrough](../assets/images/ai/ai-helpful-tools.png)

## AI Shell Configuration

You can configure the AI Shell using the Beekeeper Studio [configuration system](./configuration.md).

{% ini-include section="plugins.bks-ai-shell" %}

## Custom Instructions

You can provide custom instructions to personalize how the AI Shell responds to your messages. To add custom instructions:

1. Open the settings menu (⚙️).
2. Go to the General tab.
3. Add your custom instructions in the provided text field

Your instructions are appended to the AI Shell’s base instructions and are included with **every message you send** as a system prompt, ensuring consistent behavior across sessions.
For details, see [the instructions repository](https://github.com/beekeeper-studio/bks-ai-shell/tree/main/instructions).

![AI Custom Instructions](../assets/images/ai/ai-custom-instructions.png)

## AI Shell Data Privacy

The AI shell is 100% optional. Even when in-use, no data is ever sent from the AI Shell to the Beekeeper Studio servers. The AI Shell communicates directly with your AI Agent of choice -- no middlemen.

To start using the AI Shell you must choose your agent and enter an API key. By doing so, you are permitting the Beekeeper Studio AI shell to communicate with your chosen AI agent.

### Information Shared With The Agent

The AI Shell allows your agent to explore your data's schema, run SQL, and read results. The AI Shell will show you what the AI sees as it is working, nothing is hidden from view.

The AI shell will send the following information to your agent when you use the shell:

- Table names and column names
- Table structure, like relations and indexes
- Previously executed SQL queries
- The results of SQL queries approved for execution (by you) within the AI Shell
- Any query execution errors that occur


### AI Shell asks permission to run SQL

The AI Shell can run SQL queries, then view the results of those queries. This is a key part of how the shell navigates around your database to figure things out.

There are some limited actions the AI shell can take without your permission, but it will always ask for your explicit consent when running SQL. This gives you the chance to review the code and reject it whenever you have concerns.

![AI Asks permission](../assets/images/ai/ai-asks-permission.png)

#### Allow execution of read-only queries without asking permission

If you prefer not to be asked every time, you can enable `Always allow execution of read-only queries`:

1. Open the Settings menu (⚙️ in the AI Shell).
2. Go to the General tab.
3. Toggle **Always allow execution of read-only queries**.

### Disabling the AI Shell

You can disable the AI shell entirely by adding a flag to either your personal or administrator [configuration file](./configuration.md) to disable the shell.

{% ini-include section="plugins.bks-ai-shell" %}

Even if the application user has previously entered an API key, this setting will disable the feature and lock out any further usage.

## Troubleshooting

### Problem fetching Ollama

If AI Shell cannot connect to Ollama, it may be due to **CORS restrictions**. You’ll need to allow requests from Beekeeper Studio.

#### macOS

Run one of the following commands:

```bash
# Allow all origins
launchctl setenv OLLAMA_ORIGINS "*"

# Allow only Beekeeper Studio
launchctl setenv OLLAMA_ORIGINS "plugin://*"
```

#### Windows

Set an environment variable:

1. Press **Windows + R**, type `sysdm.cpl`, and press **OK**.
2. Go to **Advanced > Environment Variables**.
3. Add or edit the variable `OLLAMA_ORIGINS`.
4. Set the value to:

   * `*` (allow all origins), or
   * `plugin://*` (only Beekeeper Studio).

#### Linux

Edit the Ollama service config:

```bash
sudo systemctl edit ollama.service
```

Add the environment variable:

```
[Service]
Environment="OLLAMA_ORIGINS=*"
# or
Environment="OLLAMA_ORIGINS=plugin://*"
```

Then restart the service:

```bash
sudo systemctl restart ollama
```
