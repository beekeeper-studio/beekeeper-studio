import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { GenericController } from "@/lib/cloud/controllers/GenericController";
import { AccessGrantsController } from "@/lib/cloud/controllers/AccessGrantsController";




export class QueryFoldersController extends GenericController<IQueryFolder> {
  name = 'queryFolder' as const
  plural = 'queryFolders'
  path = '/query_folders'

  accessGrantsOf(queryFolderId: number) {
    return new AccessGrantsController(this.axios, this.path, queryFolderId);
  }
}
