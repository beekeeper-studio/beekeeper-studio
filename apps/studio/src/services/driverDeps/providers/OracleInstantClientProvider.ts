import {
  DriverDepProvider,
  DriverDepProviderInfo,
  DriverDepArtifact,
  DriverRequirement,
} from "../types";

/**
 * URLs sourced from Oracle's public CDN.
 *
 * Linux and Windows have versioned URLs pinned to 21.17 (matching bin/get-instant-client.sh).
 * macOS only publishes a versionless "latest" URL — Oracle doesn't provide versioned
 * macOS downloads. The file manager will auto-detect the extracted directory name.
 */
const ARTIFACTS: DriverDepArtifact[] = [
  {
    platform: "linux",
    arch: "x64",
    url: "https://download.oracle.com/otn_software/linux/instantclient/2117000/instantclient-basic-linux.x64-21.17.0.0.0dbru.zip",
    fileName: "instantclient-basic-linux.x64-21.17.0.0.0dbru.zip",
  },
  {
    platform: "mac",
    arch: "x64",
    url: "https://download.oracle.com/otn_software/mac/instantclient/instantclient-basic-macos.zip",
    fileName: "instantclient-basic-macos.zip",
  },
  {
    platform: "windows",
    arch: "x64",
    url: "https://download.oracle.com/otn_software/nt/instantclient/2117000/instantclient-basic-windows.x64-21.17.0.0.0dbru.zip",
    fileName: "instantclient-basic-windows.x64-21.17.0.0.0dbru.zip",
  },
];

export const ORACLE_INSTANT_CLIENT_REQUIREMENT_ID = "oracle-instant-client";

export default class OracleInstantClientProvider implements DriverDepProvider {
  readonly requirement: DriverRequirement = {
    id: ORACLE_INSTANT_CLIENT_REQUIREMENT_ID,
    name: "Oracle Instant Client",
    // The Oracle driver reads this user setting at connect time to find
    // the Instant Client directory. After install, the manager writes the
    // extracted path here — this `settingKey` is the entire contract
    // between this provider and the driver.
    settingKey: "oracleInstantClient",
    required: false,
  };

  readonly connectionTypes = ["oracle"];

  async resolve(): Promise<DriverDepProviderInfo> {
    return {
      requirementId: this.requirement.id,
      version: "21.17.0",
      artifacts: ARTIFACTS,
      licenseName: "Oracle Free Use Terms and Conditions",
      licenseUrl: "https://www.oracle.com/downloads/licenses/oracle-free-license.html",
      documentationUrl: "https://www.oracle.com/database/technologies/instant-client/downloads.html",
      // Linux and Windows extract to instantclient_21_17.
      // macOS uses a versionless URL so the dir name may differ — the file
      // manager auto-detects the first top-level directory when this is omitted.
      extractedDirName: "instantclient_21_17",
      restartRequired: true,
      notes: [
        {
          platforms: ["linux"],
          text: "Oracle Instant Client 21.x requires glibc 2.14 or later. "
            + "If your system has an older glibc version, you will need to download "
            + "an earlier version of the Instant Client manually from the Oracle website.",
        },
      ],
    };
  }
}
