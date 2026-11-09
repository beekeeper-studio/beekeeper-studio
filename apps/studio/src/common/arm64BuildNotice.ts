import type { IPlatformInfo } from "@/common/IPlatformInfo";

// The x64 Windows build runs on ARM64 PCs under emulation, and auto-update
// keeps it on x64 (process.arch is x64 there). This notice is how those users
// find out the native ARM64 build exists.
//
// MSI installs don't get it: IT deploys those, and the per-user installer it
// would point to leaves a second copy next to the managed one. Admins switch
// by deploying the ARM64 MSI (docs/installation/windows-enterprise.md).

export const ARM64_BUILD_NOTICE_DISMISSED_KEY = "arm64BuildNoticeDismissed";

export const ARM64_BUILD_DOCS_URL = "https://docs.beekeeperstudio.io/installation/windows/#windows-on-arm";

type NoticePlatform = Pick<IPlatformInfo, "isWindows" | "runningUnderArm64Translation" | "isPortable" | "isMsi">;

export function shouldOfferArm64Build(platform: NoticePlatform, dismissed: boolean): boolean {
  return !!platform.isWindows && !!platform.runningUnderArm64Translation && !platform.isMsi && !dismissed;
}

/** The website's download page, for the same kind of build (installer or portable) as this one */
export function arm64BuildDownloadUrl(platform: NoticePlatform): string {
  const type = platform.isPortable ? "portable" : "installer";
  return `https://www.beekeeperstudio.io/download/?ext=exe&arch=arm64&type=${type}`;
}
