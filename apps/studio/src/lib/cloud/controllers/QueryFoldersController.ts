import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { GenericController } from "@/lib/cloud/controllers/GenericController";




export class QueryFoldersController extends GenericController<IQueryFolder> {
  name = 'queryFolder'
  plural = 'queryFolders'
  path = '/query_folders'
}