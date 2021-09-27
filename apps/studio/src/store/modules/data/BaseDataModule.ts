import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import ISavedQuery from "@/common/interfaces/ISavedQuery";


export interface DataModuleState {
  queryFolders: IQueryFolder[]
  savedQueries: ISavedQuery[]
}