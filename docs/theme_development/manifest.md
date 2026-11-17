---
title: Theme Manifest Reference
summary: "Complete reference for the manifest.json file that defines your theme"
icon: material/code-json
---

## Manifest's structure

| Property          | Type                   | Required | Description                                                                                                                |
| ----------------  | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`               | Yes      | Unique identifier for your theme. Use lowercase letters, numbers, and hyphens only.                                        |
| `name`            | `string`               | Yes      | Display name shown to users in the Theme Manager.                                                                          |
| `author`          | `string | AuthorInfo`  | Yes      | Theme author or organization name.                                                                                         |
| `description`     | `string`               | Yes      | Brief description of theme.                                                                                                |
| `version`         | `string`               | Yes      | Semantic version of your theme (e.g., "1.0.0", "2.1.5").                                                                   |

### AuthorInfo

| Property | Type     | Required | Description                   |
| -------- | -------- | -------- | ----------------------------- |
| `name`   | `string` | Yes      | Author or organization name.  |
| `url`    | `string` | Yes      | Author or organization URL.   |


### Basic Example

```json
{
    "id": "my-special-theme",
    "name": "My Theme",
    "author": "Your Name",
    "description": "Makes the app super pretty",
    "version": "1.0.0",
}
```
