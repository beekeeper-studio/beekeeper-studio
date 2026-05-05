# Beekeeper Studio 5.7

Wow, this release got a little out of hand. Two major features and a looooot of bug fixes and tweaks in this release.


## Headline Features

- **Folders for saved connections and saved queries**. You can create folders and subfolders, drag-and-drop to reorder, pin and unpin, right-click for the common actions, and the expand/collapse state sticks across restarts. Fixes #799, #2981, #65.

- **Editable query results**. Tweak data directly from the results of a SQL query - no more jumping over to the table view just to fix a typo. We analyze the SQL and map the result columns back to their source tables. Works alongside manual commit mode, and the Apply/Discard controls behave consistently with table edits. Fixes #3191, #2429.



## New Database Support

- **BedrockDB** from Expensify, which is a sharded SQLite behind a MySQL proxy.
- **ScyllaDB** connection support with docs and integration tests.
- **Greengage** (Postgres fork) integration.
- **DuckDB** is out of beta.

## Smaller Improvements

- **CockroachDB JWT auth**. Lightweight JWT authentication with a re-prompt on new connections. Picked from the auth method dropdown. Thanks @hector833!
- **Windows Pageant agent forwarding** works again. This was broken for folks using PuTTY's agent for SSH tunnel keys. Thanks @jeffcaiz!
- **SSH auth mode switching** no longer leaks stale credentials when you flip between modes.
- **URL-encoded credentials** are now decoded correctly when pasting connection URLs. Fixes #3840.
- **Redis** connection URLs now accept `redis://` and `rediss://` schemes.
- **Folders for workspaces can now be deleted from inside the app** (Cloud), so you don't have to hop over to the web dashboard for housekeeping. Fixes #1317.
- **Plugin system controls for admins**. New `[pluginSystem]` config section lets you disable the plugin system entirely, disable community plugins only, or pin an allowlist of permitted plugin ids. Bundled first-party plugins keep working when the system is off. Fixes #3859.
- **Onboarding notification** for new users to make it easier to find the getting-started guide. Fixes #3583.


## Bug Fixes

- **SQL Server**: dotted table names (e.g. `dbo.my.table`) are now bracket-wrapped on export so they don't get mis-split. Fixes #3722.
- **MySQL**: `CHARACTER SET` and `COLLATE` clauses are stripped from non-string `ALTER` statements.
- **MySQL**: friendlier error text when you hit "access denied for user".
- **Oracle**: fixed a crash in the utility process when the thick client hit a connection retry, and fixed connecting through an SSH tunnel.
- **Cassandra**: the driver client now shuts down cleanly on disconnect.
- **Mac**: delete row keyboard shortcut works again. Fixes #3629.
- **Delete multiple selected rows** is fixed. Fixes #3550.
- **Add relations** shortcut no longer also adds a column. Fixes #3521.
- **Copy column name** from the sidebar was copying the table name. Fixed.
- **Structural table cells** now have right-click copy.
- **JSON viewer search** is now case-insensitive. Fixes #3547.
- **SQL export** converts bit column values to integers. Fixes #3673.
- **Drag handle** cursor now shows grab on hover. Fixes #3165.
- **Drag-and-drop to root** in the connection list works correctly, with visual feedback when a move completes.
- **Imported connections** land in the personal folder rather than at an ambiguous root.
- **Auto-disconnect** now notifies you when it happens, so you're not left wondering why a query failed.
- **Mac menu icons** render correctly (fixed by assigning proper roles), and the app menu order on non-Mac platforms is also tidied up.
- **Bastion/jump host config** is tucked into an expandable section so the connection form is less noisy, with a missing config added back.
- **Folders fixes**: hide "New Subfolder" outside cloud/team workspaces, duplicate folder-drop-zones that could crash vuedraggable are gone, and reorder snap-back is unified across local and cloud.
- **Flatpak users** get a platform warning system explaining file permission behavior, plus SQLite-specific docs.
- **Run button** and its keybind are disabled while there are pending edit changes.
- **Pin/unpin** and **duplicate** are now available as right-click actions on connections and queries.
- **Edit-data cursor** keeps its scroll position when switching to edit mode.
- **Edit mode** is disabled when editing is not possible, with an upsell notification so it's clear why.

## Under the Hood

- **CI**: ARM64 builds moved from self-hosted to GitHub-hosted runners. `node_modules` is now cached across test, build, and Windows jobs, which should speed up pipelines noticeably.
- **Windows integration tests** now cover Pageant agent forwarding end-to-end.
- **Bedrock integration tests** are wired up via testcontainers.
- **Security**: doc updates plus a pile of dependency bumps (handlebars, dompurify, node-forge, brace-expansion, protobufjs, basic-ftp, axios, rollup, lodash, electron, happy-dom, ajv, qs, yaml, path-to-regexp, @xmldom/xmldom, picomatch, tar-fs).
- **AWS SDK** packages upgraded to drop the fast-xml-parser advisory.
- **trino-client** updated to clear the axios advisory.
- **Electron** bumped to 39.8.5.

## Thank You to Our Contributors!

Big thanks to the community folks who sent PRs for this release, including @hector833 (CockroachDB JWT), @jeffcaiz (Pageant fix), @andrii-kysylevskyi (ScyllaDB), @v-astakhov (Greengage), @ManelRibeiro, @boergeson, @austinwilcox, @PedroBarataIST, @antoniogmello, @yogasw, @scrlkx, and everyone else who filed issues and helped us track things down.

**Full Changelog**: https://github.com/beekeeper-studio/beekeeper-studio/compare/v5.6.5...v5.7.0


## PR Merge List

16d887a87 Merge pull request #4122 from beekeeper-studio/claude/fix-github-issue-bug-ryiIF
386494d8e Merge pull request #4121 from beekeeper-studio/claude/fix-gh-issue-tests-AC0bh
7ed549de2 Merge pull request #4066 from beekeeper-studio/chore/input-style-guide
de3ceb9b8 Merge pull request #4111 from beekeeper-studio/updated-readmes-1776366779
35444fbbe Merge pull request #4110 from beekeeper-studio/dependabot/npm_and_yarn/handlebars-4.7.9
a9a267dca Merge pull request #4114 from beekeeper-studio/dependabot/npm_and_yarn/protobufjs-7.5.5
9d3300a40 Merge pull request #4113 from beekeeper-studio/dependabot/npm_and_yarn/basic-ftp-5.3.0
84c0a62a7 Merge pull request #4112 from beekeeper-studio/fix/auto-disconnect-notification
2651f879b Merge pull request #3541 from beekeeper-studio/docs/plugin-system-1.0
b01ab8020 Merge pull request #3894 from beekeeper-studio/feat/disable-third-party-plugins
cd75fb087 Merge pull request #4099 from beekeeper-studio/test/windows-pageant-integration
468b38df9 Merge pull request #3662 from andrii-kysylevskyi/3661-add-scylladb-docs
4ab30cd25 Merge pull request #4101 from beekeeper-studio/pr-bedrock-support
d9458c6dc Merge pull request #4105 from beekeeper-studio/dependabot/npm_and_yarn/dompurify-3.4.0
83c47232d Merge pull request #3964 from beekeeper-studio/feat/editable-results
43fbc0a48 Merge pull request #4106 from beekeeper-studio/chore/troubleshoot-mysql-denied-user
625a601e9 Merge pull request #4104 from beekeeper-studio/fix/fuzzy-search
c009fd44c Merge pull request #4098 from beekeeper-studio/updated-readmes-1776195214
5d8059f33 Merge pull request #4039 from hector833/cockroach-basic-jwt-auth
81cceaa7a Merge pull request #4093 from jeffcaiz/fix/windows-pageant-agent-forwarding
71d27255b Merge pull request #3959 from ManelRibeiro/bug_fix
dfb7eb881 Merge pull request #3956 from beekeeper-studio/arm-hosted
f481f17fd Merge pull request #3999 from beekeeper-studio/fix/surreal-cm
6461bcd25 Merge pull request #4028 from beekeeper-studio/fix/oracle-connection-crash
875b5d3b4 Merge pull request #4084 from beekeeper-studio/dependabot/npm_and_yarn/basic-ftp-5.2.2
ad6029d8d Merge pull request #3919 from beekeeper-studio/chore/e2e-os-matrix
cda846688 Merge pull request #4080 from beekeeper-studio/aws-dependabot-fixes
c5af646be Merge pull request #3916 from beekeeper-studio/fix/backup-client-password
5e809ad54 Merge pull request #3587 from beekeeper-studio/feat/onboarding-notif
0c79dbc1d Merge pull request #4076 from beekeeper-studio/dependabot/npm_and_yarn/basic-ftp-5.2.1
87cd5c375 Merge branch 'rc-56'
b54a713a0 Merge pull request #4057 from boergeson/fix/copy-column-name
f285eb4bb Merge pull request #4058 from beekeeper-studio/dependabot/npm_and_yarn/electron-39.8.5
2cf38e951 Merge pull request #4049 from boergeson/fix/copy-structural-table-cells
b46255417 Merge pull request #4050 from austinwilcox/vimDocUpdates
4944914ce Merge pull request #4045 from boergeson/fix/drag-handle-cursor
5c5ea866a Merge pull request #4048 from beekeeper-studio/dependabot/npm_and_yarn/electron-39.8.4
f8a77ce64 Merge pull request #4047 from beekeeper-studio/dependabot/npm_and_yarn/lodash-4.18.1
4c798db9c Merge pull request #4037 from beekeeper-studio/dependabot/npm_and_yarn/xmldom/xmldom-0.8.12
b43ca395e Merge pull request #4025 from antoniogmello/fix/3629
f5a8c76d4 Merge pull request #3998 from beekeeper-studio/fix/mac-menu-icons-by-roles
0351865e3 Merge pull request #3988 from beekeeper-studio/fix/jump-host-config
c3aa9028f Merge pull request #4030 from beekeeper-studio/docs/flatpak-sqlite-permissions
62f66b9c7 Merge pull request #4034 from beekeeper-studio/feature/flatpak-platform-warnings
083a41377 Merge pull request #4036 from beekeeper-studio/fix/menu
6e000be63 Merge pull request #4029 from beekeeper-studio/docs/cloud-idle-timeout
95cbd5246 Merge branch 'rc-56'
cb74e05b2 Merge pull request #4026 from beekeeper-studio/fix/oracle-ssh-tunnel
f0ce4e290 Merge pull request #4022 from beekeeper-studio/dependabot/npm_and_yarn/happy-dom-20.8.9
69f8c743a Merge pull request #4016 from beekeeper-studio/dependabot/npm_and_yarn/brace-expansion-1.1.13
2d929c46f Merge pull request #4017 from beekeeper-studio/dependabot/npm_and_yarn/node-forge-1.4.0
2f7a23eed Merge pull request #4021 from beekeeper-studio/dependabot/npm_and_yarn/path-to-regexp-8.4.0
de72e24c2 Merge pull request #4007 from beekeeper-studio/dependabot/npm_and_yarn/happy-dom-20.8.8
4f383df73 Merge pull request #3996 from beekeeper-studio/fix/reorder-app-menu
e55d34b42 Merge branch 'rc-56'
f3d1dbd05 Merge pull request #4005 from beekeeper-studio/dependabot/npm_and_yarn/brace-expansion-1.1.12
f4f89987f Merge pull request #4004 from beekeeper-studio/dependabot/npm_and_yarn/yaml-2.8.3
86ecceb85 Merge pull request #4001 from beekeeper-studio/dependabot/npm_and_yarn/apps/ui-kit/examples/react/picomatch-2.3.2
623539f09 Merge pull request #4000 from beekeeper-studio/dependabot/npm_and_yarn/picomatch-2.3.2
097c1879e Merge pull request #3990 from beekeeper-studio/fix/bugfix-batch-3840-3673-3547
737719dd9 Merge pull request #3945 from v-astakhov/greengage-integration
a31db84a8 Merge pull request #3969 from beekeeper-studio/updated-readmes-1773415364
5a9b415f8 Merge branch 'rc-56'
362c0c46b Merge pull request #3979 from beekeeper-studio/fix/brace-expansion
7e449759c Merge pull request #3978 from beekeeper-studio/fix/tar-fs
9795d8a71 Merge pull request #3977 from beekeeper-studio/dependabot/npm_and_yarn/rollup-2.80.0
f6c8336ec Merge pull request #3967 from PedroBarataIST/fix-multiselect-delete
6f044b3fb Merge pull request #3966 from beekeeper-studio/fix/rds-docs
63cf1a96f Merge pull request #3974 from beekeeper-studio/fix/ssh-auth-mode-stale-credentials
766902a6f Merge branch 'rc-56'
fe0994655 Merge pull request #3952 from beekeeper-studio/ci/cache-node-modules
02da2fb7e Merge pull request #3950 from beekeeper-studio/dependabot/npm_and_yarn/dompurify-3.3.2
a889c39c5 Merge pull request #3944 from beekeeper-studio/dependabot/npm_and_yarn/immutable-4.3.8
cfc0af8f6 Merge pull request #3915 from beekeeper-studio/fix/component-resolver
76bace04a Merge pull request #3948 from yogasw/master
fbf1753f2 Merge pull request #3955 from beekeeper-studio/rc-56
25ae6f6a5 Merge pull request #3820 from beekeeper-studio/feature/1317_delete-workspace
a57718f66 Merge pull request #3903 from beekeeper-studio/feature/connection-query-folders
e43cf0759 Merge pull request #3942 from beekeeper-studio/rc-56
a9c18fb5a Merge pull request #3862 from scrlkx/fix/mkdocs-code-block-clipboard
a7f16f222 Merge branch 'rc-56'
fe8be4145 Merge pull request #3925 from beekeeper-studio/rc-56
52b758cca Merge pull request #3896 from beekeeper-studio/dependabot/npm_and_yarn/ajv-6.14.0
0d01af7bb Merge pull request #3913 from beekeeper-studio/fix/workflow-permissions
23f248414 Merge pull request #3878 from beekeeper-studio/dependabot/npm_and_yarn/qs-6.14.2
3c6b35918 Merge pull request #3908 from beekeeper-studio/dependabot/npm_and_yarn/basic-ftp-5.2.0
8a785a381 Merge pull request #3914 from beekeeper-studio/dependabot/npm_and_yarn/apps/ui-kit/examples/react/rollup-4.59.0
9eae0048c Merge pull request #3909 from beekeeper-studio/dependabot/npm_and_yarn/apps/ui-kit/examples/html/rollup-3.30.0
da28da1b6 Merge branch 'rc-56'
