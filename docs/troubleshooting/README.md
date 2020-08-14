---
title: Troubleshooting
---

# Troubleshooting

Hopefully you can solve your problems with the details below. If not please [open a ticket][newissue] on our issues page and we'll try our best to help you out.

[[toc]]

## SQLite

### I get 'permission denied' when trying to access a database on an external drive

If you're on Linux and using the `snap` version of Beekeeper you need to give the app an extra permission.

```bash
snap connect beekeeper-studio:removable-media
```

If you're on another platform, please [open a ticket][newissue] and we'll try to help you debug the problem.

[newissue]: https://github.com/beekeeper-studio/beekeeper-studio/issues/new