import { CloudConnectionModule } from "@/store/modules/data/connection/CloudConnectionModule";
import { LocalConnectionModule } from "@/store/modules/data/connection/LocalConnectionModule";
import { CloudConnectionFolderModule } from "@/store/modules/data/connection_folder/CloudConnectionFolderModule";
import { LocalConnectionFolderModule } from "@/store/modules/data/connection_folder/LocalConnectionFolderModule";
import { CloudQueryModule } from "@/store/modules/data/query/CloudQueryModule";
import { LocalQueryModule } from "@/store/modules/data/query/LocalQueryModule";
import { CloudQueryFolderModule } from "@/store/modules/data/query_folder/CloudQueryFolderModule";
import { LocalQueryFolderModule } from "@/store/modules/data/query_folder/LocalQueryFolderModule";


export const DataModules = [
  {
    path: 'data/queries',
    local: LocalQueryModule,
    cloud: CloudQueryModule,
  },
  {
    path: 'data/connections',
    cloud: CloudConnectionModule,
    local: LocalConnectionModule
  },
  {
    path: 'data/queryFolders',
    cloud: CloudQueryFolderModule,
    local: LocalQueryFolderModule
  },
  {
    path: 'data/connectionFolders',
    cloud: CloudConnectionFolderModule,
    local: LocalConnectionFolderModule
  }

]