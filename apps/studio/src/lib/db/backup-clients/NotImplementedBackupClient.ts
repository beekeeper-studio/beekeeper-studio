import { BaseCommandClient } from "../BaseCommandClient";
import { SupportedBackupFeatures, Command } from "../models";

export class NotImplementedBackupClient extends BaseCommandClient {
  defaultFileType = '';

  get settingsSections(): any {
      throw new Error("Method not implemented.");
  }
  supportedFeatures(): SupportedBackupFeatures {
    return {
      selectObjects: false,
      settings: false,
    };
  }
  runCommand(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  processLog(_chunk: any): string[] {
    throw new Error("Method not implemented.");
  }
  buildCommand(): Command {
    throw new Error("Method not implemented.");
  }
}
