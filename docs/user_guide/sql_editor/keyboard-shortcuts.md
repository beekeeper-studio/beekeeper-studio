---
title: Keyboard Shortcuts
summary: "The most useful Beekeeper Studio keyboard shortcuts, grouped by where you use them"
icon: material/keyboard
---

Beekeeper Studio ships with a keyboard shortcut for nearly everything you do
often. The tables below cover the defaults.

!!! tip "The in-app reference is the complete list"
    Beekeeper Studio has a built-in shortcuts reference: open it from the
    `Help` menu, or from the **View all shortcuts** link under the shortcut
    hints on an empty tab. It is searchable, covers every action, and — unlike
    this page — it is generated from your live configuration, so it reflects any
    keybindings you have customised.

On macOS, use `Cmd` wherever the tables below say `Ctrl`.

## General

| Action | Shortcut |
| --- | --- |
| Refresh | `F5` or `Ctrl` + `R` |
| Add Row | `Ctrl` + `N` |
| Save | `Ctrl` + `S` |
| Open in SQL Editor | `Ctrl` + `Shift` + `S` |
| Open Quick Search | `Ctrl` + `P` |
| Copy Selection | `Ctrl` + `C` |
| Paste Selection | `Ctrl` + `V` |
| Clone Selection | `Ctrl` + `D` |
| Delete Selection | `Delete` or `Ctrl` + `Backspace` |
| Undo | `Ctrl` + `Z` |
| Redo | `Ctrl` + `Shift` + `Z` or `Ctrl` + `Y` |

`Open Json Viewer` has no default binding — assign one in your config file if
you use the JSON sidebar often.

## Quick Search

Quick search is the fastest way to jump to a table, a saved query, or a
connection.

| Action | Shortcut |
| --- | --- |
| Focus Search | `Ctrl` + `K` or `Ctrl` + `O` |
| Close | `Esc` |
| Select Up | `Up` or `Ctrl` + `P` |
| Select Down | `Down` or `Ctrl` + `N` |
| Open | `Enter` |
| Open (Alternate) | `Ctrl` + `Enter` |
| Open in Background | `Right` |
| Open in Background (Alternate) | `Ctrl` + `Right` |

## Query Editor

| Action | Shortcut |
| --- | --- |
| Run Only the Selected Query | `Ctrl` + `Enter` or `F5` |
| Run All Queries | `Ctrl` + `Shift` + `Enter` or `Shift` + `F5` |
| Run Current Query to File | `Ctrl` + `I` |
| Run All Queries to File | `Ctrl` + `Shift` + `I` |
| Focus Editor | `Ctrl` + `L` |
| Switch Pane Focus | `Ctrl` + backtick |
| Select Next Result | `Shift` + `Up` |
| Select Previous Result | `Shift` + `Down` |
| Copy Result Selection | `Ctrl` + `C` |
| Open Table Filter | `Ctrl` + `F` |
| Close Table Filter | `Esc` |
| Manual Commit | `Ctrl` + `Shift` + `C` |
| Manual Rollback | `Ctrl` + `Shift` + `R` |

Autocomplete is triggered with `Ctrl` + `Space`.

Which of `Run Only the Selected Query` and `Run All Queries` is your *primary*
action is configurable — see [Configuration](../configuration.md). The run
button in the toolbar and the shortcut hints on an empty tab both follow
whichever you have chosen.

## Result Table

| Action | Shortcut |
| --- | --- |
| Open Editor Modal | `Shift` + `Enter` |

## Table View

| Action | Shortcut |
| --- | --- |
| Next Page | `Ctrl` + `Right` |
| Previous Page | `Ctrl` + `Left` |
| First Page | `Ctrl` + `H` |
| Last Page | `Ctrl` + `L` |
| Focus Filter Input | `Ctrl` + `F` |
| Open Editor Modal | `Shift` + `Enter` |
| Paste clipboard as new rows | `Ctrl` + `Shift` + `V` |
| Set selected cells to null | `Backspace` |

## Tabs

| Action | Shortcut |
| --- | --- |
| Close Tab | `Ctrl` + `W` |
| Force Close Tab | `Ctrl` + `Shift` + `W` |
| Next Tab | `Ctrl` + `Tab` or `Ctrl` + `PageDown` |
| Previous Tab | `Ctrl` + `Shift` + `Tab` or `Ctrl` + `PageUp` |
| Reopen Last Closed Tab | `Ctrl` + `Shift` + `T` |
| Switch to Tab 1–9 | `Alt` + `1` … `Alt` + `9` |

A new query tab is `Ctrl` + `T`, and a new window is `Ctrl` + `Shift` + `N`.

## Customising shortcuts

Every binding above can be changed from your configuration file, under the
matching `[keybindings.*]` section. See
[Configuration](../configuration.md) for where that file lives and how to edit
it. Once changed, the in-app shortcuts reference will show your version.
