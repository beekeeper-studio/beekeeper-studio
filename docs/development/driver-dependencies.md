---
title: Adding a Driver Dependency
summary: How to register an external file dependency that a database driver needs at runtime.
---

# Adding a Driver Dependency

Some database drivers depend on binary files that can't ship inside the
app (e.g. Oracle Instant Client). The driver-deps framework
auto-downloads those files on demand, shows the user a license + details
modal, and writes the install path back into a user setting so the
existing driver flow picks it up.

## Mental model

The integration is a single shared `UserSetting` key:

- The **driver** reads a filesystem path from a user setting (e.g.
  `oracleInstantClient`) at connect time.
- A **provider** supplies the files for that same setting key —
  downloads, extracts, and writes the resulting path back into the
  setting.
- The connection form binds a `SettingsInput` to the same key. That
  binding is what surfaces the auto-download button next to the field.

The `settingKey` is the only contract between provider and driver —
nothing else is shared. If a driver already reads its path from a
user setting, adding auto-download to it is purely additive: no
driver-side or form changes are needed.

This page explains how to register a new dependency. Adding one is
intentionally small: write a provider class, then add one line to the
default registry.

## Where the code lives

```
apps/studio/src/services/driverDeps/
├── DriverDepFileManager.ts      # download + extract + on-disk layout
├── DriverDepManager.ts          # orchestrates installs / lookups
├── DriverDepRegistry.ts         # in-memory registry of providers
├── index.ts                     # default registry (add your provider here)
├── providers/
│   └── OracleInstantClientProvider.ts
└── types.ts                     # DriverDepProvider, DriverRequirement, ...
```

## Step 1: Implement a provider

Create `apps/studio/src/services/driverDeps/providers/MyDriverProvider.ts`.
A provider is self-describing — it declares its requirement metadata, the
connection types it applies to, and resolves the platform-specific
artifacts at runtime.

```ts
import {
  DriverDepProvider,
  DriverDepProviderInfo,
  DriverRequirement,
} from "../types";

export const MY_DRIVER_REQUIREMENT_ID = "my-driver-files";

export default class MyDriverProvider implements DriverDepProvider {
  readonly requirement: DriverRequirement = {
    id: MY_DRIVER_REQUIREMENT_ID,
    name: "My Driver Files",
    // The UserSetting key the install path is written to. The
    // SettingsInput component bound to this key auto-renders the
    // download button — no form changes required.
    // The integration contract. The driver reads its path from this
    // user setting; the manager writes the install path here after
    // download. The connection form's SettingsInput must use the
    // same key.
    settingKey: "myDriverFiles",
    required: false,
  };

  // Connection types where this dep is offered (matches DB client `connectionType`).
  readonly connectionTypes = ["mydriver"];

  async resolve(): Promise<DriverDepProviderInfo> {
    return {
      requirementId: this.requirement.id,
      version: "1.2.3",
      artifacts: [
        {
          platform: "linux",
          arch: "x64",
          url: "https://example.com/my-driver-1.2.3-linux-x64.zip",
          fileName: "my-driver-1.2.3-linux-x64.zip",
        },
        // ...mac, windows
      ],
      licenseName: "My Driver License 1.0",
      licenseUrl: "https://example.com/license",
      documentationUrl: "https://example.com/docs",
      // Optional: directory inside the archive to expose as the install
      // path. Omit to auto-detect the first top-level extracted dir.
      extractedDirName: "my-driver-1.2.3",
      restartRequired: true,
      notes: [
        {
          platforms: ["linux"],
          text: "Requires glibc 2.x or later.",
        },
      ],
    };
  }
}
```

A few rules worth noting:

- `requirement.settingKey` must match the `key` on the `SettingsInput`
  used by the connection form. That binding is what makes the
  auto-download button appear next to the field.
- `artifacts` covers `platform` ∈ `{linux, mac, windows}` and `arch` ∈
  `{x64, arm64}`. If a user's platform is missing, the install fails
  with a clear error and the manual download URL is offered.
- If `extractedDirName` is omitted, the file manager uses the first
  top-level directory in the extracted archive. Set it explicitly when
  the archive layout is stable.

## Step 2: Register it

Open `apps/studio/src/services/driverDeps/index.ts` and add an instance
of your provider to `DEFAULT_PROVIDERS`:

```ts
import MyDriverProvider from "./providers/MyDriverProvider";

const DEFAULT_PROVIDERS = [
  new OracleInstantClientProvider(),
  new MyDriverProvider(),
];
```

That's it. The registry, manager, IPC handlers, and the
`AutoDownloadButton` UI will pick up the new provider automatically.

## How the UI hooks in

`SettingsInput` checks the registry by `settingKey`. When a provider is
found, it renders an `AutoDownloadButton` next to the field. Clicking it
opens the license + details modal (URL, install path, platform notes),
and accepting kicks off a download in the utility process whose
progress is streamed to a Noty toast.

The install path is written back to the matching `UserSetting`, so
existing driver code that already reads that setting needs no changes.

## Testing checklist

- Open the connection form for your driver, confirm the auto-download
  button appears next to the relevant `SettingsInput`.
- Click it and confirm the license modal shows your URL, install path,
  version, and any platform-specific notes.
- Accept and confirm progress noty cycles through downloading →
  extracting → installing → complete.
- Confirm the file lands under
  `~/.config/beekeeper-studio/driver-deps/<requirement-id>/`.
- Confirm the user setting now contains the install path and that
  clearing it (the small "x" on the filled card) removes the install
  directory.
