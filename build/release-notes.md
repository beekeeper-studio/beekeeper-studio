
## 1.8 Bug fixes and Raspberry Pis (Pies?)

Things have been slow for Gregory and I this month due to Covid, homeschooling, and work responsibilities.

Fortunately, the community has been on a tear and this release comes with a bunch of quality features and bug fixes.

### In this release

**Headline Feature**: We now build for arm64 and armhf on Linux, which means you can run Beekeeper Studio on any Raspberry Pi 2B+! While probably a small userbase, we love the Raspberry Pi and think it is important to support such a pivotal learning platform.


1. You can now provide your own certificates for SSL connections
2. Wide tables are much more performant, thanks to Oli, the creator of Tabulator who worked with us to figure out a horizontal virtual dom implementation.
2. We've changed how the sidebar works a little bit - click the arrow to expand the table, click the table name to open the table.
3. If you are in a table view, the currently open table will be highlighted in the sidebar.
2. HTML is escaped properly in query results and table views
3. Connection passwords are now appropriately encrypted in the local database again
4. Loads of app code has moved to typescript (!). This was a massive piece of work, and 100% a community contribution. :heart:
5. A bunch of build fixes and new architecture targets.
6. Yes yes, commenting SQL now doesn't take you to a new line.


### Pull Requests in this release

402f865 Merge pull request #393 from MasterOdin/ts_sql_tools
12985c5 Merge pull request #381 from beekeeper-studio/snap-removable-media
3c0611a Merge pull request #382 from trevorrjohn/master
2db8f72 Merge pull request #376 from trevorrjohn/feature/add-ssl-cs-file
0872795 Merge pull request #357 from christianpatrick/select-all-command
3b11f3d Merge pull request #378 from beekeeper-studio/armhf
7c197d0 Merge pull request #368 from brenocastelo/feat/tranlate-readme-to-ptbr
5258661 Merge pull request #309 from UtechtDustin/use-other-db-for-dev
854930d Merge pull request #356 from MasterOdin/patch-5
043f515 Merge pull request #365 from tomswartz07/typo-fix
c5d728c Merge pull request #350 from beekeeper-studio/fix-json-params
125a5ce Merge pull request #328 from thiagola92/master
6e8a689 Merge pull request #347 from beekeeper-studio/query-identification-fix
e48658a Merge pull request #336 from beekeeper-studio/click-differences
90fc7dd Merge pull request #335 from beekeeper-studio/better-encryption
afec688 Merge pull request #334 from beekeeper-studio/revert-322-bug/connection-passwords-being-saved-without-encryption
8a52e7b Merge pull request #332 from beekeeper-studio/html-escape
93ae4b8 Merge pull request #324 from beekeeper-studio/arm-build-publish
cf48d75 Merge pull request #304 from geovannimp/refactor/add-typescipt
59fae66 Merge pull request #323 from beekeeper-studio/tabulator-4.8
9692d63 Merge pull request #322 from geovannimp/bug/connection-passwords-being-saved-without-encryption
ac991c2 Merge pull request #308 from UtechtDustin/feature/305
298c861 Merge pull request #315 from beekeeper-studio/dependabot/npm_and_yarn/bl-3.0.1
35b510e Merge pull request #307 from UtechtDustin/better-visibility-new-line
