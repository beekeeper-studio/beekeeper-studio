import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { GenericController } from "@/lib/cloud/controllers/GenericController";
import { AccessGrantsController } from "@/lib/cloud/controllers/AccessGrantsController";



export class ConnectionFoldersController extends GenericController<IConnectionFolder> {
  name = "connectionFolder" as const
  plural =  "connectionFolders"
  path = '/connection_folders'

  accessGrantsOf(connectionFolderId: number) {
    return new AccessGrantsController(this.axios, this.path, connectionFolderId);
  }
}
