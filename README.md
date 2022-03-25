# Beekeeper Studio

Beekeeper Studio is a cross-platform SQL editor and database manager available for Linux, Mac, and Windows. Beekeeper Studio is GPL licensed so it is free (libre) and free (gratis).

![Beekeeper Studio Screenshot](https://docs.beekeeperstudio.io/assets/img/hero.289d6ce0.jpg)

## Editions of Beekeeper Studio

1. **Beekeeper Studio Community Edition** - This repository. This is the open source version of Beekeeper Studio. It is a full featured database management client that is totally free and open source.

2. **Beekeeper Studio Ultimate Edition** - A commercial version of Beekeeper Studio with extra features and provided with a business-friendly commercial license.

👉 [Compare Beekeeper Studio Editions](https://beekeeperstudio.io/get)

👉 [Download Beekeeper Studio](https://beekeeperstudio.io/get)

## Beekeeper Studio Features

Top feature: It's smooth 🍫, fast 🏎, and you'll actually enjoy using it 🥰

- Truly cross-platform: Windows, MacOS, and Linux
- Autocomplete SQL query editor with syntax highlighting
- Tabbed interface, so you can multitask
- Sort and filter table data to find just what you need
- Sensible keyboard-shortcuts
- Save queries for later
- Query run-history, so you can find that one query you got working 3 days ago
- Default dark theme

One of our frustrations with other open-source SQL editors and database managers is that they take a 'kitchen sink' approach to features, adding so many features that the UI becomes cluttered and hard to navigate. We wanted a good looking, open source SQL workbench that's powerful, but also easy to use. We couldn't find one, so we created Beekeeper Studio!

Beekeeper Studio supports connecting to the following databases:

- SQLite
- MySQL
- MariaDB
- Postgres
- CockroachDB
- SQL Server
- Amazon Redshift

## Installation

Download the latest release from [our website](https://beekeeperstudio.io/get)

## Documentation

Check out [docs.beekeeperstudio.io](https://docs.beekeeperstudio.io) for user guides, FAQs, troubleshooting tips, and more.

## License

Beekeeper Studio Community Edition (the code in this repository) is licensed under the GPLv3 license.

Beekeeper Studio Ultimate Edition contains extra features and is licensed under a [commercial end user agreement (EULA)](https://beekeeperstudio.io/legal/commercial-eula/).

Beekeeper Studio's trademarks (words marks and logos) are not open source. See our [trademark guidelines](https://beekeeperstudio.io/legal/trademark/) for more information.

## Trademark Guidelines

Trademarks can be complicated with open source projects, so we have adapted a set of standard guidelines for using our trademarks that are common to many open source projects.

If you are just using the Beekeeper Studio app, and you are not forking or distributing Beekeeper Studio code in any way, these probably don't apply to you.

👉 [Beekeeper Studio Trademark Guidelines](https://beekeeperstudio.io/legal/trademark/)

## Contributing to Beekeeper Studio

We love *any* community engagement. Even if you're complaining because you don't like something about the app!


### Contributor Agreements

- Building an inclusive and welcoming community is important to us, so please follow our [code of conduct](code_of_conduct.md) as you engage with the project.

- By contributing to the project you agree to the terms of our [contributor guidelines](CONTRIBUTING.md).

### Contribute without coding

We have you covered, read our [guide to contributing in 10 minutes without coding](https://github.com/beekeeper-studio/beekeeper-studio/issues/287).

### Compiling and Running Beekeeper Studio Locally

Want to write some code and improve Beekeeper Studio? Getting set-up is easy on Mac, Linux, or Windows.

```bash
# First: Install NodeJS 12 or 14, NPM, and Yarn
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

The original license from sqlectron-core is included here:

```
Copyright (c) 2015 The SQLECTRON Team

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
