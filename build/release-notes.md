# V1.5 - Community Enhancement Megapack

Hey everyone. Big release today, but not for the reasons we expected...

We'd intended to build out a basic file menu to allow us to add a few settings, but so many of you in the community started building enhancements we're instead pushing a release with a whole bunch of amazing stuff we'd never thought of!

## Big New Features in this release

### Run Contexts

Instead of running the entire query window, you can now selectively run whatever you wish:
- Run All - run the whole editor
- Run Current - If you have multiple queries (separated with `;`), you can run whichever query you're currently selecting (we'll highlight the query to let yo uknow)
- Run Selection - Select some text and then you can just run whatever text you have highlighted.

![SQL Run contexts](https://user-images.githubusercontent.com/279769/84578583-3423a780-ad8c-11ea-8fcc-6b6d6c740bc2.gif)


### Query Parameters

Parameterize your SQL query with either `:variable` or `$1` and when you run the query Beekeeper will prompt you to enter values. Now you can re-use the same query easily without having to open a whole new tab.

![SQL Parameters](https://camo.githubusercontent.com/6582a2b09ef9b567bb5470a76276daee5aa36765/68747470733a2f2f6d656469612e67697068792e636f6d2f6d656469612f5176644c45476b4c7a35706f5272547a6e592f67697068792e676966)

### Connection Label Colors

Label your saved connections with a color. Now you can easily tell `production` from `dev` connections.

![Color Picker](https://user-images.githubusercontent.com/279769/84578500-7a2c3b80-ad8b-11ea-83ee-659a9fd999a3.gif)


### Smaller Fixes and Enhancements
- Refresh the database list with a new `refresh` button
- Beekeeper Studio now works on Debian 10
- Postgres versions before 8.3 are now supported
- Redshift errors are fixed
- Close tabs with a middle mouse button click
- Electron Updated to 8.2.5
- Deb package now adds the Beekeeper Studio repo if downloaded directly

Most of these enhancements came from you, the community.

## Merged Pull Requests

#183 from beekeeper-studio/deb-postinstall
#196 from beekeeper-studio/launcher-linux
#193 from JamesDBartlett/master
#191 from beekeeper-studio/dependabot/npm_and_yarn/websocket-extensions-0.1.4
#131 from mlebrun/connection-labels
#181 from beekeeper-studio/highlight-fixes-and-docs
#168 from aligoren/feature/refresh-button-for-databases
#165 from MasterOdin/patch-3
#99 from hillmanov/master
#171 from beekeeper-studio/query-highlighting
#167 from MasterOdin/master
#161 from vuongggggg/feature/add-run-buttons
#166 from beekeeper-studio/component-library
#164 from strotgen/feature/close-tab-middle-button
#156 from beekeeper-studio/connection-removal
