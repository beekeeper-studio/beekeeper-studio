import { LocalConnectionFolderModule } from "@/store/modules/data/connection_folder/LocalConnectionFolderModule";
import { LocalQueryModule } from "@/store/modules/data/query/LocalQueryModule";
import { LocalQueryFolderModule } from "@/store/modules/data/query_folder/LocalQueryFolderModule";
import { LocalUsedQueryModule } from "@/store/modules/data/used_query/LocalUsedQueryModule";
import { UtilConnectionModule } from "./modules/data/connection/UtilityConnectionModule";


export const DataModules = [
  {
    path: 'data/queries',
    local: LocalQueryModule,
    cloud: null,
  },
  {
    path: 'data/connections',
    cloud: null,
    local: UtilConnectionModule
  },
  {
    path: 'data/queryFolders',
    cloud: null,
    local: LocalQueryFolderModule
  },
  {
    path: 'data/connectionFolders',
    cloud: null,
    local: LocalConnectionFolderModule
  },
  {
    path: 'data/usedQueries',
    cloud: null,
    local: LocalUsedQueryModule,
  }

]
