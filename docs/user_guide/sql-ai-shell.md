---
title: AI Shell
icon: octicons/sparkles
summary: SQL AI Pair programming - answer questions about your database or build something new.
---

![AI Shell Video](https://placehold.co/600x400?text=AI_WALKTHROUGH_VIDEO)

The Beekeeper Studio AI Shell is modelled after [Claude Code](https://www.anthropic.com/claude-code) and [Aider](https://aider.chat/).

## Deep Coding and AI Self Learning

The AI Shell embeds your agent right inside Beekeeper Studio. It has deep SQL awareness and the ability to explore schemas, understand relations and constraints, and write and execute SQL (with permission), right inside the app.

[See the website](https://beekeeperstudio.io/features/ai-sql) for videos, screenshots, and more.

## How to use the AI Shell

1. Choose your AI provider of choice (in beta only Anthropic is available)
2. Enter your API key
3. Ask questions
4. Get blown away with the results

## AI Shell Pricing

The AI Shell is included in all paid versions of Beekeeper Studio, with no additional charge. Note that you are responsible for the costs incurred with your AI provider, as Beekeeper does not act as a middle-man in any way.

All downloads of Beekeeper Studio come with a 14 day free trial, [download Beekeeper Studio](https://beekeeperstudio.io/get) to try the AI Shell right now.

## AI Shell Tools

Your AI agent has access to the following tools from within Beekeeper Studio:

- [x] Listing schemas, tables, views, functions, and procedures
- [x] Viewing table relations and constraints
- [x] Looking at your saved queries for guidance
- [x] Checking your open tabs for guidance
- [x] Writing and executing SQL (with permission)

## AI Shell Configuration

You can configure the AI Shell using the Beekeeper Studio [configuration system](./configuration.md).


## AI Shell Data Privacy

The AI shell is 100% optional. Even when in-use, no data is ever sent from the AI Shell to the Beekeeper Studio servers. The AI Shell communicates directly with your AI Agent of choice -- no middlemen.

To start using the AI Shell you must choose your agent and enter an API key. By doing so, you are permitting the Beekeeper Studio AI shell to communicate with your chosen AI agent.


### AI Shell asks permission to run SQL

There are some limited actions the AI shell can take without your permission, but it will always ask for your explicit consent when running SQL. This gives you the chance to review the code and reject it whenever you have concerns.

![AI Asks permission](https://placehold.co/600x400?text=AI_ASKS_PERMISSION)


### Disabling the AI Shell

You can disable the AI shell entirely by adding a flag to either your personal or administrator [configuration file](./configuration.md) to disable the shell:

```ini
[plugins]
disabledPlugins = ai-shell

```

Even if the application user has previously entered an API key, this setting will disable the feature and lock out any further usage.
