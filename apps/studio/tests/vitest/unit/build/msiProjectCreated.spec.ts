import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { MSI_MARKER_FILE } from "@/common/msiInstall";

// Loaded the way electron-builder loads it: a plain CommonJS module.
const hook = createRequire(import.meta.url)("../../../../build/win/msiProjectCreated.js");
const {
  MARKER_FILE, VC_RUNTIMES, VC_RUNTIME_MESSAGE, SKIP_VC_RUNTIME_PROPERTY, ARM64_ONLY_MESSAGE,
  addMarkerComponent, addVcRuntimeCheck, addArm64OnlyCheck, archFromProjectFile,
} = hook;
const msiProjectCreated = hook.default;

// Render electron-builder's own MSI template the same way MsiTarget does, so
// an electron-builder upgrade that changes the template fails here, not in a
// release build.
function renderMsiTemplate(): string {
  const builderRequire = createRequire(require.resolve("app-builder-lib/package.json"));
  const ejs = builderRequire("ejs");
  const templatePath = path.join(path.dirname(require.resolve("app-builder-lib/package.json")), "templates", "msi", "template.xml");
  const template = fs.readFileSync(templatePath, "utf8")
    .replace(/{{/g, "<%")
    .replace(/}}/g, "%>")
    .replace(/\${([^}]+)}/g, "<%=$1%>");

  return ejs.compile(template)({
    isPerMachine: true,
    isAssisted: false,
    isCreateDesktopShortcut: false,
    isCreateStartMenuShortcut: true,
    isRunAfterFinish: false,
    menuCategory: null,
    shortcutName: "Beekeeper Studio",
    iconPath: null,
    iconId: "BeekeeperStudioIcon.exe",
    compressionLevel: "high",
    version: "6.1.5.0",
    productName: "Beekeeper Studio",
    upgradeCode: "D5B3EEEB-1754-55D1-A12B-C0245BF59784",
    manufacturer: "Beekeeper Studio Team",
    appDescription: "",
    programFilesId: "ProgramFiles64Folder",
    installationDirectoryWixName: "Beekeeper Studio",
    dirs: '<Directory Id="dresources" Name="APPLICATIONFOLDER:\\resources\\"/>',
    files: [
      '<Component>',
      '        <File Name="Beekeeper Studio.exe" Source="$(var.appDir)\\Beekeeper Studio.exe" ReadOnly="yes" KeyPath="yes" Id="mainExecutable"/>',
      '      </Component>',
      '      <Component Directory="dresources">',
      '        <File Name="app.asar" Source="$(var.appDir)\\resources\\app.asar" ReadOnly="yes" KeyPath="yes"/>',
      '      </Component>',
    ].join("\n"),
  });
}

function parse(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
  return doc;
}

describe("msiProjectCreated hook", () => {
  describe("Visual C++ runtime check", () => {
    it("refuses to install unless the x64 runtime is registered", () => {
      const doc = parse(addVcRuntimeCheck(renderMsiTemplate()));
      const product = doc.querySelector("Product");

      const property = product.querySelector(':scope > Property[Id="BKS_VCRUNTIME_X64"]');
      const searches = [...property.querySelectorAll("RegistrySearch")];
      // both registry views, since the runtime's own docs don't settle which one
      expect(searches.map((s) => s.getAttribute("Win64")).sort()).toEqual(["no", "yes"]);
      for (const search of searches) {
        expect(search.getAttribute("Root")).toBe("HKLM");
        expect(search.getAttribute("Key")).toBe("SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64");
        expect(search.getAttribute("Name")).toBe("Installed");
      }

      const condition = [...product.querySelectorAll(":scope > Condition")]
        .find((c) => c.getAttribute("Message") === VC_RUNTIME_MESSAGE);
      // Installed: repair and uninstall still work if the runtime goes away later
      expect(condition.textContent).toBe(
        'Installed OR SKIP_VCREDIST_CHECK = "1" OR BKS_VCRUNTIME_X64 = "#1"'
      );
    });

    it("lets admins skip the check with SKIP_VCREDIST_CHECK=1", () => {
      const doc = parse(addVcRuntimeCheck(renderMsiTemplate()));

      expect(SKIP_VC_RUNTIME_PROPERTY).toBe("SKIP_VCREDIST_CHECK");
      const property = doc.querySelector('Product > Property[Id="SKIP_VCREDIST_CHECK"]');
      // Secure, so a value set on the command line reaches the elevated install
      expect(property.getAttribute("Secure")).toBe("yes");
      expect(property.hasAttribute("Value")).toBe(false);
    });

    it("tells the admin where to get the runtime", () => {
      expect(VC_RUNTIME_MESSAGE).toContain("https://aka.ms/vc14/vc_redist.x64.exe");
    });

    it("is idempotent", () => {
      const once = addVcRuntimeCheck(renderMsiTemplate());
      expect(addVcRuntimeCheck(once)).toBe(once);
    });

    it("fails the build if the template no longer has MajorUpgrade", () => {
      expect(() => addVcRuntimeCheck("<Wix><Product/></Wix>")).toThrow(/MajorUpgrade/);
    });

    it("checks for the ARM64 runtime in the ARM64 MSI", () => {
      const doc = parse(addVcRuntimeCheck(renderMsiTemplate(), "arm64"));
      const product = doc.querySelector("Product");

      expect(product.querySelector(':scope > Property[Id="BKS_VCRUNTIME_X64"]')).toBeNull();
      const property = product.querySelector(':scope > Property[Id="BKS_VCRUNTIME_ARM64"]');
      const searches = [...property.querySelectorAll("RegistrySearch")];
      expect(searches.map((s) => s.getAttribute("Win64")).sort()).toEqual(["no", "yes"]);
      for (const search of searches) {
        expect(search.getAttribute("Key")).toBe("SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\ARM64");
      }

      const condition = [...product.querySelectorAll(":scope > Condition")]
        .find((c) => c.getAttribute("Message") === VC_RUNTIMES.arm64.message);
      expect(condition.textContent).toBe(
        'Installed OR SKIP_VCREDIST_CHECK = "1" OR BKS_VCRUNTIME_ARM64 = "#1"'
      );
      expect(VC_RUNTIMES.arm64.message).toContain("https://aka.ms/vc14/vc_redist.arm64.exe");
    });

    it("has no check for other architectures", () => {
      expect(() => addVcRuntimeCheck(renderMsiTemplate(), "ia32")).toThrow(/ia32/);
    });
  });

  describe("ARM64-only check", () => {
    // electron-builder builds the ARM64 MSI as an x64 package, so without this
    // Windows Installer would install the ARM64 app on x64 PCs
    it("refuses to install unless the CPU is ARM64", () => {
      const doc = parse(addArm64OnlyCheck(renderMsiTemplate()));
      const product = doc.querySelector("Product");

      const search = product.querySelector(':scope > Property[Id="BKS_PROCESSOR_ARCHITECTURE"] > RegistrySearch');
      expect(search.getAttribute("Root")).toBe("HKLM");
      expect(search.getAttribute("Key")).toBe("SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment");
      expect(search.getAttribute("Name")).toBe("PROCESSOR_ARCHITECTURE");
      expect(search.getAttribute("Win64")).toBe("yes");

      const condition = [...product.querySelectorAll(":scope > Condition")]
        .find((c) => c.getAttribute("Message") === ARM64_ONLY_MESSAGE);
      expect(condition.textContent).toBe('Installed OR BKS_PROCESSOR_ARCHITECTURE = "ARM64"');
    });

    it("is idempotent", () => {
      const once = addArm64OnlyCheck(renderMsiTemplate());
      expect(addArm64OnlyCheck(once)).toBe(once);
    });
  });

  it("reads the arch from electron-builder's stage directory name", () => {
    expect(archFromProjectFile(path.join("dist_electron", "__msi-x64", "project.wxs"))).toBe("x64");
    expect(archFromProjectFile(path.join("dist_electron", "__msi-arm64", "project.wxs"))).toBe("arm64");
  });

  it("uses the marker file name the app looks for", () => {
    expect(MARKER_FILE).toBe(MSI_MARKER_FILE);
  });

  it("adds the marker to the install directory's component group", () => {
    const doc = parse(addMarkerComponent(renderMsiTemplate()));

    const group = doc.querySelector('ComponentGroup[Id="ProductComponents"]');
    expect(group.getAttribute("Directory")).toBe("APPLICATIONFOLDER");

    const marker = group.querySelector('File[Id="bksMsiInstallMarker"]');
    expect(marker.getAttribute("Name")).toBe(MARKER_FILE);
    expect(marker.getAttribute("Source")).toBe(MARKER_FILE);
    expect(marker.getAttribute("KeyPath")).toBe("yes");
    // install root, not a subdirectory: the app looks next to the executable
    expect(marker.parentElement.tagName).toBe("Component");
    expect(marker.parentElement.hasAttribute("Directory")).toBe(false);
    expect(group.querySelectorAll("Component")).toHaveLength(3);
  });

  it("is idempotent", () => {
    const once = addMarkerComponent(renderMsiTemplate());
    expect(addMarkerComponent(once)).toBe(once);
  });

  it("fails the build if the template no longer has the component group", () => {
    expect(() => addMarkerComponent("<Wix><Product/></Wix>")).toThrow(/ProductComponents/);
  });

  describe("on disk", () => {
    let root: string;

    beforeEach(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), "bks-msi-"));
    });

    afterEach(() => {
      fs.rmSync(root, { recursive: true, force: true });
    });

    async function runHook(stageDirName: string) {
      const dir = path.join(root, stageDirName);
      fs.mkdirSync(dir);
      const projectFile = path.join(dir, "project.wxs");
      fs.writeFileSync(projectFile, renderMsiTemplate());
      await msiProjectCreated(projectFile);
      return { dir, doc: parse(fs.readFileSync(projectFile, "utf8")) };
    }

    it("writes the marker next to project.wxs and updates the project", async () => {
      const { dir, doc } = await runHook("__msi-x64");

      expect(fs.readFileSync(path.join(dir, MARKER_FILE), "utf8")).toMatch(/MSI/);
      expect(doc.querySelector('File[Id="bksMsiInstallMarker"]')).not.toBeNull();
      expect(doc.querySelector('Property[Id="BKS_VCRUNTIME_X64"]')).not.toBeNull();
      expect(doc.querySelector('Property[Id="BKS_PROCESSOR_ARCHITECTURE"]')).toBeNull();
    });

    it("adds the ARM64 checks to the ARM64 MSI", async () => {
      const { doc } = await runHook("__msi-arm64");

      expect(doc.querySelector('File[Id="bksMsiInstallMarker"]')).not.toBeNull();
      expect(doc.querySelector('Property[Id="BKS_VCRUNTIME_ARM64"]')).not.toBeNull();
      expect(doc.querySelector('Property[Id="BKS_VCRUNTIME_X64"]')).toBeNull();
      expect(doc.querySelector('Property[Id="BKS_PROCESSOR_ARCHITECTURE"]')).not.toBeNull();
    });
  });
});
