import { UtilConnectionFolderModule } from "@/store/modules/data/connection_folder/UtilityConnectionFolderModule";
import { UtilQueryFolderModule } from "@/store/modules/data/query_folder/UtilityQueryFolderModule";
import { CloudConnectionModule } from "./modules/data/connection/CloudConnectionModule";
import { UtilConnectionModule } from "./modules/data/connection/UtilityConnectionModule";
import { CloudConnectionFolderModule } from "./modules/data/connection_folder/CloudConnectionFolderModule";
import { CloudQueryModule } from "./modules/data/query/CloudQueryModule";
import { UtilQueryModule } from "./modules/data/query/UtilityQueryModule";
import { CloudQueryAuditModule } from "./modules/data/query_audit/CloudQueryAuditModule";
import { UtilQueryAuditModule } from "./modules/data/query_audit/UtilityQueryAuditModule";
import { CloudQueryFolderModule } from "./modules/data/query_folder/CloudQueryFolderModule";
import { UtilUsedConnectionModule } from "./modules/data/used_connection/UtilityUsedConnectionModule";
import { CloudUsedQueryModule } from "./modules/data/used_query/CloudUsedQueryModule";
import { UtilUsedQueryModule } from "./modules/data/used_query/UtilityUsedQueryModule";
import { CloudMembershipModule } from "./modules/data/membership/CloudMembershipModule";
import { UtilMembershipModule } from "./modules/data/membership/UtilityMembershipModule";

export type ShareableModule =
  | "data/queries"
  | "data/connections"
  | "data/queryFolders"
  | "data/connectionFolders";

export const DataModules = [
  {
    path: 'data/queries',
    local: UtilQueryModule,
    cloud: CloudQueryModule,
  },
  {
    path: 'data/queryAudits',
    local: UtilQueryAuditModule,
    cloud: CloudQueryAuditModule,
  },
  {
    path: 'data/connections',
    local: UtilConnectionModule,
    cloud: CloudConnectionModule,
  },
  {
    path: 'data/queryFolders',
    local: UtilQueryFolderModule,
    cloud: CloudQueryFolderModule,
  },
  {
    path: 'data/connectionFolders',
    local: UtilConnectionFolderModule,
    cloud: CloudConnectionFolderModule,
  },
  {
    path: 'data/usedQueries',
    local: UtilUsedQueryModule,
    cloud: CloudUsedQueryModule,
  },
  {
    path: 'data/usedconnections',
    cloud: UtilUsedConnectionModule,
    local: UtilUsedConnectionModule
  },
  {
    path: 'data/memberships',
    local: UtilMembershipModule,
    cloud: CloudMembershipModule,
  },
]
