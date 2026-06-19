# Beekeeper Studio 5.8

Happy summer everyone! Well here in Texas things are getting a little toasty, so thought we'd celebrate with an equally hot Beekeeper Studio release 🔥🔥. 

Included: A brand new database driver, query edit history for workspaces, automatic driver downloads, better SSH config support, and a long tail of bug fixes, security hardening, and UI polish.

## Highlights

- **Amazon DynamoDB support**. Connect to DynamoDB and browse your tables, right inside Beekeeper Studio. Our 18th database engine.

- **Query Edit History**. Every change you make to your data now gets recorded, so you can see what was run, when, and by whom. Backed by a refactored cloud audit API client for team workspaces.

- **Automatic driver downloads**. Some database engines need heavy native drivers that we'd rather not ship with every build. There's now a framework that downloads the right driver dependency on demand, the first time you need it, instead of bloating the installer for everyone.

## Lowlights

Day has been working hard on a Snowflake driver, it's almost done, but wasn't ready in time for this release like we expected.

Azmi has been working on multi-hop SSH support so you can connect to your database via 2+ different jump hosts. Again, it just missed our release cutoff.


## Smaller Improvements

- **New upgrade panel and modal** used consistently across the app, with an animated AI Shell upsell card so it's clearer what you get with a paid plan.
- **Bundled AI Shell upgraded to v3.1.0**.
- **Empty connection folders now stay visible** even when they don't contain any connections yet, so your structure doesn't disappear on you. Thanks @vaibhavvikas!
- **SSH config file resolution** for host aliases — host entries from your `~/.ssh/config` are now resolved when connecting.
- **Recent connections** now use the saved connection's details rather than a stale snapshot.
- **Local workspace** can always be selected on the connection screen, even when a cloud license check is in flight.
- **Quieter production logs**, with renderer messages routed to `renderer.log` instead of the main log.
- **Improved idle detection** that combines system-level and in-app input tracking for more accurate auto-disconnect.


## Bug Fixes

- **MongoDB**: added the `aws4` dependency to fix `MONGODB-AWS` authentication. Thanks @jim-fn!
- **Cassandra**: UUIDs inside `set` and `map` collections are now converted to strings instead of rendering as objects. Thanks @andreasarf!
- **Table View**: tables show a loading spinner instead of a misleading "No Data" message while results are still being fetched. Thanks @NianJiuZst!
- **Query streaming**: fixed a bug that could break streamed result sets.
- **Named query params** are no longer clobbered when the same parameter appears more than once across several queries.
- **Autocomplete** now suggests columns for quoted table names and for tables used in joins.
- **Saved queries** keep their folder and position when saved from a query tab. Fixes the case where saving would bounce a query back to the root.
- **Export progress** no longer shows `NaN` or percentages over 100%.
- **Modals** with a lot of content now scroll properly instead of overflowing.
- **Schema builder header** is now sticky so column controls stay in view while you scroll.
- **Bastion / jump host** background and padding render correctly under the system dark theme.
- **Plugin menus** now share the same styling as the rest of the app's menus.
- **File picker** only shows the pointer cursor when it's actually editable.
- **Page navigation** no longer fires when focus is inside an editable element.
- **Cassandra rename** and **DuckDB column-type quoting**: fixed two silent bugs in the SQL change builders.
- **Trial licenses**: corrected the support-date expiration condition so valid trials aren't rejected.
- **Write-action shortcuts**, **checkbox context menu**, and a spurious "remote change" notification are all fixed.
- **Identifier handling** updated, with an integration test covering identifier updates.


## Security

- **Shell execution hardening**: added exploit tests for shell execution paths to guard against remote code execution.
- **SQL injection**: fixed injection vulnerabilities in `buildDatabaseFilter`.
- **Dependency bumps** to clear a batch of advisories: follow-redirects, @xmldom/xmldom, ws, js-cookie, uuid, protobufjs (and protobufjs/utf8), @babel/plugin-transform-modules-systemjs, plus a yarn.lock refresh to clear undici, flatted, and other transitive alerts.


## Under the Hood

- **Database test coverage** expanded significantly across the common driver interface, plus new earthdistance operator formatting tests.
- **CI**: trimmed the e2e PR trigger and added concurrency, cached Playwright browsers and e2e deps, and bumped some old checkout actions.
- **Linting**: `yarn lint` now actually lints, and a pile of ESLint rule violations and code-quality issues were cleaned up.
- **BaseModal** wrapper component introduced to standardize modal behaviour.
- **Backup and SSH tests** fixed.


## Thank You to Our Contributors!

Big thanks to the community folks who sent PRs for this release, including @vaibhavvikas (empty connection folders), @jim-fn (MongoDB AWS auth), @andreasarf (Cassandra UUID collections), @NianJiuZst (Oracle loading state), @v-astakhov (Greengage icons and docs), and everyone else who filed issues and helped us track things down.

**Full Changelog**: https://github.com/beekeeper-studio/beekeeper-studio/compare/v5.7.3...v5.8.0


## PR Merge List

95326140b Merge pull request #4336 from beekeeper-studio/fix/query-editor
4546b8490 Merge pull request #4317 from beekeeper-studio/claude/cloud-query-audit-refactor
134ce1cbf Merge pull request #4320 from beekeeper-studio/fix/bastion-host-system-dark-theme
fda64b3a1 Merge pull request #4326 from beekeeper-studio/fix/plugin-menu-style
740219956 Merge pull request #4316 from beekeeper-studio/claude/funny-johnson-5BkhG
cb0529f59 Merge pull request #4325 from beekeeper-studio/chore/ai-shell
67a168d64 Merge pull request #4324 from beekeeper-studio/fix/file-picker-style
178edb3a4 Merge pull request #4306 from beekeeper-studio/fix/ident
c80521c77 Merge pull request #4310 from beekeeper-studio/claude/admiring-brown-kGgNQ
2cac7ad56 Merge pull request #4283 from beekeeper-studio/fix/querystream
d1b009808 Merge pull request #4302 from beekeeper-studio/fix/sticky-schema-builder-header
031060574 Merge pull request #4174 from beekeeper-studio/claude/fix-disconnection-issue-RVGZv
f1a5a99b7 Merge pull request #4291 from beekeeper-studio/dependabot/npm_and_yarn/js-cookie-3.0.7
ac8196ebb Merge pull request #4281 from beekeeper-studio/dependabot/npm_and_yarn/ws-8.20.1
284326f8d Merge pull request #4290 from beekeeper-studio/dependabot/npm_and_yarn/uuid-11.1.1
2e3da91aa Merge pull request #4293 from beekeeper-studio/claude/optimistic-wozniak-OeLRx
3706b6a1a Merge pull request #4213 from beekeeper-studio/claude/fix-rce-vulnerabilities-lAdce
98a178eb0 Merge pull request #4204 from beekeeper-studio/claude/improve-db-test-coverage-8puAu
8d2c59a28 Merge pull request #4257 from vaibhavvikas/feature/show-empty-connection-folders
55afcb8c6 Merge pull request #4295 from beekeeper-studio/fix/update-ident
235389c35 Merge pull request #4229 from beekeeper-studio/chore/fix-lint-script
0dae9e9e5 Merge pull request #4263 from jim-fn/fix/aws4-mongodb-aws-auth
40d66f522 Merge pull request #4280 from beekeeper-studio/fix/backup-tests
fb98c9d08 Merge pull request #4264 from beekeeper-studio/claude/youthful-meitner-aWbHD
ee404916c Merge pull request #4284 from v-astakhov/greengage-icons
da709f403 Merge pull request #4120 from beekeeper-studio/dynamo-db
936c44af2 Merge pull request #4217 from beekeeper-studio/feat/query-audit-history
b3a686d58 Merge pull request #4271 from beekeeper-studio/upgrade-panel-everywhere
e5c6ec977 Merge pull request #4270 from beekeeper-studio/upgrade-modal-update
bcbeb0636 Merge pull request #4254 from beekeeper-studio/claude/youthful-meitner-6hF4A
6fc55e3b7 Merge pull request #4267 from beekeeper-studio/claude/fix-workspace-license-bug-qhRMR
262b7d8ae Merge pull request #4253 from beekeeper-studio/fix/entra-docs
e17cfa93b Merge pull request #4255 from beekeeper-studio/claude/animate-upgrade-prompt-mJpbf
abfe5dd9c Merge pull request #4249 from beekeeper-studio/dependabot/npm_and_yarn/protobufjs-7.5.8
0ee24df47 Merge pull request #4245 from beekeeper-studio/dependabot/npm_and_yarn/protobufjs/utf8-1.1.1
009f84f37 Merge pull request #4252 from beekeeper-studio/claude/fix-license-validation-error-I6AaN
decf5c042 Merge pull request #4237 from beekeeper-studio/dependabot/npm_and_yarn/babel/plugin-transform-modules-systemjs-7.29.4
1b85c8ba3 Merge pull request #4242 from beekeeper-studio/import-modal-fixes
17433a00c Merge pull request #4239 from beekeeper-studio/claude/gifted-mayer-XYKkF
97460d319 Merge pull request #4233 from beekeeper-studio/chore/ci-tweaks
b732a279c Merge pull request #4220 from andreasarf/bugfix/cassandra-uuid-collection
0b8a47ebf Merge pull request #4230 from beekeeper-studio/chore/cache-e2e-deps
a092039b5 Merge pull request #4228 from beekeeper-studio/chore/security-dep-bumps-followup
2c34165d5 Merge pull request #4227 from beekeeper-studio/chore/security-dep-bumps
277f14310 Merge pull request #4224 from beekeeper-studio/fix/ssh-tests
a555d2000 Merge pull request #4201 from beekeeper-studio/fix/bastion-host-dark-bg
4a2ae18f2 Merge pull request #4018 from beekeeper-studio/feat/driver-dep-auto-download
92999bcd3 Merge pull request #4180 from NianJiuZst/fix/oracle-loading-state-4178
687f97f9a Merge pull request #4210 from beekeeper-studio/claude/fix-issue-4208-9YYSz
defbb37ef Merge pull request #4190 from beekeeper-studio/claude/fix-used-connection-bug-7vqyp
b1570634c Merge pull request #4195 from beekeeper-studio/claude/fix-ssh-config-reader-h2ewM
6b1bf7b56 Merge pull request #4131 from beekeeper-studio/chore/base-modal
5b8e8be20 Merge pull request #4203 from beekeeper-studio/claude/fix-reproducible-bug-EfH6F
2ad1d2054 Merge pull request #4198 from beekeeper-studio/fix/write-actions-shortcuts
e86f6ca5a Merge pull request #4191 from beekeeper-studio/fix/checkbox-context-menu
35de793a4 Merge pull request #4176 from beekeeper-studio/fix/fake-remote-change
5342f086d Merge pull request #4097 from beekeeper-studio/dependabot/npm_and_yarn/follow-redirects-1.16.0
a2495f437 Merge pull request #4156 from beekeeper-studio/dependabot/npm_and_yarn/xmldom/xmldom-0.8.13
fce264eac Merge pull request #4164 from beekeeper-studio/updated-readmes-1777052053
6f9db1780 Merge pull request #4130 from v-astakhov/greengage-docs
44cc179e2 Merge pull request #4135 from beekeeper-studio/claude/upgrade-sql-formatter-4qM3D
82244998c Merge pull request #4118 from beekeeper-studio/claude/fix-backend-bug-DaCn1
