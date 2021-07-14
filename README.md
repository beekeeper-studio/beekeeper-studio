# Beekeeper Studio

Beekeeper Studio is a cross-platform SQL editor and database manager available for Linux, Mac, and Windows.

Beekeeper Studio is MIT licensed so it is free (libre) and free (gratis). 

Download now [from our website](https://beekeeperstudio.io)

Love Beekeeper Studio and want to help, but can't write code? [We have some ideas for you](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

## Features

Top feature: It's smooth 🍫, fast 🏎, and you'll actually enjoy using it 🥰

- Autocomplete SQL query editor with syntax highlighting
- Tabbed interface, so you can multitask
- Sort and filter table data to find just what you need
- Sensible keyboard-shortcuts
- Save queries for later
- Query run-history, so you can find that one query you got working 3 days ago
- Default dark theme

One of our frustrations with other open-source SQL editors and database managers is that they take a 'kitchen sink' approach to features, adding so many features that the UI becomes cluttered and hard to navigate. We wanted a good looking, open source SQL workbench that's powerful, but also easy to use. We couldn't find one, so we created it!

![Beekeeper Studio Screenshot](https://www.beekeeperstudio.io/assets/img/screenshots/main-dark-9e3099be326f5ba8f2389545e6811e9dda80ae842f210450385226f7cf3cc817.png)

Beekeeper Studio supports connecting to the following databases:

- SQLite
- MySQL
- MariaDB
- Postgres
- CockroachDB
- SQL Server
- Amazon Redshift

## Installation

Download the latest release from the [releases page](https://github.com/beekeeper-studio/beekeeper-studio/releases), or from [our website](https://beekeeperstudio.io)

## Documentation

Check out [docs.beekeeperstudio.io](https://docs.beekeeperstudio.io) for user guides, FAQs, troubleshooting tips, and more.

## Contributing to Beekeeper Studio

We love *any* community engagement. Even if you're complaining because you don't like something about the app!

Because building an inclusive and welcoming community is important to us, please follow our code of conduct as you engage with the project.

### Contribute without coding

We have you covered, read our [guide to contributing in 10 minutes without coding](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

### Starting the Dev version of Beekeeper Studio

Want to write some code and improve Beekeeper Studio? Getting set-up is easy on Mac, Linux, or Windows.

```bash
# First: Install NodeJS 12+, NPM, and Yarn
# ...

# 1. Fork the Beekeeper Studio Repo (click fork button at top right of this screen)
# 2. Check out your fork:
git clone git@github.com:<your-username>/beekeeper-studio.git beekeeper-studio
cd beekeeper-studio/
yarn install # installs dependencies

# Now you can start the app:
yarn run electron:serve ## the app will now start
```

### Where to make changes?

This repo is now a monorepo, we have several places with code, but only really a couple of important entry points.

All app code lives in `apps/studio`, some shared code lives in `shared/src`. This is shared with other apps.

Beekeeper Studio has two entry points:
- `background.js` - this is the electron-side code that controls native things like showing windows.
- `main.js` - this is the entry point for the Vue.js app. You can follow the Vue component breadcrumbs from `App.vue` to find the screen you need.

**Generally we have two 'screens':**
- ConnectionInterface - connecting to a DB
- CoreInterface - interacting with a database

### How to submit a change?

- Push your changes to your repository and open a Pull Request from our github page (this page)
- Make sure to write some notes about what your change does! A gif is always welcome for visual changes.

## Maintainer notes (casual readers can ignore this stuff)


### Release Process 

1. Up the version number in package.json
2. Replace `build/release-notes.md` with the latest release notes. Follow the format that is there.
  - run `git log <last-tag>..HEAD --oneline | grep 'Merge pull'` to find PRs merged
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


## Big Thanks

Beekeeper Studio wouldn't exist without [Sqlectron-core](https://github.com/sqlectron/sqlectron-core), the core database libraries from the [Sqlectron project](https://github.com/sqlectron/sqlectron-gui). Beekeeper Studio started as an experimental fork of that repository. A big thanks to @maxcnunes and the rest of the Sqlectron community.
