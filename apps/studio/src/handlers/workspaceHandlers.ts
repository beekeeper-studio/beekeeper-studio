import { CloudCredential } from "@/common/appdb/models/CloudCredential"
import { CloudClient, CloudClientOptions } from "@/lib/cloud/CloudClient";
import platformInfo from '@/common/platform_info';
import { state } from "./handlerState";


export interface IWorkspaceHandlers {
  "workspace/setActive": ({ sId, wId, credentialId }: { sId: string, wId: number, credentialId: number }) => Promise<void>,
}

export const WorkspaceHandlers: IWorkspaceHandlers = {
  "workspace/setActive": async function({ sId, wId, credentialId }: { sId: string, wId: number, credentialId: number }): Promise<void> {
    const cred = await CloudCredential.findOneBy({ id: credentialId });

    if (!cred) {
      throw new Error('Could not find matching credential for id when setting workspace');
    }

    const options: CloudClientOptions = {
      app: cred.appId,
      email: cred.email,
      token: cred.token,
      baseUrl: platformInfo.cloudUrl,
      clientVersion: platformInfo.appVersion,
      workspace: wId,
    };

    const client = new CloudClient(options);
    state(sId).cloudClient = client;
  }
}
