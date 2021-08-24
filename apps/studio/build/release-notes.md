
It's a 🔥🔥 July week here in Dallas, so we've got some equally 🔥🔥 new Beekeeper Studio features for you!

## New Features

1. 💥 **Table Schema Editing** - Edit your table column types, names, defaults, etc. Don't trust Beekeeper to make the change? Pop open the change in a new SQL tab.

2. 🤩 **Persisted Pinned Tables** - When you are using a saved connection, your pinned tables will now persist across sessions

3. 🤟 **Visual Table Builder** - Create new tables visually right inside of Beekeeper Studio. No need to remember all that syntax anymore.

4. 🏃 **Faster Loading Table View** - We no longer load a table count for each page of the table data view, which drastically speeds up load times.

Beekeeper Studio is still (and always will be) free and open source, so if you love the app get involved! Here is our list of [ways to help in 10 minutes without coding](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

## Behind the Scenes

We recently became a [monorepo](https://www.perforce.com/blog/vcs/what-monorepo) in order to launch [SQLTools](https://sqltools.beekeeperstudio.io) - a suite of relational database tools for everyone on the internet. SQLTools has helped us generalize some of Beekeeper's new features, which means they can be useful outside of the app.

This is a big change that took a lot of work, but we think it is worth it. We're a small, part-time team, so SQLTools gives us a way to scale the benefit of our work without copy-pasting code, without needing to hire anyone, and without adding (much) to our workloads.

They're also symbiotic - SQLTools improves Beekeeper, which improves SQLTools, ad infinitum.

We hope the effort was worth it, and some of you get value from the new site.



## PRs Merged

- a06c4e0 Merge pull request #654 from beekeeper-studio/table-info-panes
- aa6cae7 Merge pull request #669 from beekeeper-studio/dependabot/npm_and_yarn/dns-packet-1.3.4
- 497ab42 Merge pull request #664 from beekeeper-studio/dependabot/npm_and_yarn/browserslist-4.16.6
- 10ebbd1 Merge pull request #647 from beekeeper-studio/dependabot/npm_and_yarn/hosted-git-info-2.8.9
- e9f668c Merge pull request #658 from branchvincent/feat/open-url
- c57cad11 Merge pull request #736 from vitaly-t/patch-2
- 1844a918 Merge pull request #730 from beekeeper-studio/studio-schemabuilder
- e9bb9a9a Merge pull request #729 from beekeeper-studio/saved-pins
- a7567d83 Merge pull request #711 from beekeeper-studio/fancy-sqltools
- 54d49b31 Merge pull request #707 from beekeeper-studio/sqltools-yarn-shared-src
- 8333a472 Merge pull request #706 from JaceBayless/700-refresh
- cd6fb5c9 Merge pull request #701 from JaceBayless/693-truncation
- 1f44aa9c Merge pull request #699 from lawrenceshah/patch-2