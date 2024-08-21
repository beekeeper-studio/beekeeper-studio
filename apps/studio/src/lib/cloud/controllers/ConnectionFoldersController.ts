import { IConnectionFolder } from "@/common/interfaces/IQueryFolder";
import { GenericController } from "@/lib/cloud/controllers/GenericController";



export class ConnectionFoldersController extends GenericController<IConnectionFolder> {
  name = "connectionFolder"
  plural =  "connectionFolders"
  path = '/connection_folders'
}