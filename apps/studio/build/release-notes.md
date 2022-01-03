
# Version 3.0.0 - Team Workspaces & Persistent Tabs

Team collaboration is front-and-center in this release.

## Headline Feature - Team Workspaces

Team workspaces allow you to share `queries` and `connections` with all your colleagues in a single logical Beekeeper Studio workspace.

When you use a team workspace, all your queries and connections are saved to the Beekeeper Studio cloud service. Items marked as 'team shared' will be shared with your team members, those marked 'personal' will not.

This is a huge release that has been months in the making. I believe this service helps us move closer to financial stability without sacrificing the open source principles that make Beekeeper Studio great.




# Version 2.1.0 - QuickSearch and 2.0 tidy up

A small-but-mighty release for you today.

## Headline Feature - Quicksearch

The headline feature is that we've added `quick search` to Beekeeper Studio.

Simply Hit `ctrl-p` / `cmd-p` and start typing to jump to any table or saved query. Hit enter to open, hit ctrl+enter go to the structure view (tables only).


## Also in this release

- bug fixes for tab management
- bug fixes for default values in MySQL and MariaDB
- bug fixes for changing nullable and datatype for Sql Server
- Affected columns more obvious
- Saved connections are now sortable


- 9dc644c1 Merge pull request #781 from Zerotask/chore/minor-code-adjustments
- 2bda01a2 Merge pull request #782 from nmelnick/wip-connection-sort
- 3556c225 Merge pull request #789 from beekeeper-studio/quick-search
