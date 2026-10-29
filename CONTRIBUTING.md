## Contributing Guidelines

Last updated: Feb 27 2022

We welcome community contributions! If you're thinking of contributing, thank you!

We ask that all contributors abide by our [code of conduct](https://github.com/beekeeper-studio/beekeeper-studio/blob/master/code_of_conduct.md)


### Opening Issues

We have templates for questions, features, or bug reports, please follow the directions in these templates, but generally:

- Please give as much detail as possible about the feature or issue.
- Include OS, database type, database version, and app version
- Include steps to replicate (eg the SQL to run)

### Pull Requests

It's usually best to open an issue before spending a lot of time working on the code, just in case someone else is working on the same problem. We're always happy to discuss how to implement or design things to help you before you begin work.

Sometimes we don't merge pull requests if they don't meet our design goals, but we really never want this to happen, so please talk to us!

### Style Guide

#### Form Inputs

Use the `.form-group` class when an input has a label, hint, or both. It provides standard flex column layout, label styling, and hint text styling. A standalone input without a label or hint does not need `.form-group`.

```html
<!-- Input only (no .form-group needed) -->
<input type="text" v-model="value">

<!-- With label -->
<div class="form-group">
  <label for="myInput">Label</label>
  <input id="myInput" type="text" v-model="value">
</div>

<!-- With label and hint -->
<div class="form-group">
  <label for="myInput">Label</label>
  <input id="myInput" type="text" v-model="value">
  <div class="hint">Helper text goes here</div>
</div>

<!-- Component input with label and hint -->
<div class="form-group">
  <label>Host</label>
  <masked-input v-model="hostname" />
  <div class="hint">The hostname or IP address of your database</div>
</div>
```

Input components like `MaskedInput`, `FilePicker`, and `ColorPicker` work on their own. Wrap them in `.form-group` only if you need a label or helper text.

#### Privacy mode masking

For inputs that should be masked in privacy mode, use the `MaskedInput` component (`apps/studio/src/components/MaskedInput.vue`).

```html
<div class="form-group">
  <label>Host</label>
  <masked-input v-model="hostname" />
  <!-- OR -->
  <masked-input :value="hostname" @input="hostname = $event" />
</div>
```

### Legal

All contributions to this repository are made under the [MIT License](https://opensource.org/licenses/MIT).

#### What this means practically

If you make a PR, the PR code is licensed as MIT. As soon as I copy (merge) the code into this repository it is then made available under the GPLv3 as part of Beekeeper Studio. The code is still copyright to you, and your original MIT license still applies to the code in your PR. The MIT license requires that I maintain the copyright notice, which is made available below.

#### Why do it this way

Practically speaking, we need to have the ability to change the Beekeeper Studio license in the future if we need to, by providing your contributions under the MIT license, we can do so without requiring that all contributors sign a [CLA](https://en.wikipedia.org/wiki/Contributor_License_Agreement) or hand over their copyright to us. This is a pretty common way to manage contributions for a large-ish open source project, so it should be totally fine for 99% of contributors.

#### MIT License for Contributions

Copyright 2022 Code Contributor (whoever you are)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Maintainer notes

#### Upgrading Electron Gotchas

This is always a total pain and will break the build 9/10.

Some things you need to consider when upgrading Electron:

1. Does it use a different node version. Eg Electron-18 uses node 14, 22 uses node 16. So everyone needs to upgrade
2. Does node-abi need to be upgraded to be able to understand the electron version? This is used in the build to fetch prebuilt packages. You need to upgrade this in root/package.json#resolutions
3. Were any APIs deprecated or removed? Make sure all features that interact with the Electron APIs still work, stuff like - selecting a file, maximizing a window, running a query, etc.


#### Release Process

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
