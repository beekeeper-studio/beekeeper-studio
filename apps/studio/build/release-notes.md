
# Release 3.3 - M1 Macs, Themes, and Quality of Life Improvements

👋 Hello everyone. I'm happy to bring to you the 3.3 release of Beekeeper Studio. Things are a little different this time as I'm releasing version 3.3 of both the **Community Edition** and the **Ultimate Edition**. Exciting stuff.

## New Features

### 🍎 Apple Silicon (M1) Support

that's right, we have a native version available. The app *should* auto-update you to this version, but if not, just download and install the right version from the website.


### Two New Themes (Ultimate Edition Only)

> Beekeeper Studio Ultimate Edition is an upgraded version of Beekeeper Studio with more features. It costs $99 (one time), and you can get it from [our website](https://beekeeperstudio.io).

This release brings the first *new themes* for Beekeeper Studio:

- Solarized Light
- Solarized Dark

This has been a much-requested feature for a while, so I'm excited to be taking the first steps to more modular theming in the app.

### Wide Tables Performance Improvements

Previously, opening a table with a lot of columns would cause performance problems. Well not any more thanks to the work of Oli, the maintainer of Tabulator who worked closely with me on the fixes.

### Easier

Now when you're on a table of data and you want to copy a cell or row you can simply right click to get a list of handy copy options.

You can copy a row as:
- JSON
- Excel TSV format (just paste into Excel and it 'just works'), with any formulas escaped

Result table copying has also been upgraded to the friendly Excel TSV format.

### Better PostgreSQL Errors

When querying a PostgreSQL database we previously only displayed the error summary.

### Multi-Result Tweaks

We make it more clear when there are multiple result sets available in a query tab with a little tooltip and a better message for empty result sets. Oh, also we default to the last result now, that makes more sense than the first.

### Loads of Keyboard Shortcuts

We've added a bunch of keyboard shortcuts to make database interactions easier. Thanks to you the community for the suggestions.

Some specific examples, but there are more:

- CTRL/CMD + n - new row, new column, new index, etc (depending on screen)
- CTRL/CMD + R - refresh the current tab
- CTRL/CMD + S - save the current view


### SQLite STRICT table support

We've updated our SQLite libraries to support the latest SQLite spec, that includes STRICT tables.


## Support Beekeeper Studio

Beekeeper Studio is built by [me](https://beekeeperstudio.io/about), Matthew. I'm a solo-developer and I devote 2 days per week (unpaid) to Beekeeper Studio.

With your support I hope to work on Beekeeper Studio full-time and be able to improve the pace of feature development.

You can support Beekeeper Studio by either [buying the Ultimate Edition](https://beekeeperstudio.io/pricing) or [becoming a project sponsor](https://github.com/sponsors/beekeeper-studio).

If you can't afford to support the project, that's ok, I keep Beekeeper Studio open source so that it can benefit the greatest number of people possible, but please consider [sharing with friends or writing a review](https://github.com/beekeeper-studio/beekeeper-studio/issues/287.) 🙏.

## Merged PRs


966e3bdd Merge pull request #1113 from beekeeper-studio/dialog-nicer
e0ef0e3c Merge pull request #1112 from beekeeper-studio/dependabot/npm_and_yarn/minimist-1.2.6
87f582e4 Merge pull request #1111 from beekeeper-studio/library-updates
73094087 Merge pull request #1109 from beekeeper-studio/working-ssh-tunnel
b2195e0d Merge pull request #933 from beekeeper-studio/tabulator-5.0
d9f344d9 Merge pull request #1096 from beekeeper-studio/m1-mac
696d9d49 Merge pull request #1097 from beekeeper-studio/sqlite3-upgrade
5d4da565 Merge pull request #1094 from cgwyllie/update-electron-fix-1034
73b6be76 Merge pull request #1093 from beekeeper-studio/postgres-table-create
154aad38 Merge pull request #1090 from beekeeper-studio/dependabot/npm_and_yarn/plist-3.0.4
d626a16a Merge pull request #1045 from lafriks-fork/feat/bump-node-sass
6cf5043b Merge pull request #1084 from beekeeper-studio/more-shortcuts
0ed90a5a Merge pull request #1080 from beekeeper-studio/dependabot/npm_and_yarn/url-parse-1.5.10
e8044cb3 Merge pull request #1079 from beekeeper-studio/dependabot/npm_and_yarn/prismjs-1.27.0
9f47ced7 Merge pull request #1044 from lafriks-fork/feat/pg_column_options
81ee94b5 Merge pull request #1078 from whatnotery/master
