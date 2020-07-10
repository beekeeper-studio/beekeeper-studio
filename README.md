For those looking to contribute, check out [Milestone 1.6](https://github.com/beekeeper-studio/beekeeper-studio/issues?q=is%3Aopen+is%3Aissue+milestone%3A%22V1.6+-+Smooth+out+features%22) for a mix of easy, medium, and hard issues.

# Beekeeper Studio

Beekeeper Studio is a free and open source SQL editor and database manager. Beekeeper Studio is cross-platform, and available for Linux, Mac, and Windows.

## Features

- Autocomplete SQL query editor with syntax highlighting
- Tabbed interface, so you can multitask
- Sort and filter table data to find just what you need
- Sensible keyboard-shortcuts
- Save queries for later
- Query run-history, so you can find that one query you got working 3 days ago
- Default dark theme

One of our frustrations with other open-source SQL editors and database managers is that they take a 'kitchen sink' approach to features, adding so many features that the UI becomes cluttered and hard to navigate. We wanted a good looking, open source SQL workbench that's powerful, but also easy to use. We couldn't find one, so we created it!

![SQL Editing Demo](https://raw.githubusercontent.com/beekeeper-studio/beekeeper-studio/master/screenshots/beekeeper-studio-demo.gif)

Beekeeper Studio supports connecting to the following databases:

- SQLite
- MySQL
- MariaDB
- Postgres
- SQL Server
- Amazon Redshift

## Installation

Download the latest release from the [releases page](https://github.com/beekeeper-studio/beekeeper-studio/releases), or from [our website](https://beekeeperstudio.io)

## Contributing

Please feel free to file issues, open pull requests, or comment on existing issues with feedback.

Building an inclusive and welcoming community is important to us, so please follow our code of conduct as you engage with the project.


## Big Thanks

Beekeeper Studio wouldn't exist without [Sqlectron-core](https://github.com/sqlectron/sqlectron-core), the core database libraries from the (now unmaintained) Sqlectron project. Beekeeper Studio started as an experimental fork of that repository. A big thanks to @maxcnunes and the rest of the Sqlectron community.

## Maintainer notes (casual readers can ignore this stuff)


### Release Process 

1. Up the version number in package.json
2. Replace `build/release-notes.md` with the latest release notes. Follow the format that is there.
  - run `git log <last-tag>..HEAD --oneline | grep 'Merge pull' to find PRs merged
2. Commit
3. Push to master
4. Create a tag `git tag v<version>`. It must start with a 'v'
5. `git push origin <tagname>`
  - Now wait for the build/publish action to complete on Github
6. Push the new release live
  - Go to the new 'draft' release on the releases tab of github, edit the notes, publish
  - Log into snapcraft.io, drag the uploaded release into the 'stable' channel for each architecture.

This should also publish the latest docs

Post Release:
1. Copy release notes to a blog post, post on website
2. Tweet link
3. Share on LinkedIn
4. Send to mailing list on SendInBlue

