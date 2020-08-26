---
title: Troubleshooting
---

# Troubleshooting

Hopefully you can solve your problems with the details below. If not please [contact us][/contact/] and we'll try our best to help.

[[toc]]

## SQLite

### I get 'permission denied' when trying to access a database on an external drive

If you're on Linux and using the `snap` version of Beekeeper you need to give the app an extra permission.

```bash
snap connect beekeeper-studio:removable-media
```

If you're on another platform, please [open a ticket][bug] and we'll try to help you debug the problem.

[bug]: https://github.com/beekeeper-studio/beekeeper-studio/issues/new?template=bug_report.md&title=BUG: