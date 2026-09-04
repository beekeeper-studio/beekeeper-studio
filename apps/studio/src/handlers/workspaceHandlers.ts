import { CloudCredential } from "@/common/appdb/models/CloudCredential"
import { CloudClient, CloudClientOptions } from "@/lib/cloud/CloudClient";
import platformInfo from '@/common/platform_info';
import { state } from "./handlerState";
import { promises as fs } from 'fs';
import { IObjectImportStats } from "@/common/interfaces/IObjectImportStats";
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";
import { QueryImporter } from "@/backend/lib/objectimport/query";
import { ConnectionImporter } from "@/backend/lib/objectimport/connection";


export interface IWorkspaceHandlers {
  "workspace/setActive": ({ sId, wId, credentialId }: { sId: string, wId: number, credentialId: number }) => Promise<void>,
  "workspace/importDirectory": ({ sId, dir, parentId, preserveRoot }: { sId: string, dir: string, parentId: number, preserveRoot: boolean }) => Promise<IObjectImportStats>,
  "workspace/importConnectionsDirectory": ({ sId, dir, parentId, preserveRoot }: { sId: string, dir: string, parentId: number, preserveRoot: boolean }) => Promise<IObjectImportStats>,
  "workspace/importConnections": ({ sId, paths, parentId }: { sId: string, paths: string[], parentId: number }) => Promise<IObjectImportStats>
}

export const WorkspaceHandlers: IWorkspaceHandlers = {
  "workspace/setActive": async function({ sId, wId, credentialId }: { sId: string, wId: number, credentialId: number }): Promise<void> {
    if (wId === LocalWorkspace.id) {
      state(sId).cloudClient = null;
      return;
    }

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
  },
  'workspace/importDirectory': async function({ dir, parentId, sId, preserveRoot }: { dir: string, parentId: number, sId: string, preserveRoot: boolean }): Promise<IObjectImportStats> {
    if (typeof dir !== 'string' || dir.length === 0) {
      throw new Error('workspace/importDirectory called with no directory path')
    }

    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      throw new Error('workspace/importDirectory called with non directory path');
    }

    const client = state(sId).cloudClient;
    const importer = new QueryImporter(client);

    const stats = await importer.importDirectory(dir, parentId, preserveRoot);

    return stats;
  },
  'workspace/importConnectionsDirectory': async function({ dir, parentId, sId, preserveRoot }: { dir: string, parentId: number, sId: string, preserveRoot: boolean }): Promise<IObjectImportStats> {
    if (typeof dir !== 'string' || dir.length === 0) {
      throw new Error('workspace/importConnectionsDirectory called with no directory path')
    }

    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      throw new Error('workspace/importConnectionsDirectory called with non directory path');
    }

    const client = state(sId).cloudClient;
    const importer = new ConnectionImporter(client);

    const stats = await importer.importDirectory(dir, parentId, preserveRoot);

    return stats;
  },
  'workspace/importConnections': async function({ sId, paths, parentId }: { sId: string, paths: string[], parentId: number }): Promise<IObjectImportStats> {
    const client = state(sId).cloudClient;
    const importer = new ConnectionImporter(client);

    const stats = await importer.importSelections(paths, parentId);

    return stats;
  }
}
