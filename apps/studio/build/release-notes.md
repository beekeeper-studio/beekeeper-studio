
# Release 3.9 - Slow burn, but less slow now

My wife had heart surgery in Feb (she's doing great!) and I've been helping her recover, so it's been a while since the last Beekeeper Studio release (It's not a coincidence that I put out a super stable release at the end of Jan).

If you are a customer of the commercial edition - 🙏 Thank you, your financial support makes all of this possible.

If you use the community edition, please consider upgrading to the [commercial edition](https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition). Every purchase supports me, and the continued development of the community edition.

I also have a few part time folks helping me keep Beekeeper Studio features rolling:
- @wmontgomery
- @not-night-but
- @davidkaufman

Big thanks to them for their help.

## Highlights ✨

- [x] Added support for PostgreSQL partitions in the table structure view (@not-night-but)
- [x] Added support for Query Magic enum substitution (@not-night-but)
- [x] Added support for alphanumeric sorting of pinned tables (@tomaskudlicka)
- [x] Added the ability to pin saved connections (just like pinned tables) (@not-night-but)


## More awesome features 🍭 and 🐞 fixes

- [x] Added support to copy table data modifications to SQL instead of applying them automatically
- [x] Added the ability to select field names in the table structure view when they're not editable
- [x] Huuuuuge upgrade from Electron 13 to Electron 22
- [x] Colo(u)r sorting of connections fixed
- [x] SSH2 library upgraded
- [x] Fixing column names in the JSON download
- [x] ...more stuff below, man this took a while to write


## Merged PRs


85e68d52 Merge pull request #1558 from beekeeper-studio/partitions-fix-96
a44371d2 Merge pull request #1548 from beekeeper-studio/partitions
4719c4ce Merge pull request #1525 from MaximeRaynal/master
7512516c Merge pull request #1551 from tomaskudlicka/feat/pin-tables-sorting
d61910a7 Merge pull request #1541 from beekeeper-studio/copy-to-sql
8a97f1db Merge pull request #1530 from beekeeper-studio/pinned-connections
93694b93 Merge pull request #1512 from beekeeper-studio/1472-selectable-fields
94f733fb Merge pull request #1502 from krystxf/fix/materialized_view
8333115d Merge pull request #1537 from beekeeper-studio/interval-sorting
3ab8ca5a Merge pull request #1511 from beekeeper-studio/electron-15
50154381 Merge pull request #1492 from beekeeper-studio/dependabot/npm_and_yarn/http-cache-semantics-4.1.1
470e1d2c Merge pull request #1509 from beekeeper-studio/editing-disabled
13a4b9c0 Merge pull request #1513 from beekeeper-studio/colour-sorting
7d931d6c Merge pull request #1516 from beekeeper-studio/mainline-ssh2
68f09176 Merge pull request #1510 from beekeeper-studio/electron-remote-migration
245f58d9 Merge pull request #1447 from beekeeper-studio/dependabot/npm_and_yarn/decode-uri-component-0.2.2
e777f106 Merge pull request #1464 from beekeeper-studio/feature/747_find-replace-in-editor
02409764 Merge pull request #1487 from leduard/master
1cda1804 Merge pull request #1494 from davidkaufman/issue-1493-colnames-json-download
0b475e0b Merge pull request #1473 from beekeeper-studio/dependabot/npm_and_yarn/knex-2.4.0
76718b81 Merge pull request #1480 from henryliang2/master
aefa5ff0 Merge pull request #1482 from beekeeper-studio/bugfix/empty-value-on-select
